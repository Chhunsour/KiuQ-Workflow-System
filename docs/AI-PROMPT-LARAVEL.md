# AI Prompt — Laravel Blog CMS Integration (GitHub → Hostinger)
# Paste this ENTIRE document into your IDE AI (Cursor, Copilot, Claude, etc.)
# and say: "Apply this to my Laravel project, step by step."

---

You are integrating a shared Supabase CMS into this Laravel project. Blog posts
are written in our central CMS app and stored in a Supabase PostgreSQL database.
This website must READ those published posts and display them. This site does NOT
write posts — it only reads. Follow every step exactly and do not skip the
deployment and caching steps at the end, because those are where Laravel most
often goes wrong.

═══════════════════════════════════════════════════════════════════════════
## HOW THIS WORKS (read first)
═══════════════════════════════════════════════════════════════════════════

- The central CMS writes posts into a Supabase table called `cms_blog_posts`.
- Supabase exposes an automatic REST API over that table.
- This Laravel app calls that REST API with an HTTP GET request, using a
  public "anon" key, and gets back JSON.
- Supabase Row Level Security (RLS) guarantees the anon key can ONLY read rows
  where `status = 'published'`. Drafts are invisible to this key. This is why
  the key is safe to expose publicly.
- We cache results for a few minutes so every page load doesn't hit the API.
- There is NO local `blog_posts` table. Do not create a migration. Do not create
  an Eloquent model backed by a local DB. All data lives in Supabase.

Deployment model (same as our React developer):
- You commit code and push to GitHub.
- Hostinger pulls from GitHub and runs the Laravel app.
- IMPORTANT LARAVEL DIFFERENCE: Laravel's `.env` file is git-ignored by default,
  so it does NOT travel to the server through GitHub. To make this "just work"
  after a push — exactly like the React guy's flow — we put the Supabase URL and
  the public anon key as DEFAULT VALUES directly inside `config/services.php`
  (which IS committed). The anon key is public-safe (RLS-protected), so this is
  acceptable and is the most reliable path. You may still override them with a
  server `.env` if you prefer; the code supports both.

═══════════════════════════════════════════════════════════════════════════
## SUPABASE CONNECTION DETAILS
═══════════════════════════════════════════════════════════════════════════

- Project URL:  `https://kaaekveaaoriacwzzrnf.supabase.co`
- REST endpoint: `https://kaaekveaaoriacwzzrnf.supabase.co/rest/v1/cms_blog_posts`
- Table:        `cms_blog_posts`
- Anon key (public, read-only on published rows):
  ```
  eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjI5MDMsImV4cCI6MjA5Mzc5ODkwM30.lkh7FN-Mb3_hwlKufGeJrWEROjfVa0C7PQgsyIcZ1OE
  ```

### Table columns

| Column                | Type        | Used for                                  |
|-----------------------|-------------|-------------------------------------------|
| id                    | uuid        | unique id                                 |
| title                 | text        | post title                                |
| slug                  | text        | URL segment, unique among published posts |
| excerpt               | text        | short summary on cards                    |
| category              | text        | e.g. "Buyer Guides" (display name)        |
| content               | text        | full article body in **Markdown**         |
| featured_image        | text        | image URL                                 |
| featured_image_alt    | text        | image alt text                            |
| author                | text        | author name                               |
| publish_date          | date        | "YYYY-MM-DD", used for ordering/display   |
| seo_title             | text        | <title> override                          |
| seo_description       | text        | meta description                          |
| status               | text        | only 'published' is ever returned to us   |
| published_at          | timestamptz | when it went live                         |
| updated_at            | timestamptz | last edit time                            |

### How to query the Supabase REST API (reference)

Supabase uses PostgREST filter syntax in the query string:
- `?select=col1,col2`               → choose columns
- `&status=eq.published`            → WHERE status = 'published'
- `&slug=eq.my-post`                → WHERE slug = 'my-post'
- `&order=publish_date.desc`        → ORDER BY publish_date DESC
- `&limit=1`                        → LIMIT 1

Required HTTP headers on every request:
- `apikey: <anon key>`
- `Authorization: Bearer <anon key>`

═══════════════════════════════════════════════════════════════════════════
## STEP 1 — Configuration (`config/services.php`)
═══════════════════════════════════════════════════════════════════════════

Open `config/services.php` and add this entry inside the returned array. The
second argument to `env()` is the committed fallback so a GitHub push alone is
enough to run on Hostinger even without a server `.env`:

```php
'supabase' => [
    'url'        => env('SUPABASE_URL', 'https://kaaekveaaoriacwzzrnf.supabase.co'),
    'anon_key'   => env('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjI5MDMsImV4cCI6MjA5Mzc5ODkwM30.lkh7FN-Mb3_hwlKufGeJrWEROjfVa0C7PQgsyIcZ1OE'),
    'website_id' => env('SUPABASE_WEBSITE_ID', 'your-website-uuid-here'),
],
```

(Optional) Also add to `.env` for local development and to override on the server:
```
SUPABASE_URL=https://kaaekveaaoriacwzzrnf.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjI5MDMsImV4cCI6MjA5Mzc5ODkwM30.lkh7FN-Mb3_hwlKufGeJrWEROjfVa0C7PQgsyIcZ1OE
SUPABASE_WEBSITE_ID=your-website-uuid-here
```

═══════════════════════════════════════════════════════════════════════════
## STEP 2 — Service class (`app/Services/SupabaseCmsService.php`)
═══════════════════════════════════════════════════════════════════════════

Create the folder `app/Services` if it does not exist, then create this file.
It wraps all Supabase calls, caches responses, and fails gracefully (returns
empty data + logs a warning) so the site never crashes if Supabase is down.

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SupabaseCmsService
{
    private string $baseUrl;
    private string $key;
    private string $websiteId;
    private int $cacheTtl = 300; // seconds (5 minutes)

    // Columns for list views — note we DON'T fetch full `content` here,
    // only on the single-post page, to keep list responses small and fast.
    private const LIST_COLUMNS =
        'id,title,slug,excerpt,category,featured_image,featured_image_alt,author,publish_date,published_at,updated_at';

    private const FULL_COLUMNS =
        'id,title,slug,excerpt,category,content,featured_image,featured_image_alt,author,publish_date,seo_title,seo_description,published_at,updated_at';

    public function __construct()
    {
        $this->baseUrl   = rtrim((string) config('services.supabase.url'), '/');
        $this->key       = (string) config('services.supabase.anon_key');
        $this->websiteId = (string) config('services.supabase.website_id');
    }

    /**
     * Build the standard auth headers required by Supabase REST.
     */
    private function headers(): array
    {
        return [
            'apikey'        => $this->key,
            'Authorization' => 'Bearer ' . $this->key,
            'Accept'        => 'application/json',
        ];
    }

    /**
     * Low-level GET against the cms_blog_posts REST endpoint.
     * Returns a decoded array, or [] on any failure.
     */
    private function query(array $params): array
    {
        if ($this->baseUrl === '' || $this->key === '') {
            Log::warning('[SupabaseCms] Missing Supabase URL or anon key in config.');
            return [];
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(10)
                ->retry(2, 200) // retry twice, 200ms apart, on transient errors
                ->get("{$this->baseUrl}/rest/v1/cms_blog_posts", $params);

            if ($response->failed()) {
                Log::warning('[SupabaseCms] Request failed', [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return [];
            }

            return $response->json() ?? [];
        } catch (\Throwable $e) {
            Log::warning('[SupabaseCms] Request threw exception', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Send a heartbeat ping to register this website as active/connected.
     */
    public function ping(): void
    {
        if ($this->baseUrl === '' || $this->key === '' || $this->websiteId === '') {
            return;
        }

        try {
            Http::withHeaders($this->headers())
                ->timeout(4)
                ->post("{$this->baseUrl}/rest/v1/rpc/ping_website", [
                    'p_website_id' => $this->websiteId
                ]);
        } catch (\Throwable $e) {
            // Silently ignore ping failures so they never block the website
        }
    }

    /**
     * All published posts, newest first. Cached.
     */
    public function getPublishedPosts(): array
    {
        return Cache::remember('cms_blog_posts:all', $this->cacheTtl, function () {
            $this->ping();
            return $this->query([
                'select'     => self::LIST_COLUMNS,
                'status'     => 'eq.published',
                'website_id' => 'eq.' . $this->websiteId,
                'order'      => 'publish_date.desc',
            ]);
        });
    }

    /**
     * One published post by slug, or null. Cached per-slug.
     */
    public function getPostBySlug(string $slug): ?array
    {
        $key = 'cms_blog_posts:slug:' . sha1($slug);

        return Cache::remember($key, $this->cacheTtl, function () use ($slug) {
            $this->ping();
            $rows = $this->query([
                'select'     => self::FULL_COLUMNS,
                'slug'       => 'eq.' . $slug,
                'status'     => 'eq.published',
                'website_id' => 'eq.' . $this->websiteId,
                'limit'      => 1,
            ]);

            return $rows[0] ?? null;
        });
    }

    /**
     * Published posts in a given category (matched by display name), newest first.
     */
    public function getPostsByCategory(string $category): array
    {
        $key = 'cms_blog_posts:cat:' . sha1($category);

        return Cache::remember($key, $this->cacheTtl, function () use ($category) {
            $this->ping();
            return $this->query([
                'select'     => self::LIST_COLUMNS,
                'status'     => 'eq.published',
                'category'   => 'eq.' . $category,
                'website_id' => 'eq.' . $this->websiteId,
                'order'      => 'publish_date.desc',
            ]);
        });
    }

    /**
     * Manually wipe all cached blog data (e.g. via an admin button or a webhook).
     */
    public function flushCache(): void
    {
        Cache::forget('cms_blog_posts:all');
        // Per-slug and per-category keys expire on their own TTL.
    }
}
```

═══════════════════════════════════════════════════════════════════════════
## STEP 3 — Controller (`app/Http/Controllers/BlogController.php`)
═══════════════════════════════════════════════════════════════════════════

```php
<?php

namespace App\Http\Controllers;

use App\Services\SupabaseCmsService;

class BlogController extends Controller
{
    public function __construct(private SupabaseCmsService $cms) {}

    public function index()
    {
        $posts = $this->cms->getPublishedPosts();
        return view('blog.index', compact('posts'));
    }

    public function show(string $slug)
    {
        $post = $this->cms->getPostBySlug($slug);
        abort_if(!$post, 404);
        return view('blog.show', compact('post'));
    }

    public function category(string $category)
    {
        $posts = $this->cms->getPostsByCategory($category);
        return view('blog.index', [
            'posts'           => $posts,
            'activeCategory'  => $category,
        ]);
    }
}
```

Laravel auto-injects `SupabaseCmsService` via its constructor — no manual
binding or service provider is needed (zero-config resolution).

═══════════════════════════════════════════════════════════════════════════
## STEP 4 — Routes (`routes/web.php`)
═══════════════════════════════════════════════════════════════════════════

Add these. **Order matters:** the category route must be declared BEFORE the
`{slug}` route, otherwise `/blog/category/...` would be captured as a slug.

```php
use App\Http\Controllers\BlogController;

Route::get('/blog', [BlogController::class, 'index'])->name('blog.index');
Route::get('/blog/category/{category}', [BlogController::class, 'category'])->name('blog.category');
Route::get('/blog/{slug}', [BlogController::class, 'show'])->name('blog.show');
```

═══════════════════════════════════════════════════════════════════════════
## STEP 5 — Blade views
═══════════════════════════════════════════════════════════════════════════

These extend `layouts.app`. If your layout file is named differently, change
`@extends('layouts.app')` to match, and adjust the section name if your layout
doesn't use `@yield('content')`. Tailwind classes are used; restyle freely to
match the existing site.

### `resources/views/blog/index.blade.php`
```blade
@extends('layouts.app')

@section('content')
<div class="max-w-6xl mx-auto px-4 py-12">

    <h1 class="text-4xl font-extrabold mb-2">
        {{ isset($activeCategory) ? $activeCategory : 'Blog' }}
    </h1>
    <p class="text-gray-500 mb-10">Latest equipment guides and articles.</p>

    @if(empty($posts))
        <div class="rounded-xl border border-dashed p-12 text-center text-gray-400">
            No posts published yet.
        </div>
    @else
        <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            @foreach($posts as $post)
                <article class="group border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition">
                    @if(!empty($post['featured_image']))
                        <a href="{{ route('blog.show', $post['slug']) }}">
                            <img
                                src="{{ $post['featured_image'] }}"
                                alt="{{ $post['featured_image_alt'] ?? $post['title'] }}"
                                class="w-full h-48 object-cover group-hover:scale-[1.02] transition"
                                loading="lazy"
                            >
                        </a>
                    @endif

                    <div class="p-5">
                        @if(!empty($post['category']))
                            <a href="{{ route('blog.category', $post['category']) }}"
                               class="text-xs font-bold uppercase tracking-widest text-blue-600 hover:underline">
                                {{ $post['category'] }}
                            </a>
                        @endif

                        <h2 class="mt-2 text-xl font-bold leading-snug">
                            <a href="{{ route('blog.show', $post['slug']) }}" class="hover:underline">
                                {{ $post['title'] }}
                            </a>
                        </h2>

                        @if(!empty($post['excerpt']))
                            <p class="mt-2 text-sm text-gray-600 leading-relaxed line-clamp-3">
                                {{ $post['excerpt'] }}
                            </p>
                        @endif

                        <div class="mt-4 flex items-center justify-between text-xs text-gray-400">
                            <span>{{ $post['author'] ?? '' }}</span>
                            <span>{{ $post['publish_date'] ?? '' }}</span>
                        </div>
                    </div>
                </article>
            @endforeach
        </div>
    @endif
</div>
@endsection
```

### `resources/views/blog/show.blade.php`
```blade
@extends('layouts.app')

@section('title', $post['seo_title'] ?: $post['title'])

@push('meta')
    <meta name="description" content="{{ $post['seo_description'] ?: ($post['excerpt'] ?? '') }}">
    <meta property="og:title" content="{{ $post['title'] }}">
    <meta property="og:type" content="article">
    @if(!empty($post['featured_image']))
        <meta property="og:image" content="{{ $post['featured_image'] }}">
    @endif
@endpush

@section('content')
<article class="max-w-3xl mx-auto px-4 py-12">

    @if(!empty($post['category']))
        <p class="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">
            <a href="{{ route('blog.category', $post['category']) }}" class="hover:underline">
                {{ $post['category'] }}
            </a>
        </p>
    @endif

    <h1 class="text-4xl font-extrabold leading-tight mb-4">{{ $post['title'] }}</h1>

    <div class="flex gap-4 text-sm text-gray-500 mb-8 border-b pb-6">
        @if(!empty($post['author']))<span>By {{ $post['author'] }}</span>@endif
        @if(!empty($post['publish_date']))<span>{{ $post['publish_date'] }}</span>@endif
    </div>

    @if(!empty($post['featured_image']))
        <img
            src="{{ $post['featured_image'] }}"
            alt="{{ $post['featured_image_alt'] ?? $post['title'] }}"
            class="w-full rounded-xl mb-8 object-cover max-h-[28rem]"
        >
    @endif

    {{-- Render Markdown body to safe HTML --}}
    <div class="prose prose-lg max-w-none">
        {!! \Illuminate\Support\Str::markdown($post['content'] ?? '') !!}
    </div>

    <div class="mt-12 pt-6 border-t">
        <a href="{{ route('blog.index') }}" class="text-blue-600 font-semibold hover:underline">
            ← Back to all posts
        </a>
    </div>
</article>
@endsection
```

### Markdown notes
- `Str::markdown()` ships with Laravel 9, 10, and 11 — no install needed. It uses
  CommonMark and escapes raw HTML by default, so it is safe against XSS.
- If this project is **Laravel 8 or older**, instead run:
  ```bash
  composer require league/commonmark
  ```
  and replace the render line with:
  ```php
  {!! (new \League\CommonMark\CommonMarkConverter())->convert($post['content'] ?? '') !!}
  ```
- For nice typography, the Tailwind `prose` classes need the Typography plugin.
  If it's not already installed:
  ```bash
  npm install -D @tailwindcss/typography
  ```
  then add `require('@tailwindcss/typography')` to the `plugins` array in
  `tailwind.config.js`. If you don't use Tailwind, just remove the `prose`
  classes — the content will still render.

═══════════════════════════════════════════════════════════════════════════
## STEP 6 — Test locally BEFORE pushing
═══════════════════════════════════════════════════════════════════════════

```bash
php artisan config:clear
php artisan serve
```
Visit `http://127.0.0.1:8000/blog`. You should see a post titled **"adsdada"**.
Click it — the single post page should open at `/blog/dasdada-asdasdas`.

If the list is empty, jump to TROUBLESHOOTING below before pushing.

═══════════════════════════════════════════════════════════════════════════
## STEP 7 — Commit & push to GitHub
═══════════════════════════════════════════════════════════════════════════

```bash
git add config/services.php app/Services/SupabaseCmsService.php \
        app/Http/Controllers/BlogController.php routes/web.php \
        resources/views/blog/

git commit -m "Add Supabase CMS blog integration (read published posts)"
git push origin main      # or your deploy branch
```

Hostinger then pulls the new code automatically.

═══════════════════════════════════════════════════════════════════════════
## STEP 8 — After Hostinger pulls: clear Laravel caches (CRITICAL)
═══════════════════════════════════════════════════════════════════════════

This is the #1 reason a Laravel change "doesn't show up." Laravel caches config
and routes in production. New routes and config will NOT take effect until the
caches are rebuilt. On the Hostinger server (SSH terminal, or Hostinger's
"Terminal" / Git deploy post-command), run:

```bash
composer install --no-dev --optimize-autoloader
php artisan config:clear
php artisan route:clear
php artisan cache:clear
php artisan config:cache
php artisan route:cache
```

If your Hostinger Git deployment supports a "post-deploy command" or build
script, add those lines there so they run automatically on every push.

═══════════════════════════════════════════════════════════════════════════
## TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════

| Symptom | Cause | Fix |
|---|---|---|
| `/blog` is empty | Config cached without Supabase values | `php artisan config:clear` then reload |
| 404 on `/blog` | Routes cached before new routes added | `php artisan route:clear && php artisan route:cache` |
| `/blog/category/x` opens a post 404 | Route order wrong | Category route MUST be declared before `{slug}` route |
| Posts show locally but not on Hostinger | Server didn't rebuild caches | Run all commands in STEP 8 on the server |
| Markdown shows as raw `##` text | Old Laravel without `Str::markdown` | Use the `league/commonmark` snippet |
| Want posts to update faster than 5 min | Cache TTL | Lower `$cacheTtl` in the service, or call `flushCache()` |
| Need to confirm the API itself works | — | Run the curl test below |

### Direct API test (works from any terminal — proves the data is reachable)
```bash
curl "https://kaaekveaaoriacwzzrnf.supabase.co/rest/v1/cms_blog_posts?select=title,slug,status&status=eq.published" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjI5MDMsImV4cCI6MjA5Mzc5ODkwM30.lkh7FN-Mb3_hwlKufGeJrWEROjfVa0C7PQgsyIcZ1OE"
```
Expected output (proves Supabase + key + data are all good):
```json
[{"title":"adsdada","slug":"dasdada-asdasdas","status":"published"}]
```
If this curl returns the post but your Laravel `/blog` page is empty, the problem
is 100% Laravel-side caching (STEP 8), not Supabase.

═══════════════════════════════════════════════════════════════════════════
## RULES — do NOT do these
═══════════════════════════════════════════════════════════════════════════

- Do NOT create a database migration or a local `blog_posts` table.
- Do NOT create an Eloquent model for posts — data is remote, accessed via HTTP.
- Do NOT install any `supabase` PHP SDK — use the built-in `Http` client only.
- Do NOT add write/create/update/delete logic — this site is read-only. Authoring
  happens in the central CMS.
- Do NOT commit a real service-role/secret key. Only the public anon key above is
  permitted in the repo (it is RLS-protected and read-only).

═══════════════════════════════════════════════════════════════════════════
## DEFINITION OF DONE
═══════════════════════════════════════════════════════════════════════════

1. `/blog` lists the post "adsdada".
2. `/blog/dasdada-asdasdas` opens the full article with its Markdown rendered.
3. `/blog/category/<category>` filters by category.
4. Pushed to GitHub and STEP 8 caches rebuilt on Hostinger.
5. Publishing a new post in the central CMS makes it appear here within 5 minutes
   (cache TTL) with no code change or redeploy.
```
