# Project Overview — KiuQ Workflow System

## What it is

**KiuQ** is a centralized workflow and content-management system for running a
team of contributors across many storefront websites. It is the **master
controller**: content (products and blog posts) is authored once in KiuQ and
**pushed out** to any number of connected storefront sites, which act as
receivers.

It ships as a Vue 3 web app (also packaged as a desktop app via Tauri) backed by
Supabase (Postgres + Auth + Storage + Edge Functions).

## Who uses it

- **Heads / Supervisors** — manage websites, products, blog content, members,
  reviews, and reporting.
- **Members** — receive assigned tasks/prompts, submit work, and track progress.

Access is role-gated (`profiles.role`: admin / owner / head / supervisor /
member) and enforced with Supabase row-level security.

## Core capabilities

- **CMS / Blog Studio** — a two-panel headless blog editor (Tiptap rich text)
  that authors posts per connected website and **publishes** them to the target
  storefront via the `blog-sync` Edge Function.
- **Product distribution** — a master product source (the Image Dashboard /
  team folders) is synced to storefront receivers via the `product-sync` Edge
  Function, with per-site overrides, hash-skip, and sync logs.
- **Team workflow** — prompt libraries, task assignment, boards, submissions,
  quality checks, reviews, follow-ups, leaderboards, and reporting.
- **Notifications** — web push (Firebase) and a standalone notification worker.

## How content reaches a storefront

Storefronts never talk to KiuQ's database directly. KiuQ pushes a canonical
payload to a small PHP **receiver** on each storefront, which writes a local
JSON snapshot (`/data/products.json`, `/data/blogs.json`) and downloads/dedupes
images locally. The storefront renders from that snapshot — fast, cache-friendly,
and decoupled from any third-party database. See
[`architecture.md`](architecture.md) for the full flow.

## Repository map

| Path | Purpose |
|------|---------|
| `web/` | Vue 3 + Vite + TS admin app (Pinia, vue-router, vue-i18n, Tauri shell) |
| `supabase/` | SQL migrations + Edge Functions (`product-sync`, `blog-sync`, push) |
| `notification-service/` | Standalone push / WhatsApp notification worker |
| `docs/` | This documentation |
