// Local product sync runner (dev only, no cloud function / domain needed).
//
// Reads the master catalog (team_folders + team_images) from Supabase and pushes
// it to a LOCAL receiver in batches — the same canonical payload the deployed
// edge function sends. Reuses the service key already in run_migration.js
// (no secret hardcoded here).
//
// Usage (from web/):
//   1) Start the receiver pointed at the Konstructz site's static/ folder:
//        SYNC_TOKEN=localdev php -S 127.0.0.1:8787 -t "/path/to/Konstructz Project Website/static"
//   2) node sync-local.mjs
//   Optional: RECV_URL, RECV_TOKEN, LIMIT (sync only N products).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const runner = readFileSync(new URL('./run_migration.js', import.meta.url), 'utf8');
const url = runner.match(/supabaseUrl\s*=\s*'([^']+)'/)[1];
const key = runner.match(/serviceKey\s*=\s*'([^']+)'/)[1];
const s = createClient(url, key, { auth: { persistSession: false } });

const RECV = process.env.RECV_URL || 'http://127.0.0.1:8787/api/receiver.php';
const TOKEN = process.env.RECV_TOKEN || 'localdev';
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
const BATCH = 4;

const buildPayload = (f, images) => {
  const sorted = [...images].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const gallery = sorted.map((i) => i.url).filter(Boolean);
  const feature = sorted.find((i) => i.is_feature_image)?.url ?? gallery[0] ?? null;
  return {
    id: f.id, slug: f.product_slug || f.id, sku: f.sku ?? f.matched_product_sku ?? null,
    name: f.name, category: f.product_category, productType: f.product_type, machineCategory: f.machine_category,
    shortDescription: f.short_description, fullDescription: f.description,
    price: f.product_price, salePrice: null, gtin: f.gtin ?? f.product_gtin ?? null, stockStatus: null,
    status: 'published', featuredImage: feature, galleryImages: gallery,
    specs: [], features: [], relatedProducts: [], attachments: [], faq: [],
    buttonUrl: f.button_url, seoTitle: null, seoDescription: null, updatedAt: f.updated_at,
  };
};
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

let fq = s.from('team_folders')
  .select('id,name,sku,matched_product_sku,product_price,product_gtin,gtin,product_category,short_description,description,button_url,product_slug,product_type,machine_category,updated_at')
  .is('deleted_at', null).order('updated_at', { ascending: false });
if (LIMIT) fq = fq.limit(LIMIT);
const { data: folders, error: fe } = await fq;
if (fe) { console.error('folders error:', fe.message); process.exit(1); }

const ids = folders.map((f) => f.id);
const { data: imgs } = await s.from('team_images').select('url,folder_id,is_feature_image,sort_order').in('folder_id', ids);
const byFolder = new Map();
for (const im of imgs ?? []) { const a = byFolder.get(im.folder_id) ?? []; a.push(im); byFolder.set(im.folder_id, a); }

const payloads = folders.map((f) => buildPayload(f, byFolder.get(f.id) ?? []));
console.log(`Syncing ${payloads.length} products → ${RECV}`);

let ok = 0, fail = 0, imgRefs = 0;
for (const group of chunk(payloads, BATCH)) {
  try {
    const res = await fetch(RECV, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Sync-Token': TOKEN },
      body: JSON.stringify({ action: 'sync', type: 'full', products: group }),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) { fail += group.length; console.log(`  batch failed (HTTP ${res.status}): ${j?.error ?? ''}`); continue; }
    for (const r of j.results ?? []) { r.ok ? ok++ : fail++; imgRefs += (r.images ?? []).length; }
  } catch (e) { fail += group.length; console.log(`  batch error: ${e.message}`); }
  process.stdout.write(`  progress: ${ok + fail}/${payloads.length}\r`);
}
console.log(`\nDone: ${ok} ok, ${fail} failed, ${imgRefs} image refs localized.`);
