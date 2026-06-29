# KiuQ Product Sync — Distribution Layer

How the KiuQ master system pushes product data out to one or more e‑commerce
"framework" sites. Read this first when onboarding a **new store** or debugging
a broken sync.

> **TL;DR of the flow**
> Edit a product in the KiuQ **Image/Product Content Dashboard** → click **Sync**
> → the `product-sync` Supabase Edge Function POSTs the product to each connected
> site's `receiver.php` → the receiver downloads images locally and writes
> `/data/products.json` → the store's front‑end reads that JSON and shows the
> update on the next page load.

---

## 1. Architecture

```
┌────────────────────────┐     POST (admin JWT)      ┌───────────────────────────┐
│  KiuQ Admin (Vue SPA)  │ ────────────────────────▶ │  Supabase Edge Function   │
│  matrix.kiuq.net       │                           │  product-sync             │
└────────────────────────┘                           └────────────┬──────────────┘
        ▲  reads/writes                                            │ for each ACTIVE site:
        │                                                          │ POST JSON + X-Sync-Token
┌───────┴────────────────┐                                        ▼
│  Supabase (Postgres)   │                          ┌───────────────────────────────┐
│  project: kaaekveaa... │                          │  Store site (PHP)             │
│  team_folders /        │                          │  https://SITE/api/receiver.php│
│  team_images (source)  │                          └────────────┬──────────────────┘
│  connected_websites    │                                       │ downloads images,
│  product_sync_*        │                                       │ merges catalog
└────────────────────────┘                                       ▼
                                                    /data/products.json  +  /product-images/*
                                                                 │
                                                                 ▼  fetched at runtime
                                                    Store front‑end shows the product
```

- **Master / controller:** KiuQ admin at `matrix.kiuq.net`. It has **no PHP API of
  its own** — its entire backend is Supabase.
- **Backend:** Supabase project ref **`kaaekveaaoriacwzzrnf`**.
- **Edge Functions:** `product-sync` (the distributor) and `scan-product-category`.
- **Stores:** any number of e‑commerce sites, each running a single `receiver.php`
  endpoint. The store front‑end is static and just fetches `/data/products.json`.

### Source of truth for product data
Despite some older comments mentioning `cms_products`, the live `product-sync`
function reads products from the **Image/Product Content Dashboard**:
- `public.team_folders`  — one row per product (name, sku, price, gtin, category,
  descriptions, `product_slug`, `product_type`, `button_url`, `deleted_at`, …).
- `public.team_images`   — images per folder (`url`, `is_feature_image`, `sort_order`).

So **edits must be made in that dashboard** to flow out to stores.

---

## 2. Supabase objects

| Object | Purpose |
|---|---|
| `connected_websites` | One row per store. Holds `sync_endpoint`, `secret_token`, `active`, `last_sync_at`, `last_status`. |
| `product_website_overrides` | Per‑(site,product) field overrides (custom price, title, etc.) + `enabled` flag. |
| `product_sync_state` | Per‑(site,product) last status + `last_synced_hash` (drives change‑detection skip). |
| `product_sync_logs` | Append‑only history of every push (success/failed + error). |
| `product_sync_settings` | Row `id=1`: `batch_size` (5), `concurrency` (3), `request_timeout_s` (60). |

`connected_websites` columns: `id, name, domain, sync_endpoint, secret_token,
platform, active, last_sync_at, last_status, notes, created_by, created_at,
updated_at`. FKs from the other tables use `ON DELETE CASCADE`/`SET NULL`, so
deleting a site row cleans up its overrides/state automatically.

### Edge Function: `product-sync`
- **Auth:** caller must send `Authorization: Bearer <user JWT>`; the user's
  `profiles.role` must be one of `admin | owner | head | supervisor` (else 403).
- **Actions** (POST body):
  - `{ action: "test-connection", websiteId }` → sends a `ping` to that site.
  - `{ action: "sync", productIds: "all"|[ids], websiteIds: "all"|[ids],
       syncType: "full"|"price"|"images"|"descriptions", force?: bool }`
  - `{ action: "retry-failed", websiteId?, productId? }`
- **Change detection:** for `syncType:"full"`, a product whose content hash equals
  its last **successful** hash is **skipped** — unless `force:true`.
- Only `active = true` sites and non‑deleted products are processed. Writes
  `product_sync_logs` + `product_sync_state` and updates each site's
  `last_sync_at` / `last_status` (`success`|`partial`|`failed`).

---

## 3. The receiver (`receiver.php`) contract

Each store hosts **one** PHP file at `https://SITE/api/receiver.php`.

- **Method:** `POST` only (GET → 405).
- **Auth header:** `X-Sync-Token: <secret_token>` — compared constant‑time against
  the site's token. Wrong/missing → `401`.
- **Body:** JSON `{ "action": ... }`.

### Actions
| Action | Body | Returns |
|---|---|---|
| `ping` | `{"action":"ping"}` | `{ok, version, product_count, gd, curl, writable}` — used by **Test connection**. |
| `sync` | `{"action":"sync","type":"full|price|images|descriptions","force":bool,"products":[…]}` | `{ok, type, count, results[], total_products}` |

The receiver, on `sync`:
1. Downloads each remote image **once**, de‑dupes by content hash, saves under
   `/product-images/<slug>/…`, and rewrites image URLs to local `/product-images/…`.
2. Upserts products by `id` into `/data/products.json`. **Partial** syncs
   (price/images/descriptions) **merge** into the existing record (nothing else lost);
   **full** replaces.
3. Writes atomically with a lock — safe on shared hosting.

### Product payload (what the function sends, per product)
```jsonc
{
  "id", "slug", "sku", "name", "category", "productType",
  "shortDescription", "fullDescription", "price", "salePrice",
  "gtin", "stockStatus", "status",
  "featuredImage", "galleryImages": [],
  "specs": [], "features": [], "relatedProducts": [],
  "attachments": [], "faq": [], "buttonUrl",
  "seoTitle", "seoDescription", "updatedAt"
}
```
(Partial syncs send only the relevant subset + `id`/`slug`/`sku`.)

### Required folders & permissions on the store
The receiver sits at `/api/` and writes to these (relative to the **site root**):

| Path | Why | Perms |
|---|---|---|
| `/api/storage/` | image de‑dup manifest | 775 |
| `/data/` (writes `products.json`) | the public catalog the front‑end reads | 775 |
| `/product-images/` | downloaded, localized images | 775 |

Files 644, folders 755/775. If any of these aren't writable, `ping` returns
`"writable": false` and sync fails with *"Failed to write product store"*.

---

## 4. Onboarding a NEW store (checklist)

1. **Register the site** — in KiuQ admin → Product Sync → Connected Websites, add
   the site (name, domain, `sync_endpoint = https://NEWSITE/api/receiver.php`). A
   `secret_token` is generated. *(Or insert a row into `connected_websites`.)*
2. **Deploy the receiver** to `https://NEWSITE/api/receiver.php`. Two variants — pick one:
   - **A. Two‑file (env‑var token)** — *recommended on Hostinger.* Upload
     `receiver.php` + `sync-config.php`; in `sync-config.php` the token is read from
     the `SYNC_TOKEN` environment variable (set it in hPanel → Advanced → Environment
     Variables to the site's secret token). No secret in the repo. **This is what
     konstructz.com runs.**
   - **B. Single‑file (hardcoded token)** — *most portable;* good for hosts without
     env‑var support. One self‑contained `receiver.php` with
     `define('SYNC_TOKEN', '…')` at the top. Keep the file private.
3. **Create the writable folders** (`/api/storage`, `/data`, `/product-images`) and
   set 775.
4. **Test connection** from KiuQ (or `curl`):
   ```bash
   curl -X POST https://NEWSITE/api/receiver.php \
     -H "X-Sync-Token: <THE_SITE_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"action":"ping"}'
   # expect: {"ok":true,...,"writable":true}
   ```
5. **Point the front‑end at the catalog.** The store SPA reads the local JSON. In its
   build env:
   ```
   VITE_PRODUCTS_SOURCE=local
   VITE_PRODUCTS_LOCAL_URL=/data/products.json
   ```
6. **Push** — from KiuQ, sync all (or selected) products to the new site.

---

## 5. Deploying backend changes (migrations + functions)

From the master repo (`/Users/sour/Documents/Wordpress prompt System`):

```bash
supabase functions deploy product-sync --project-ref kaaekveaaoriacwzzrnf
supabase functions deploy scan-product-category --project-ref kaaekveaaoriacwzzrnf
```

> ⚠️ **`supabase db push` gotcha (this repo):** `supabase/migrations/` contains
> **duplicate version‑prefix files** (e.g. several `0027_*`, two `0030_*`…). Supabase's
> history table stores one row per version, so those duplicates are un‑recordable and
> `db push` will always flag 8 legacy files. **Do not** use `--include-all` (some of
> those legacy files have non‑idempotent `CREATE POLICY`/`CREATE TRIGGER` and will
> abort the push). Instead: temporarily `mv` the 8 duplicate legacy files out of the
> migrations dir, run `supabase db push --linked` (dry‑run first), then `mv` them back.
> Docker isn't required for `functions deploy`/`db push`, but it **is** for
> `db dump`/local dev — verify remote schema via PostgREST instead:
> `curl "$SUPABASE_URL/rest/v1/<table>?limit=1" -H "apikey: <anon key>"`.

---

## 6. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Test connection red, `401` | Token mismatch — `connected_websites.secret_token` ≠ the site's `SYNC_TOKEN` (env var or hardcoded). |
| `ping` returns `"writable": false` | `/data`, `/product-images`, or `/api/storage` not writable → `chmod 775`. |
| `404` on `/api/receiver.php` | File not uploaded, or subdomain document root not pointed at the right folder. |
| Sync says *"Failed to write product store"* | `/data` not writable (see above). |
| Edit didn't appear on the store | Edited the wrong place (must be the **team_folders** content dashboard); or product unchanged → skipped (use **Force**); or the store SPA caches `products.json` (hard refresh). |
| Images still point to remote URLs | Image download failed on the store (no cURL/`allow_url_fopen`, or remote 403) — receiver keeps the original URL so the product still renders. |
| `403 Admin access required` | The signed‑in user's `profiles.role` isn't admin/owner/head/supervisor. |

---

## 7. Secrets — where they live (never commit these)
- Each store's token: **KiuQ admin → Connected Websites → the site → Secret token**
  (= `connected_websites.secret_token`). Mirror it into the store's `SYNC_TOKEN`.
- Supabase anon/publishable key: `web/.env` (`VITE_SUPABASE_ANON_KEY`).
- Service‑role key (for privileged DB scripts/deletes): **Supabase → Project Settings
  → API → `service_role`**. Do not store in the repo.
