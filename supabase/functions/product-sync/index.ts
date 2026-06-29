// Supabase Edge Function: product-sync
// KiuQ is the master controller. This function pushes products from the master
// catalog (public.cms_products) out to connected e-commerce framework sites.
//
// It runs server-side with the service role key so it can read per-site secret
// tokens, apply per-website overrides, skip unchanged products (by hash), batch
// with limited concurrency, POST to each site's receiver, and write logs/state.
//
// Auth: caller must pass a logged-in admin-class user's Bearer token. We verify
// the user and confirm their profiles.role is admin/owner/head/supervisor.
//
// Actions:
//   { action: "sync", productIds: "all"|[...], websiteIds: "all"|[...],
//     syncType: "full"|"price"|"images"|"descriptions", force?: boolean }
//   { action: "retry-failed", websiteId?, productId? }
//   { action: "test-connection", websiteId }
//
// Deploy: supabase functions deploy product-sync

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

type SyncType = "full" | "price" | "images" | "descriptions";

// ── stable hash for change detection ──────────────────────────────────────
const stableStringify = (v: unknown): string => {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  const obj = v as Record<string, unknown>;
  return `{${Object.keys(obj).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
};
const sha256 = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

// ── build canonical payload from a team_folders row + its images + override ─
// Master source = the Image/Product Content Dashboard (public.team_folders +
// public.team_images). Featured image = the row flagged is_feature_image;
// gallery = all images ordered by sort_order.
// deno-lint-ignore no-explicit-any
const buildPayload = (f: any, images: any[], ov: any, force: boolean) => {
  const pick = (field: string, master: unknown) =>
    !force && ov && ov[field] != null && ov[field] !== "" ? ov[field] : master;
  const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const gallery: string[] = sorted.map((i) => i.url).filter(Boolean);
  const feature = sorted.find((i) => i.is_feature_image)?.url ?? gallery[0] ?? null;
  return {
    id: f.id,
    slug: f.product_slug || f.id,
    sku: f.sku ?? f.matched_product_sku ?? null,
    name: pick("title", f.name),
    category: f.product_category ?? null,
    productType: f.product_type ?? null,
    shortDescription: pick("short_description", f.short_description),
    fullDescription: pick("full_description", f.description),
    price: pick("price", f.product_price),
    salePrice: ov?.sale_price ?? null,
    gtin: f.product_gtin ?? null,
    stockStatus: null,
    status: pick("status", "published"),
    featuredImage: pick("featured_image", feature),
    galleryImages: gallery,
    specs: [],
    features: [],
    relatedProducts: [],
    attachments: [],
    faq: [],
    buttonUrl: pick("button_url", f.button_url),
    seoTitle: null,
    seoDescription: null,
    updatedAt: f.updated_at,
  };
};

// Narrow a full payload to a single category; the receiver merges partials.
// deno-lint-ignore no-explicit-any
const narrowPayload = (full: any, type: SyncType) => {
  if (type === "full") return full;
  const base = { id: full.id, slug: full.slug, sku: full.sku };
  if (type === "price") return { ...base, price: full.price, salePrice: full.salePrice, stockStatus: full.stockStatus };
  if (type === "images") return { ...base, featuredImage: full.featuredImage, galleryImages: full.galleryImages };
  if (type === "descriptions")
    return { ...base, name: full.name, shortDescription: full.shortDescription, fullDescription: full.fullDescription };
  return full;
};

// ── post a batch to one website's receiver ────────────────────────────────
// deno-lint-ignore no-explicit-any
const postBatch = async (site: any, type: SyncType, force: boolean, products: any[], timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(site.sync_endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "X-Sync-Token": site.secret_token },
      body: JSON.stringify({ action: "sync", type, force, products }),
    });
    const text = await res.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
    return { ok: res.ok, status: res.status, body } as { ok: boolean; status: number; body: any; error?: string };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
};

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length || 1)).fill(0).map(async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); }
  });
  await Promise.all(workers);
  return out;
}
const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

  let body: Record<string, any>;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }

  const { data: settings } = await admin.from("product_sync_settings").select("*").eq("id", 1).maybeSingle();
  const batchSize = settings?.batch_size ?? 5;
  const concurrency = settings?.concurrency ?? 3;
  const timeoutMs = (settings?.request_timeout_s ?? 60) * 1000;

  // ── test-connection ──
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

  // ── resolve websites ──
  let websiteIds = body.websiteIds;
  if (body.action === "retry-failed" && body.websiteId) websiteIds = [body.websiteId];
  let wq = admin.from("connected_websites").select("*").eq("active", true);
  if (Array.isArray(websiteIds)) wq = wq.in("id", websiteIds);
  const { data: sites, error: sitesErr } = await wq;
  if (sitesErr) return json({ error: sitesErr.message }, 500);
  if (!sites || sites.length === 0) return json({ error: "No active websites to sync." }, 400);

  const syncType: SyncType = body.syncType ?? "full";

  // ── retry-failed → derive product set ──
  let productIds = body.productIds;
  if (body.action === "retry-failed") {
    let fq = admin.from("product_sync_state").select("product_id,website_id").eq("status", "failed");
    if (body.websiteId) fq = fq.eq("website_id", body.websiteId);
    if (body.productId) fq = fq.eq("product_id", body.productId);
    const { data: failed } = await fq;
    productIds = [...new Set((failed ?? []).map((r) => r.product_id))];
    if (productIds.length === 0) return json({ ok: true, message: "Nothing to retry.", success: 0, failed: 0, results: [] });
  }

  // ── load products from the master catalog (Image Dashboard = team_folders) ──
  let pq = admin
    .from("team_folders")
    .select(
      "id,name,sku,matched_product_sku,product_price,product_gtin,product_category,short_description,description,button_url,product_slug,product_type,updated_at,deleted_at"
    )
    .is("deleted_at", null);
  if (Array.isArray(productIds)) pq = pq.in("id", productIds);
  const { data: products, error: prodErr } = await pq;
  if (prodErr) return json({ error: prodErr.message }, 500);
  if (!products || products.length === 0) return json({ error: "No products found to sync." }, 400);

  const force = Boolean(body.force);
  const siteIdList = sites.map((s) => s.id);
  const prodIdList = products.map((p) => p.id);

  // Images for these folders, grouped by folder_id.
  const { data: imageRows } = await admin
    .from("team_images")
    .select("id,url,folder_id,is_feature_image,sort_order")
    .in("folder_id", prodIdList);
  const imgMap = new Map<string, any[]>();
  for (const im of imageRows ?? []) {
    const arr = imgMap.get(im.folder_id) ?? [];
    arr.push(im);
    imgMap.set(im.folder_id, arr);
  }

  const [{ data: overrides }, { data: states }] = await Promise.all([
    admin.from("product_website_overrides").select("*").in("website_id", siteIdList).in("product_id", prodIdList),
    admin.from("product_sync_state").select("*").in("website_id", siteIdList).in("product_id", prodIdList),
  ]);
  const key = (w: string, p: string) => `${w}:${p}`;
  const ovMap = new Map((overrides ?? []).map((o) => [key(o.website_id, o.product_id), o]));
  const stMap = new Map((states ?? []).map((s) => [key(s.website_id, s.product_id), s]));

  let successCount = 0, failedCount = 0, skippedCount = 0;
  const logRows: any[] = [];
  const stateUpserts: any[] = [];
  const results: any[] = [];

  await pool(sites, concurrency, async (site) => {
    const toSend: { product: any; payload: any; hash: string }[] = [];
    for (const product of products) {
      const ov = ovMap.get(key(site.id, product.id));
      if (ov && ov.enabled === false) { skippedCount++; continue; }
      const fullPayload = buildPayload(product, imgMap.get(product.id) ?? [], ov, force);
      const payload = narrowPayload(fullPayload, syncType);
      const hash = await sha256(stableStringify(fullPayload) + `|${syncType}`);
      const prev = stMap.get(key(site.id, product.id));
      if (!force && syncType === "full" && prev?.status === "success" && prev.last_synced_hash === hash) { skippedCount++; continue; }
      toSend.push({ product, payload, hash });
    }
    if (toSend.length === 0) return;

    let siteHadFailure = false, siteHadSuccess = false;
    for (const group of chunk(toSend, batchSize)) {
      const res = await postBatch(site, syncType, force, group.map((g) => g.payload), timeoutMs);
      const perProduct: Record<string, any> = {};
      if (res.ok && res.body && Array.isArray(res.body.results)) {
        for (const r of res.body.results) perProduct[r.slug ?? r.id] = r;
      }
      for (const g of group) {
        const pr = perProduct[g.payload.slug] ?? perProduct[g.payload.id];
        const ok = res.ok && (pr ? pr.ok !== false : true);
        const errMsg = !res.ok
          ? (res.error ?? `Receiver HTTP ${res.status}`) + (res.body?.error ? `: ${res.body.error}` : "")
          : pr && pr.ok === false ? (pr.error ?? "Receiver rejected product") : null;
        const prev = stMap.get(key(site.id, g.product.id));
        if (ok) { successCount++; siteHadSuccess = true; } else { failedCount++; siteHadFailure = true; }
        const now = new Date().toISOString();
        logRows.push({
          website_id: site.id, product_id: g.product.id, website_name: site.name,
          product_name: g.product.name, product_slug: g.product.product_slug,
          sync_type: syncType, status: ok ? "success" : "failed", error: errMsg,
          retry_count: prev?.retry_count ?? 0, finished_at: now,
        });
        stateUpserts.push({
          website_id: site.id, product_id: g.product.id, status: ok ? "success" : "failed",
          last_synced_at: ok ? now : prev?.last_synced_at ?? null,
          last_synced_hash: ok ? g.hash : prev?.last_synced_hash ?? null,
          last_error: errMsg, retry_count: ok ? prev?.retry_count ?? 0 : (prev?.retry_count ?? 0) + 1,
        });
        results.push({ website: site.name, product: g.product.name, ok, error: errMsg, images: pr?.images ?? undefined });
      }
    }
    await admin.from("connected_websites").update({
      last_sync_at: new Date().toISOString(),
      last_status: siteHadFailure ? (siteHadSuccess ? "partial" : "failed") : "success",
    }).eq("id", site.id);
  });

  if (logRows.length) await admin.from("product_sync_logs").insert(logRows);
  if (stateUpserts.length) await admin.from("product_sync_state").upsert(stateUpserts, { onConflict: "website_id,product_id" });

  return json({ ok: failedCount === 0, success: successCount, failed: failedCount, skipped: skippedCount, results });
});
