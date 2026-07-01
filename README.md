# KiuQ Workflow System

A centralized workflow and content-management platform for running a team of
contributors across many storefront websites. Content (products and blog posts)
is authored **once** in KiuQ and pushed out to any number of connected
storefronts, which render it from a fast local JSON snapshot.

> KiuQ is the **master controller**; connected storefronts (e.g. the Konstructz
> React site) are **receivers**. See [`docs/architecture.md`](docs/architecture.md).

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3, Vite, TypeScript, Pinia, vue-router, vue-i18n, Tailwind CSS |
| Editor | Tiptap (rich text, inline image upload) |
| Desktop | Tauri (native shell of the same app) |
| Backend | Supabase — Postgres (RLS), Auth, Storage, Edge Functions (Deno) |
| Notifications | Firebase Web Push + a standalone Node notification worker |

## Key features

- **Blog Studio** — two-panel headless CMS: post list + rich-text editor, status
  workflow (Draft / Ready / Published / Failed), per-website categories, SEO
  fields, live preview, and one-click **publish to a storefront**.
- **Image paste / drag-drop upload** — paste or drop images into the featured
  slot or straight into the article body; auto WebP conversion and safe storage
  paths.
- **Product distribution** — a master product source synced to storefront
  receivers with per-site overrides, hash-skip, and sync logs.
- **Team workflow** — role-based access, task/prompt assignment, boards,
  submissions, quality checks, reviews, follow-ups, leaderboards, and reporting.
- **Notifications** — web push and a standalone notification service.

## AI features / workflows

- **Prompt library & workflows** — reusable AI prompt templates and multi-step
  prompt workflows contributors follow to generate consistent content (see
  `docs/AI-PROMPT-*.md`).
- **Blog Image Center** — per-website AI image-generation prompt templates and a
  WebP conversion pipeline for editorial imagery.
- **Structured, AI-assisted authoring** — the Blog Studio produces clean,
  sanitized HTML ready to publish to any connected storefront.

---

## Getting started

### Prerequisites
- Node.js 18+ and npm
- A Supabase project (URL + anon key)

### Install & run (web app)
```bash
cd web
npm install
cp .env.example .env    # fill in real values
npm run dev             # http://localhost:5175
```

### Environment variables
See [`web/.env.example`](web/.env.example). Client code reads only `VITE_*`
values (public Supabase URL + anon key, Firebase web-push config). **Server-only
secrets (e.g. the Supabase `service_role` key) must never live in the web app or
be committed** — they belong in Edge Function / backend environments.

### Build
```bash
cd web
npm run build     # vue-tsc type-check + vite production build
npm run preview   # preview the production build locally
```

### Desktop (optional, Tauri)
```bash
cd web
npm run tauri:dev
npm run tauri:build
```

---

## Deployment notes

- **Storefronts** deploy separately and auto-deploy on push to `main`
  (Hostinger + GitHub App). They render blog/product data from a local JSON
  snapshot delivered by the receiver — no direct database coupling.
- **Sync**: KiuQ Edge Functions (`blog-sync`, `product-sync`) push a canonical
  payload to each storefront's PHP receiver, authenticated with a per-site
  shared secret. The receiver downloads/dedupes images and writes
  `/data/blogs.json` / `/data/products.json` atomically.
- **Secrets**: rotate the shared receiver secret and Supabase keys via their
  respective dashboards; never commit them.

## Screenshots

> _Add screenshots/GIFs of the Blog Studio, Product Sync Center, and dashboards
> here._

| | |
|---|---|
| Blog Studio | _screenshot_ |
| Product Sync Center | _screenshot_ |
| Team dashboard | _screenshot_ |

## Documentation

- [Project overview](docs/project-overview.md)
- [Architecture](docs/architecture.md)
- [Product sync distribution](docs/PRODUCT_SYNC_DISTRIBUTION.md)
- [Supabase setup](docs/supabase-setup.md)

## Future improvements

- Split the large Vite bundle with route-level code-splitting.
- Automated tests (unit + end-to-end) and CI checks.
- Scheduled publishing and richer editorial roles.
- In-app image gallery reuse across posts.

## License

Proprietary — see [LICENSE](LICENSE). Published for portfolio/demonstration.
