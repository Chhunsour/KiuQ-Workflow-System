# Architecture — KiuQ Workflow System

## High-level

```
        ┌─────────────────────────────────────────┐
        │            KiuQ (master)                 │
        │  Vue 3 + Vite + TS + Pinia (+ Tauri)     │
        │  Blog Studio · Products · Team workflow  │
        └───────────────┬─────────────────────────┘
                        │ Supabase JS (Auth + RLS)
                        ▼
        ┌─────────────────────────────────────────┐
        │              Supabase                    │
        │  Postgres (RLS) · Auth · Storage         │
        │  Edge Functions: product-sync, blog-sync │
        └───────────────┬─────────────────────────┘
                        │ HTTPS push (X-Sync-Token / secret)
                        ▼
        ┌─────────────────────────────────────────┐
        │   Storefront receiver (PHP, per site)    │
        │   writes /data/products.json             │
        │          /data/blogs.json                │
        │   downloads + dedupes images locally     │
        └───────────────┬─────────────────────────┘
                        ▼
                Storefront renders from local JSON
```

## Frontend (`web/`)

- **Vue 3** single-page app, `<script setup lang="ts">` SFCs.
- **Routing**: `vue-router`, route-level role guards (`meta` → head/admin/member).
- **State**: **Pinia** stores in `web/src/stores` (auth, productSync, reports,
  followup, notifications, blogImageCenter, …).
- **i18n**: `vue-i18n` with locale dictionaries.
- **Styling**: Tailwind + global CSS variables and shared `.btn-*` / `.card`
  primitives for a consistent theme (light/dark).
- **Editor**: Tiptap (StarterKit + Underline, Link, Image, Placeholder) powers
  the Blog Studio rich-text editor, including inline image paste / drag-drop
  upload.
- **Desktop**: the same app is packaged with **Tauri** for a native shell.

## Backend (`supabase/`)

- **Postgres** with row-level security; access decided by `profiles.role` and
  `is_admin()`-style helpers.
- **Edge Functions** (Deno): authenticate the caller via the bearer token, check
  role, then perform privileged work with the service_role key injected as an
  environment secret (never shipped to the client):
  - `product-sync` — reads the master product source, applies per-site
    overrides, hash-skips unchanged items, batches, and pushes to receivers.
  - `blog-sync` — pushes selected blog posts to a storefront receiver and
    records `pushed_to_website` / `publish_error` back on the row.
  - push notification functions — deliver web push via Firebase.

## Sync / receiver contract

- KiuQ pushes a **canonical camelCase payload** over HTTPS to the storefront's
  `/*/receiver.php`, authenticated with a per-site shared secret
  (`X-Sync-Token`).
- The receiver verifies the token, downloads referenced images once (content
  hash dedupe) into a local folder, rewrites URLs to local paths, and writes an
  atomic JSON snapshot. Storefronts read that snapshot — no direct DB coupling.

## Notification service (`notification-service/`)

A standalone Node worker that consumes events and delivers push / messaging
notifications, kept separate from the web app so it can run on its own schedule
and host.

## Security model

- Client code reads only `VITE_*` env values (public URL + anon key).
- All privileged operations run inside Edge Functions with the service_role key
  provided as a server-side secret.
- Storefront pushes are authenticated with a rotating per-site shared secret.
