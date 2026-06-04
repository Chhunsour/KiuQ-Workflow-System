# AI Prompt — Next.js Blog CMS Integration
# Paste this entire prompt into your IDE AI (Cursor, Copilot, Claude, etc.)

---

I need you to integrate a Supabase CMS into this Next.js 14 App Router project so that blog posts created in our central CMS system automatically appear on this website. The Supabase table already exists and has a verified working published post in it. Follow every step below exactly.

---

## Context

- Framework: Next.js 14 App Router (src/ directory structure)
- Blog listing page: `src/app/blog/page.tsx`
- Blog post page: `src/app/blog/[slug]/page.tsx`
- Current blog library: `src/lib/cms-blog.ts`
- The site already has a working JSON-file-based blog system — do NOT remove it. We are adding Supabase on top and merging both sources.

---

## Supabase details

- Project URL: `https://kaaekveaaoriacwzzrnf.supabase.co`
- Table name: `cms_blog_posts`
- The anon key is already set in the project's `.env` or `.env.production` file as:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Row Level Security is already configured — the anon key can only read rows where `status = 'published'`

## Table schema (cms_blog_posts)

| Column | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| title | text | post title |
| slug | text | URL slug (unique among published) |
| excerpt | text | short summary for cards |
| category | text | e.g. "Buyer Guides" |
| content | text | full article in Markdown |
| featured_image | text | URL to image |
| featured_image_alt | text | image alt text |
| author | text | author name |
| publish_date | date | YYYY-MM-DD |
| seo_title | text | |
| seo_description | text | |
| status | enum | 'draft' or 'published' |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| published_at | timestamptz | auto-set when published |

---

## Step 1 — Install dependency

Run:
```bash
npm install --save @supabase/supabase-js
```

---

## Step 2 — Create `src/lib/supabase.ts`

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseKey);
export const supabaseWebsiteId = process.env.SUPABASE_WEBSITE_ID ?? process.env.NEXT_PUBLIC_SUPABASE_WEBSITE_ID ?? '';
```

---

## Step 3 — Edit `src/lib/cms-blog.ts`

### 3a. Add this import at the top of the file:
```ts
import { supabase, supabaseWebsiteId } from '@/lib/supabase';
```

### 3b. Find and DELETE these two existing functions:
```ts
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const posts = await getAllPosts();
  return posts.filter(isPostPublished);
}

export async function getPostBySlug(slug: string) {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug);
}
```

### 3c. Replace them with this entire block:
```ts
// ── Supabase CMS reads ────────────────────────────────────────────────

function supabaseConfigured(): boolean {
  return !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
}

async function pingDatabase() {
  if (!supabaseConfigured() || !supabaseWebsiteId) return;
  try {
    await supabase.rpc('ping_website', { p_website_id: supabaseWebsiteId });
  } catch {
    // Silently ignore ping failures to not interrupt page loads
  }
}

function supabaseRowToPost(r: Record<string, unknown>): BlogPost {
  return {
    id:          String(r['id'] ?? ''),
    title:       String(r['title'] ?? ''),
    slug:        String(r['slug'] ?? ''),
    excerpt:     String(r['excerpt'] ?? ''),
    category:    String(r['category'] ?? ''),
    publishedAt: r['publish_date'] ? String(r['publish_date']) : String(r['published_at'] ?? '').slice(0, 10),
    status:      'published' as BlogStatus,
    image:       String(r['featured_image'] ?? ''),
    imageAlt:    r['featured_image_alt'] ? String(r['featured_image_alt']) : undefined,
    author:      r['author'] ? String(r['author']) : undefined,
    content:     String(r['content'] ?? ''),
    createdAt:   String(r['created_at'] ?? ''),
    updatedAt:   String(r['updated_at'] ?? ''),
  };
}

async function getSupabasePublishedPosts(): Promise<BlogPost[] | null> {
  if (!supabaseConfigured()) return null;
  try {
    pingDatabase();
    const { data, error } = await supabase
      .from('cms_blog_posts')
      .select('id,title,slug,excerpt,category,content,featured_image,featured_image_alt,author,publish_date,published_at,status,created_at,updated_at')
      .eq('status', 'published')
      .eq('website_id', supabaseWebsiteId)
      .order('publish_date', { ascending: false });
    if (error || !data) return null;
    return data.map(supabaseRowToPost);
  } catch {
    return null;
  }
}

async function getSupabasePostBySlug(slug: string): Promise<BlogPost | null> {
  if (!supabaseConfigured()) return null;
  try {
    pingDatabase();
    const { data, error } = await supabase
      .from('cms_blog_posts')
      .select('id,title,slug,excerpt,category,content,featured_image,featured_image_alt,author,publish_date,published_at,status,created_at,updated_at')
      .eq('slug', slug)
      .eq('status', 'published')
      .eq('website_id', supabaseWebsiteId)
      .maybeSingle();
    if (error || !data) return null;
    return supabaseRowToPost(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
  const [supabasePosts, jsonPosts] = await Promise.all([
    getSupabasePublishedPosts(),
    getAllPosts().then((posts) => posts.filter(isPostPublished)),
  ]);
  if (!supabasePosts) return jsonPosts;
  const seen = new Set(supabasePosts.map((p) => p.slug));
  const uniqueJson = jsonPosts.filter((p) => !seen.has(p.slug));
  return [...supabasePosts, ...uniqueJson];
}

export async function getPostBySlug(slug: string): Promise<BlogPost | undefined> {
  const supabasePost = await getSupabasePostBySlug(slug);
  if (supabasePost) return supabasePost;
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug);
}
```

---

## Step 4 — Env file

Make sure the project has a `.env` or `.env.production` file with:
```
NEXT_PUBLIC_SUPABASE_URL=https://kaaekveaaoriacwzzrnf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjI5MDMsImV4cCI6MjA5Mzc5ODkwM30.lkh7FN-Mb3_hwlKufGeJrWEROjfVa0C7PQgsyIcZ1OE
NEXT_PUBLIC_SUPABASE_WEBSITE_ID=your-website-uuid-here
```

---

## Step 5 — Deploy

Commit all changes, push to GitHub. Hostinger will auto-rebuild and deploy.

---

## What NOT to change

- Do not touch `savePost`, `deletePost`, `syncPublicFeed`, `getAllPosts`, or `ensureDataFile` in `cms-blog.ts`
- Do not remove the existing admin panel routes (`/admin`, `/api/admin/*`)
- Do not change any blog UI components — only the data layer changes
- Do not change `blog/page.tsx` or `blog/[slug]/page.tsx` — they already call `getPublishedPosts` and `getPostBySlug` which we just updated

---

## Verification

After deploying, a post with slug `dasdada-asdasdas` and title `adsdada` should appear on the `/blog` page under "Our Latest Blogs". If it does not appear, the env vars are not being picked up by the build — double-check the `.env.production` file was committed and pushed.
