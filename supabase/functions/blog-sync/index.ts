// Supabase Edge Function: blog-sync
// KiuQ is the master controller. This function pushes published blog posts from
// public.cms_blog_posts out to connected e-commerce framework sites — mirroring
// product-sync. Each site's receiver writes /data/blogs.json, which the site's
// existing blog template reads (local mode).
//
// Auth: caller must pass a logged-in admin-class user's Bearer token.
//
// Actions:
//   { action: "sync", postIds: "all"|[...], websiteIds: "all"|[...] }
//   { action: "test-connection", websiteId }
//
// Deploy: supabase functions deploy blog-sync

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_ROLES = ["admin", "owner", "head", "supervisor"];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// ── canonical blog payload the receiver localizes + stores ─────────────────
// deno-lint-ignore no-explicit-any
const buildPost = (b: any) => ({
  id: b.id,
  target_website_id: b.target_website_id,
  slug: b.slug || b.id,
  title: b.title ?? "",
  excerpt: b.excerpt ?? "",
  content: b.content ?? "",
  category: b.category ?? "",
  author: "",
  featuredImage: b.featured_image_url || null,
  featuredImageAlt: "",
  publishedAt: b.published_at ?? b.updated_at ?? b.created_at ?? null,
  seoTitle: b.seo_title || null,
  seoDescription: b.seo_description || null,
  keywords: null,
  tags: b.tags || [],
  updatedAt: b.updated_at ?? null,
});

// deno-lint-ignore no-explicit-any
const postBatch = async (site: any, posts: any[], timeoutMs: number, replace: boolean) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(site.sync_endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "X-Sync-Token": site.secret_token },
      body: JSON.stringify({ action: "sync-blogs", posts, replace }),
    });
    const text = await res.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
    // deno-lint-ignore no-explicit-any
    return { ok: res.ok, status: res.status, body } as { ok: boolean; status: number; body: any; error?: string };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });

  // ── verify admin ──
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);
  const { data: { user }, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
  if (userErr || !user) return json({ error: "Invalid session." }, 401);
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = String(profile?.role ?? "").toLowerCase();
  if (!ADMIN_ROLES.includes(role)) return json({ error: "Admin access required." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

  // ── test-connection (reuse the receiver's ping) ──
  if (body.action === "test-connection") {
    if (!body.websiteId) return json({ error: "websiteId required." }, 400);
    const { data: site } = await admin.from("connected_websites").select("*").eq("id", body.websiteId).maybeSingle();
    if (!site) return json({ error: "Website not found." }, 404);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(site.sync_endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "X-Sync-Token": site.secret_token },
        body: JSON.stringify({ action: "ping" }),
      });
      const text = await res.text();
      let parsed: unknown = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = { raw: text.slice(0, 300) }; }
      return json({ ok: res.ok, status: res.status, response: parsed });
    } catch (e) {
      return json({ ok: false, status: 0, error: e instanceof Error ? e.message : String(e) });
    } finally { clearTimeout(timer); }
  }

  // ── resolve target sites ──
  const websiteIds = body.websiteIds;
  let wq = admin.from("connected_websites").select("*").eq("active", true);
  if (Array.isArray(websiteIds)) wq = wq.in("id", websiteIds);
  const { data: sites, error: sitesErr } = await wq;
  if (sitesErr) return json({ error: sitesErr.message }, 500);
  if (!sites || sites.length === 0) return json({ error: "No active websites to sync." }, 400);

  // ── load published posts ──
  let pq = admin
    .from("blog_posts")
    .select("id,title,slug,excerpt,category,content,featured_image_url,seo_title,seo_description,status,tags,published_at,created_at,updated_at,target_website_id")
    .eq("status", "Published")
    .order("published_at", { ascending: false });

  if (Array.isArray(websiteIds)) {
    pq = pq.in("target_website_id", websiteIds);
  }

  // A "full" sync (postIds = all / omitted) is authoritative — the connected
  // sites mirror exactly this set, so archived/removed posts disappear there too.
  const isFullSync = !Array.isArray(body.postIds);
  if (Array.isArray(body.postIds)) pq = pq.in("id", body.postIds as string[]);
  const { data: posts, error: postErr } = await pq;
  if (postErr) return json({ error: postErr.message }, 500);
  const safePosts = posts ?? [];
  // Allow an empty full sync (it clears the blog on every site). Only a targeted
  // sync with nothing to send is an error.
  if (safePosts.length === 0 && !isFullSync) return json({ error: "No published blog posts to sync." }, 400);

  const payload = safePosts.map(buildPost);
  const timeoutMs = 60000;

  let successCount = 0, failedCount = 0;
  const results: Array<{ website: string; ok: boolean; count?: number; error?: string }> = [];

  // Send the whole authoritative set in one request so "replace" is atomic.
  for (const site of sites) {
    const sitePayload = payload.filter((p: any) => p.target_website_id === site.id);
    const res = await postBatch(site, sitePayload, timeoutMs, isFullSync);
    if (res.ok && res.body) {
      successCount++;
      results.push({ website: site.name, ok: true, count: sitePayload.length });
    } else {
      failedCount++;
      results.push({ website: site.name, ok: false, error: (res.error ?? `Receiver HTTP ${res.status}`) + (res.body?.error ? `: ${res.body.error}` : "") });
    }
  }

  return json({ ok: failedCount === 0, success: successCount, failed: failedCount, posts: payload.length, results });
});
