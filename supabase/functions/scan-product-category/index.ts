// Supabase Edge Function: scan-product-category
// Scans a WooCommerce product category (all pages) + product detail pages and
// returns structured product data with per-field extraction sources, warnings,
// and a scan summary — for the Image/Product Content Dashboard auto-import.
//
// Dependency-free (JSON-LD + balanced-tag regex) so it boots reliably on the
// Supabase Edge runtime.
//
// Body: { sourceUrl, websiteType?, scanMode?, maxProducts?, maxPages? }
// Auth: requires a logged-in user (Bearer token).
// Safety: fetches only public http(s) pages; sanitizes every description
//         (removes scripts/styles/buttons/forms/iframes + inline handlers).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const UA = "Mozilla/5.0 (compatible; KiuQ-ProductImporter/1.0; +https://kiuq.com)";
const FETCH_TIMEOUT_MS = 15000;
const DEFAULT_MAX_PRODUCTS = 120;
const DEFAULT_MAX_PAGES = 20;
const CONCURRENCY = 5;
const SHORT_FULL_MIN = 40; // chars below which a "full description" is invalid.
const REVIEW_FULL_MIN = 120; // valid but short descriptions are review-only.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

interface FieldSources {
  title: string;
  sku: string;
  short: string;
  full: string;
  title_source?: string;
  sku_source?: string;
  short_description_source?: string;
  full_description_source?: string;
  full_description_character_count?: number;
  gtin_source?: string;
  price_source?: string;
  category_source?: string;
  extraction_warnings?: string[];
}
type ProductType = "equipment" | "attachment" | "unknown";
interface ScannedProduct {
  productId: string;
  sourceSlug: string;
  productType: ProductType;
  title: string;
  url: string;
  sku: string | null;
  gtin: string | null;
  price: string | null;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  metaDescription: string | null;
  sources: FieldSources;
  warnings: string[];
  shortLength: number;
  fullLength: number;
}

/* ── utils ─────────────────────────────────────────────────────────────── */
const collapse = (s: string) => s.replace(/[ \t]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
const absUrl = (href: string, base: string) => { try { return new URL(href, base).toString(); } catch { return null; } };
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}
const stripTags = (html: string) => collapse(decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/[ \t]+/g, " "));
const slugify = (raw: string): string =>
  (raw || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\b1\.8\b/g, "1-8")
    .replace(/\b2\.0\b/g, "2-0")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
function productSlugFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const productIndex = parts.findIndex((part) => part === "product");
    return slugify(productIndex >= 0 && parts[productIndex + 1] ? parts[productIndex + 1] : parts[parts.length - 1] || "");
  } catch {
    return "";
  }
}
function inferProductType(...parts: Array<string | null | undefined>): ProductType {
  const text = slugify(parts.filter(Boolean).join(" "));
  if (!text) return "unknown";
  const hasAny = (tokens: string[]) => tokens.some((token) => {
    const normalized = slugify(token);
    return text === normalized || text.startsWith(`${normalized}-`) || text.endsWith(`-${normalized}`) || text.includes(`-${normalized}-`);
  });

  if (
    hasAny([
      "attachment",
      "attachments",
      "bucket",
      "buckets",
      "auger",
      "augers",
      "grapple",
      "grapples",
      "breaker",
      "breakers",
      "rake",
      "rakes",
      "blade",
      "blades",
      "fork",
      "forks",
      "thumb",
      "thumbs",
    ]) ||
    text.includes("trencher-attachment") ||
    text.includes("trenchers-attachment")
  ) {
    return "attachment";
  }

  if (
    hasAny([
      "mini-excavator",
      "mini-skid-steer",
      "wheel-loader",
      "dumper",
      "stone-crusher",
      "backhoe-loader",
      "towable-excavator",
      "excavator",
      "loader",
      "trencher",
      "typhon-terror",
      "typhon-kuvu",
    ])
  ) {
    return "equipment";
  }

  return "unknown";
}

const RICH_ALLOWED = new Set(["p", "br", "ul", "ol", "li", "strong", "b", "em", "i", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody", "tr", "td", "th"]);
const METADATA_LABEL_RE = /\b(gtin|gtin-?8|gtin-?12|gtin-?13|gtin-?14|sku|upc|ean|isbn|mpn|price|category|categories|tag|tags|brand|availability|shipping|stock|weight|dimensions?)\b/i;
const METADATA_ONLY_RE = /^\s*(gtin|gtin-?8|gtin-?12|gtin-?13|gtin-?14|sku|upc|ean|isbn|mpn|price|category|categories|tag|tags|brand|availability|shipping|stock)\s*:?\s*[-#A-Z0-9., $/]+\.?\s*$/i;
function isMetadataOnlyFragment(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const text = collapse(stripTags(raw));
  if (!text) return false;
  if (METADATA_ONLY_RE.test(text)) return true;
  const lines = text.split(/\n|\. /).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return false;
  const metadataLines = lines.filter((line) => METADATA_ONLY_RE.test(line) || ((line.match(/[a-z0-9]+/gi) || []).length <= 8 && METADATA_LABEL_RE.test(line)));
  return metadataLines.length / lines.length >= 0.65;
}
/** Keep safe structural tags, strip everything else (incl. attributes/links/buttons). */
function sanitizeRich(html: string): string {
  let h = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<section[^>]*class=["'][^"']*(related|upsell|newsletter|reviews|breadcrumb)[^"']*["'][\s\S]*?<\/section>/gi, "")
    .replace(/<div[^>]*class=["'][^"']*(related|upsell|newsletter|reviews|breadcrumb|woocommerce-Reviews|product_meta|details-product-attribute|product-details-module__title)[^"']*["'][\s\S]*?<\/div>/gi, "")
    .replace(/<p[^>]*class=["'][^"']*(price|stock|sku_wrapper|posted_in|tagged_as)[^"']*["'][\s\S]*?<\/p>/gi, "")
    .replace(/<span[^>]*class=["'][^"']*(sku|sku_wrapper|gtin|price|posted_in|tagged_as)[^"']*["'][\s\S]*?<\/span>/gi, "")
    .replace(/<(script|style|iframe|noscript|form|button|input|select|textarea|svg|nav|footer|header|aside)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|style|iframe|noscript|form|button|input|svg|img|source|link|meta)[^>]*\/?>/gi, "");
  h = h.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (_, tag: string) => {
    const t = tag.toLowerCase();
    return RICH_ALLOWED.has(t) ? (_.startsWith("</") ? `</${t}>` : `<${t}>`) : " ";
  });
  h = h
    .replace(/<tr>([\s\S]*?)<\/tr>/gi, (match, inner: string) => isMetadataOnlyFragment(inner) ? " " : match)
    .replace(/<(p|li|h[2-6]|td|th)>([\s\S]*?)<\/\1>/gi, (match, _tag: string, inner: string) => isMetadataOnlyFragment(inner) ? " " : match);
  return collapse(decodeEntities(h).replace(/[ \t]+/g, " "));
}

const normalizeMetadataValue = (value: string | null | undefined) =>
  value ? collapse(stripTags(decodeEntities(value))).replace(/^(GTIN|UPC|EAN|ISBN|MPN|SKU|Price)\s*:?\s*/i, "").trim() : null;

const firstCleanMatch = (html: string, re: RegExp): string | null => normalizeMetadataValue(firstMatch(html, re));

const wordCount = (text: string) => (text.match(/[a-z0-9]+/gi) || []).length;

function isMetadataLikeText(raw: string | null | undefined): boolean {
  if (!raw) return false;
  if (isMetadataOnlyFragment(raw)) return true;
  const text = collapse(stripTags(raw));
  if (!text) return false;
  if (METADATA_ONLY_RE.test(text)) return true;
  const lines = text.split(/\n|\. /).map((line) => line.trim()).filter(Boolean);
  const metadataLines = lines.filter((line) => METADATA_ONLY_RE.test(line) || (wordCount(line) <= 8 && METADATA_LABEL_RE.test(line)));
  if (lines.length > 0 && metadataLines.length / lines.length >= 0.65) return true;
  const compact = slugify(text);
  if (/^(add-to-cart|view-cart|home|shop|product|products|sale|in-stock|out-of-stock|free-shipping)/.test(compact)) return true;
  if (wordCount(text) <= 8 && METADATA_LABEL_RE.test(text)) return true;
  return false;
}

function validateDescriptionCandidate(
  raw: string | null,
  source: string,
  field: "short" | "full",
): { value: string | null; warnings: string[]; source: string } {
  const warnings: string[] = [];
  if (!raw) return { value: null, warnings, source };
  if (isMetadataOnlyFragment(raw)) {
    warnings.push(field === "short" ? "invalid_short_description" : "invalid_full_description");
    warnings.push("description_metadata_only");
    return { value: null, warnings, source };
  }
  const cleaned = field === "short" ? stripTags(sanitizeRich(raw)) : sanitizeRich(raw);
  const text = stripTags(cleaned);
  if (!text) return { value: null, warnings, source };
  if (isMetadataLikeText(text)) {
    warnings.push(field === "short" ? "invalid_short_description" : "invalid_full_description");
    warnings.push("description_metadata_only");
    return { value: null, warnings, source };
  }
  if (field === "full") {
    if (text.length < SHORT_FULL_MIN) {
      warnings.push("invalid_full_description");
      return { value: null, warnings, source };
    }
    if (text.length < REVIEW_FULL_MIN) warnings.push("full_description_short_review");
  } else if (text.length < 12) {
    warnings.push("short_description_very_short");
  }
  return { value: cleaned, warnings, source };
}

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, signal: ctrl.signal });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") ?? "").includes("html")) return null;
    return await res.text();
  } catch { return null; } finally { clearTimeout(timer); }
}
async function pooled<I, O>(items: I[], limit: number, worker: (i: I) => Promise<O>): Promise<O[]> {
  const out: O[] = [];
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) { const i = cursor++; out[i] = await worker(items[i]); }
  }));
  return out;
}

/** Extract a full element block by balancing open/close tags from a start index. */
function balancedBlock(html: string, openTagRe: RegExp, tagName: string): string | null {
  const open = openTagRe.exec(html);
  if (!open) return null;
  let depth = 1;
  const tag = tagName.toLowerCase();
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, "gi");
  re.lastIndex = open.index + open[0].length;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[0][1] === "/") { depth--; if (depth === 0) return html.slice(open.index + open[0].length, m.index); }
    else depth++;
  }
  return html.slice(open.index + open[0].length); // unbalanced; take the rest
}

/* ── JSON-LD ───────────────────────────────────────────────────────────── */
function extractJsonLd(html: string): { title?: string; sku?: string; gtin?: string; price?: string; description?: string; image?: string } {
  const out: { title?: string; sku?: string; gtin?: string; price?: string; description?: string; image?: string } = {};
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let parsed: unknown;
    try { parsed = JSON.parse(m[1].trim()); } catch { continue; }
    const graph: unknown[] = Array.isArray(parsed) ? parsed : (parsed as { "@graph"?: unknown[] })?.["@graph"] ?? [parsed];
    for (const entry of graph) {
      const e = entry as Record<string, unknown>;
      const type = e?.["@type"];
      if (!(type === "Product" || (Array.isArray(type) && type.includes("Product")))) continue;
      if (typeof e.name === "string") out.title = collapse(decodeEntities(e.name));
      if (typeof e.sku === "string" || typeof e.sku === "number") out.sku = String(e.sku).trim();
      for (const key of ["gtin", "gtin8", "gtin12", "gtin13", "gtin14", "mpn"]) {
        const value = e[key];
        if ((typeof value === "string" || typeof value === "number") && !out.gtin) out.gtin = String(value).trim();
      }
      if (typeof e.description === "string") out.description = e.description;
      const offers = e.offers;
      const firstOffer = Array.isArray(offers) ? offers[0] : offers;
      if (firstOffer && typeof firstOffer === "object") {
        const offer = firstOffer as Record<string, unknown>;
        if (typeof offer.price === "string" || typeof offer.price === "number") out.price = String(offer.price).trim();
      }
      const img = e.image;
      if (typeof img === "string") out.image = img;
      else if (Array.isArray(img) && img.length) out.image = typeof img[0] === "string" ? img[0] as string : (img[0] as { url?: string })?.url;
      else if (img && typeof (img as { url?: string }).url === "string") out.image = (img as { url: string }).url;
      return out;
    }
  }
  return out;
}

const firstMatch = (html: string, re: RegExp): string | null => { const m = re.exec(html); return m ? m[1] : null; };
const textMatch = (html: string, re: RegExp): string | null => {
  const m = re.exec(html);
  return m ? collapse(stripTags(m[1])) : null;
};

/* ── detail extraction ─────────────────────────────────────────────────── */
function scanProductFromHtml(html: string, url: string): ScannedProduct | null {
  const ld = extractJsonLd(html);
  const sources: FieldSources = { title: "", sku: "", short: "", full: "" };
  const warnings: string[] = [];

  // TITLE: WooCommerce DOM first, JSON-LD last.
  let title = textMatch(html, /<h1[^>]*class=["'][^"']*product_title[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i);
  if (title) sources.title = ".product_title";
  if (!title) { title = textMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i); if (title) sources.title = "h1"; }
  if (!title && ld.title) { title = collapse(decodeEntities(ld.title)); sources.title = "json-ld"; }
  if (!title) return null;

  // SKU: visible WooCommerce fields, product meta, JSON-LD, then local regex.
  let sku: string | null = textMatch(html, /<span[^>]*class=["'][^"']*\bsku\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
  if (sku) sources.sku = ".sku";
  if (!sku) {
    sku = textMatch(html, /<div[^>]*class=["'][^"']*product_meta[^"']*["'][\s\S]*?(?:SKU|Sku|sku)[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
    if (sku) sources.sku = "product_meta";
  }
  if (!sku && ld.sku) { sku = String(ld.sku).trim(); sources.sku = "json-ld"; }
  if (!sku) {
    const s = /SKU\s*:?\s*([A-Z0-9][A-Z0-9._-]{1,80})/i.exec(stripTags(html));
    if (s) { sku = s[1].trim(); sources.sku = "sku-regex"; }
  }
  if (sku && /^n\/?a$/i.test(sku.trim())) { sku = null; }
  if (!sku) warnings.push("missing_sku");

  // Metadata fields — extracted separately and never used as descriptions.
  let gtin: string | null =
    firstCleanMatch(html, /(?:GTIN|UPC|EAN|ISBN|MPN)\s*:?\s*<\/?[^>]*>\s*([0-9A-Z._-]{4,80})/i) ??
    firstCleanMatch(html, /<(?:span|div|p)[^>]*class=["'][^"']*(?:gtin|global_unique_id|product_gtin|wpm_gtin)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|div|p)>/i) ??
    normalizeMetadataValue(ld.gtin);
  if (!gtin) {
    const g = /\b(?:GTIN|UPC|EAN|ISBN|MPN)\s*:?\s*([0-9A-Z._-]{4,80})/i.exec(stripTags(html));
    if (g) gtin = g[1].trim();
  }
  if (gtin) sources.gtin_source = ld.gtin && gtin === normalizeMetadataValue(ld.gtin) ? "json-ld" : "product-meta";

  let price: string | null =
    firstCleanMatch(html, /<p[^>]*class=["'][^"']*\bprice\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) ??
    firstCleanMatch(html, /<span[^>]*class=["'][^"']*(?:woocommerce-Price-amount|price)[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) ??
    normalizeMetadataValue(ld.price);
  if (price) sources.price_source = ld.price && price === normalizeMetadataValue(ld.price) ? "json-ld" : "woocommerce-price";

  const category = firstMatch(html, /class=["'][^"']*posted_in[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
  const cleanCategory = category ? collapse(stripTags(category)) : null;
  if (cleanCategory) sources.category_source = "posted_in";

  // SHORT DESCRIPTION — product summary near the title.
  let short: string | null = null;
  const shortBlock =
    balancedBlock(html, /<div[^>]*class=["'][^"']*woocommerce-product-details__short-description[^"']*["'][^>]*>/i, "div");
  if (shortBlock) {
    const result = validateDescriptionCandidate(shortBlock, ".short-description", "short");
    warnings.push(...result.warnings);
    if (result.value) { short = result.value; sources.short = result.source; }
  }
  if (!short) {
    const summary = balancedBlock(html, /<div[^>]*class=["'][^"']*entry-summary[^"']*["'][^>]*>/i, "div");
    if (summary) {
      const cleaned = summary
        .replace(/<div[^>]*class=["'][^"']*product_meta[^"']*["'][\s\S]*?<\/div>/gi, "")
        .replace(/<p[^>]*class=["'][^"']*\bprice\b[^"']*["'][\s\S]*?<\/p>/gi, "")
        .replace(/<span[^>]*class=["'][^"']*(sku|gtin|price)[^"']*["'][\s\S]*?<\/span>/gi, "")
        .replace(/<form[\s\S]*?<\/form>/gi, "");
      const result = validateDescriptionCandidate(cleaned, ".entry-summary", "short");
      warnings.push(...result.warnings);
      if (result.value) { short = result.value; sources.short = result.source; }
    }
  }
  if (!short && ld.description) {
    const result = validateDescriptionCandidate(ld.description, "json-ld", "short");
    warnings.push(...result.warnings);
    if (result.value) { short = result.value.slice(0, 1800); sources.short = result.source; }
  }
  if (!short) warnings.push("missing_short_description");

  // FULL DESCRIPTION — priority chain
  let full: string | null = null;
  const tabBlock =
    balancedBlock(html, /<div[^>]*id=["']tab-description["'][^>]*>/i, "div") ??
    balancedBlock(html, /<div[^>]*class=["'][^"']*woocommerce-Tabs-panel--description[^"']*["'][^>]*>/i, "div") ??
    balancedBlock(html, /<div[^>]*class=["'][^"']*(?:product-description|product__description|product-details-content|product-content)[^"']*["'][^>]*>/i, "div") ??
    balancedBlock(html, /<section[^>]*class=["'][^"']*(?:product-description|product__description|product-details-content|product-content)[^"']*["'][^>]*>/i, "section");
  if (tabBlock) {
    const result = validateDescriptionCandidate(tabBlock, "description-tab", "full");
    warnings.push(...result.warnings);
    if (result.value) { full = result.value; sources.full = result.source; }
  }
  if (!full && ld.description) {
    const result = validateDescriptionCandidate(ld.description, "json-ld", "full");
    warnings.push(...result.warnings);
    if (result.value) { full = result.value; sources.full = result.source; }
  }
  // Meta description is stored separately only. It is page metadata, not a full product description.
  const metaDescription = firstMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  if (!full) warnings.push("missing_full_description");

  // Quality flags
  const shortLen = short ? short.length : 0;
  const fullLen = full ? stripTags(full).length : 0;
  if (full && fullLen < REVIEW_FULL_MIN) warnings.push("full_description_short_review");
  if (short && full && stripTags(full).toLowerCase() === short.toLowerCase()) warnings.push("short_full_identical");
  sources.title_source = sources.title;
  sources.sku_source = sources.sku;
  sources.short_description_source = sources.short;
  sources.full_description_source = sources.full;
  sources.full_description_character_count = fullLen;
  const uniqueWarnings = [...new Set(warnings)];
  sources.extraction_warnings = uniqueWarnings;

  const rawImg = ld.image ??
    firstMatch(html, /class=["'][^"']*woocommerce-product-gallery__image[^"']*["'][\s\S]*?data-large_image=["']([^"']+)["']/i) ??
    firstMatch(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

  const sourceSlug = productSlugFromUrl(url);
  const cleanTitle = collapse(stripTags(title)).slice(0, 300);
  return {
    productId: sourceSlug,
    sourceSlug,
    productType: inferProductType(cleanCategory, cleanTitle, url),
    title: cleanTitle,
    url,
    sku: sku ? collapse(sku).slice(0, 120) : null,
    gtin: gtin ? collapse(gtin).slice(0, 120) : null,
    price: price ? collapse(price).slice(0, 120) : null,
    shortDescription: short ? short.slice(0, 1800) : null,
    description: full ? full.slice(0, 12000) : null,
    category: cleanCategory,
    imageUrl: rawImg ? absUrl(rawImg, url) : null,
    metaDescription: metaDescription ? decodeEntities(metaDescription) : null,
    sources,
    warnings: uniqueWarnings,
    shortLength: shortLen,
    fullLength: fullLen,
  };
}

/* ── category crawl ────────────────────────────────────────────────────── */
function extractProductLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const add = (href: string) => { const u = absUrl(href, baseUrl); if (u && /\/product\//.test(u)) links.add(u.split("#")[0].split("?")[0]); };
  for (const re of [
    /href=["'](https?:\/\/[^"']+\/product\/[^"']+)["']/gi,
    /href=["'](\/[^"']*?\/product\/[^"']+)["']/gi,
    /"(https?:\\?\/\\?\/[^"']+?\/product\/[^"'\\]+)"/gi, // links embedded in JSON/scripts
  ]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html))) add(m[1].replace(/\\\//g, "/"));
  }
  return [...links];
}
function pageUrlFor(base: string, n: number): string {
  if (n <= 1) return base;
  const clean = base.split("#")[0].split("?")[0].replace(/\/+$/, "");
  return `${clean}/page/${n}/`;
}

/* ── handler ───────────────────────────────────────────────────────────── */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized", message: "Sign in required." }, 401);
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: { user }, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
    if (userErr || !user) return json({ ok: false, error: "unauthorized", message: "Sign in required." }, 401);

    let body: { sourceUrl?: string; mode?: string; urls?: string[]; maxProducts?: number; maxPages?: number } = {};
    try { body = await req.json(); } catch { /* defaults */ }
    const mode = body.mode ?? "full";
    const maxProducts = Math.min(Math.max(body.maxProducts ?? DEFAULT_MAX_PRODUCTS, 1), 300);
    const maxPages = Math.min(Math.max(body.maxPages ?? DEFAULT_MAX_PAGES, 1), 40);

    // ── DETAILS MODE: scan one batch of product URLs (keeps each call fast) ──
    if (mode === "details") {
      const urls = Array.isArray(body.urls) ? body.urls.filter((u) => /^https?:\/\//i.test(u)).slice(0, 40) : [];
      if (urls.length === 0) return json({ ok: false, error: "no_urls", message: "No product URLs provided." }, 200);
      const results = await pooled(urls, 10, async (u) => {
        const html = await fetchHtml(u);
        return { url: u, product: html ? scanProductFromHtml(html, u) : null };
      });
      const products: ScannedProduct[] = [];
      const failed: string[] = [];
      for (const r of results) { if (r.product) products.push(r.product); else failed.push(r.url); }
      return json({ ok: true, mode: "details", products, failed }, 200);
    }

    // ── DISCOVER / FULL: crawl category pages for product URLs ──
    const sourceUrl = (body.sourceUrl ?? "").trim();
    if (!/^https?:\/\//i.test(sourceUrl)) return json({ ok: false, error: "invalid_url", message: "sourceUrl must be a valid http(s) URL." }, 200);

    const productUrls: string[] = [];
    const seen = new Set<string>();
    const failedCategoryPages: string[] = [];
    let categoryPagesScanned = 0;
    let duplicatesSkipped = 0;
    const collect = (html: string) => {
      for (const l of extractProductLinks(html, sourceUrl)) {
        if (seen.has(l)) { duplicatesSkipped++; continue; }
        if (productUrls.length >= maxProducts) break;
        seen.add(l); productUrls.push(l);
      }
    };

    // Page 1, then detect the highest page number and fetch the rest in parallel.
    const page1 = await fetchHtml(pageUrlFor(sourceUrl, 1));
    categoryPagesScanned++;
    if (!page1) {
      return json({ ok: false, error: "no_products_found", message: "Could not load the category page.", summary: { categoryPagesScanned, productUrlsFound: 0, duplicatesSkipped: 0, failedCategoryPages: [sourceUrl] } }, 200);
    }
    collect(page1);
    let lastPage = 1;
    for (const m of page1.matchAll(/\/page\/(\d+)\//g)) lastPage = Math.max(lastPage, parseInt(m[1], 10));
    lastPage = Math.min(lastPage, maxPages);
    if (lastPage > 1 && productUrls.length < maxProducts) {
      const rest = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
      const htmls = await pooled(rest, 8, (p) => fetchHtml(pageUrlFor(sourceUrl, p)));
      for (let i = 0; i < htmls.length; i++) {
        categoryPagesScanned++;
        if (htmls[i]) collect(htmls[i] as string);
        else failedCategoryPages.push(pageUrlFor(sourceUrl, rest[i]));
      }
    }

    const discoverSummary = { categoryPagesScanned, productUrlsFound: productUrls.length, duplicatesSkipped, failedCategoryPages };
    if (productUrls.length === 0) {
      return json({ ok: false, error: "no_products_found", message: "No product links found. Make sure the URL is a WooCommerce product category page.", summary: discoverSummary }, 200);
    }

    // DISCOVER: return only the URLs — the client scans details in batches.
    if (mode === "discover") {
      return json({ ok: true, mode: "discover", sourceUrl, productUrls, summary: discoverSummary }, 200);
    }

    // FULL (legacy / small catalogs): scan everything in one call (can be slow).
    const results = await pooled(productUrls, CONCURRENCY, async (u) => {
      const html = await fetchHtml(u);
      return { url: u, product: html ? scanProductFromHtml(html, u) : null };
    });
    const products: ScannedProduct[] = [];
    const failedProductPages: string[] = [];
    for (const r of results) { if (r.product) products.push(r.product); else failedProductPages.push(r.url); }
    const summary = {
      ...discoverSummary,
      productPagesScanned: results.length,
      detailPagesScanned: results.length,
      failedProductPages,
      failedPages: [...failedCategoryPages, ...failedProductPages],
      missingSku: products.filter((p) => !p.sku).length,
      missingShort: products.filter((p) => !p.shortDescription).length,
      missingFull: products.filter((p) => !p.description).length,
    };
    return json({ ok: true, sourceUrl, scannedAt: new Date().toISOString(), summary, products }, 200);
  } catch (err) {
    console.error("[scan-product-category] fatal:", err);
    return json({ ok: false, error: "server_error", message: String((err as Error)?.message ?? err) }, 200);
  }
});
