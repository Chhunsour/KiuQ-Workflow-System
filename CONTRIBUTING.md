# Contributing

This is a proprietary project maintained by a small team. These notes describe
the working conventions used across the repository.

## Repository layout

| Path | Purpose |
|------|---------|
| `web/` | Vue 3 + Vite + TypeScript admin dashboard (the KiuQ app) |
| `supabase/` | Database migrations and Edge Functions |
| `notification-service/` | Standalone push / WhatsApp notification worker |
| `docs/` | Project and architecture documentation |

## Prerequisites

- Node.js 18+ and npm
- A Supabase project (URL + anon key) — see [`web/.env.example`](web/.env.example)

## Getting started

```bash
cd web
npm install
cp .env.example .env   # then fill in real values
npm run dev
```

## Conventions

- **TypeScript** everywhere in `web/src`; prefer explicit types on store and API
  boundaries.
- **Vue SFCs** use `<script setup lang="ts">`.
- **State** lives in Pinia stores under `web/src/stores`.
- **Styling** uses Tailwind plus the global CSS variables (`--primary`,
  `--card-bg`, `--border`, `--text-main`, …) and the shared `.btn-*` / `.card`
  classes — reuse them instead of ad-hoc colors.
- **Secrets**: never hardcode a Supabase `service_role` key or any secret in
  source. Client code may only read `VITE_*` values; server-only secrets belong
  in a backend environment.

## Before opening a PR

```bash
cd web
npm run build   # must pass (vue-tsc type-check + vite build)
```

Keep changes focused, use clear commit messages, and avoid committing generated
output, `node_modules`, `.env` files, or local scratch scripts.
