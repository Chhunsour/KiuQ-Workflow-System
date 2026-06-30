<template>
  <div class="cms-home-container" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
    <CmsLockedScreen v-if="auth.isQualityChecker" />

    <template v-else>
      <!-- ── Left Navigator Sidebar ── -->
      <aside class="cms-sidebar">
        <div class="cms-sidebar-header">
          <div class="cms-logo-wrap">
            <div class="cms-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <span class="cms-logo-text">{{ $t('CMS Studio') }}</span>
          </div>
          <button type="button" class="btn-sidebar-toggle" @click="sidebarCollapsed = !sidebarCollapsed" :title="sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'">
            <svg class="chevron-toggle-icon" :class="{ 'collapsed': sidebarCollapsed }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
          </button>
        </div>

        <div class="cms-sidebar-scroll">
          <!-- Action Buttons -->
          <div class="cms-sidebar-actions">
            <button type="button" class="btn-primary btn-sm btn-sidebar-new" :disabled="creatingProduct" @click="onNewProduct">
              {{ $t('+ New Product') }}
            </button>
          </div>

          <!-- Section: Headless Framework Websites -->
          <div class="cms-sidebar-section">
            <div class="cms-section-label">{{ $t('Headless Frameworks') }}</div>
            <ul class="cms-sidebar-list">
              <li
                v-for="w in frameworkWebsites"
                :key="w.id"
                class="cms-sidebar-item"
                :class="{ 'cms-sidebar-item--active': selectedWebsite?.id === w.id }"
                @click="selectWebsite(w)"
              >
                <div class="cms-item-fav-wrap">
                  <img v-if="w.faviconUrl" :src="w.faviconUrl" class="cms-item-fav" alt="" />
                  <span v-else class="cms-item-letter">{{ w.name[0].toUpperCase() }}</span>
                  <span class="cms-item-status-dot" :class="getConnectionStatus(w).dotClass" />
                </div>
                <div class="cms-item-meta">
                  <span class="cms-item-name">{{ w.name }}</span>
                  <span class="cms-item-domain">{{ w.domain }}</span>
                </div>
              </li>
              <li v-if="!frameworkWebsites.length" class="cms-sidebar-empty">
                {{ $t('No headless websites') }}
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- ── Main Workspace ── -->
      <main class="cms-main-stage">
        <!-- ── STATE 1: Studio Overview Dashboard (Selected Website is NULL) ── -->
        <div v-if="!selectedWebsite" class="cms-dashboard-stage">
          <!-- Hero -->
          <header class="cms-hero reveal" style="--d: 0ms">
            <div class="cms-hero-glow" aria-hidden="true" />
            <div class="cms-hero-text">
              <span class="eyebrow cms-hero-eyebrow">{{ $t('Content Management') }}</span>
              <h1 class="cms-hero-title">{{ $t('CMS Studio') }}</h1>
              <p class="cms-hero-sub">
                {{ $t('Select a website to browse, access its admin panel, or copy API keys. Publish products and blog posts here to go live automatically.') }}
              </p>
              <span class="cms-hero-pulse">
                <span class="cms-hero-pulse-dot" />
                {{ $t('Synced with Supabase') }}
              </span>
            </div>
            <div class="cms-hero-actions">
              <button type="button" class="btn-secondary" :disabled="creatingProduct" @click="onNewProduct">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {{ creatingProduct ? 'Creating…' : 'New Product' }}
              </button>
              <!-- Removed '+ New Post' button -->
            </div>
          </header>

          <!-- KPI row -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-1">
            <div
              v-for="(kpi, i) in kpis"
              :key="kpi.key"
              class="kpi reveal"
              :style="`--d: ${80 + i * 70}ms`"
            >
              <div class="flex-1">
                <span class="kpi-label block truncate">{{ kpi.label }}</span>
                <span class="kpi-value block mt-1 truncate">{{ kpi.display }}</span>
              </div>
              <span class="icon-tile" :class="`icon-tile--${kpi.tone}`" v-html="kpi.icon" />
            </div>
          </div>

          <!-- Modules (Products / Blogs) -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <!-- Products -->
            <article class="card card-pad card-hover flex flex-col gap-4 reveal" style="--d: 420ms" @click="go('/cms/products')">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="icon-tile icon-tile--blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                  </span>
                  <div>
                    <span class="eyebrow block">{{ $t('Catalog') }}</span>
                    <h3 class="section-title mt-0.5">{{ $t('Products') }}</h3>
                  </div>
                </div>
                <span class="text-2xl font-bold text-text-soft font-mono">{{ productsStore.products.length }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="badge bg-green-500/10 text-green-600"><span class="badge-dot bg-green-500" />{{ publishedProducts }} live</span>
                <span class="badge bg-gray-500/10 text-text-muted"><span class="badge-dot bg-gray-400" />{{ draftProducts }} drafts</span>
              </div>
              
              <div class="flex flex-col gap-1.5 mt-1">
                <div
                  v-for="p in recentProducts"
                  :key="p.id"
                  class="flex items-center justify-between p-2 rounded-btn hover:bg-soft transition-colors cursor-pointer"
                  @click.stop="go(`/cms/products/${p.id}`)"
                >
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span v-if="p.productImages[0]?.url" class="w-8 h-8 rounded-lg overflow-hidden border border-border flex-shrink-0">
                      <img :src="p.productImages[0].url" :alt="p.productName" class="w-full h-full object-cover" />
                    </span>
                    <span v-else class="w-8 h-8 rounded-lg bg-soft text-primary font-bold text-xs flex items-center justify-center border border-border flex-shrink-0">
                      {{ initials(p.productName) }}
                    </span>
                    <span class="text-sm font-semibold text-text-main truncate">{{ p.productName || 'Untitled' }}</span>
                  </div>
                  <span class="badge text-[10px] px-1.5 py-0.5" :class="p.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-text-muted'">
                    {{ p.status === 'published' ? 'Live' : 'Draft' }}
                  </span>
                </div>
                <div v-if="!recentProducts.length" class="py-4 text-center text-text-muted text-xs italic">
                  {{ $t('No products yet.') }}
                </div>
              </div>

              <div class="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                <span class="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                  {{ $t('Manage Catalog') }}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </span>
                <button type="button" class="btn-secondary py-1 px-3 text-xs rounded-lg" :disabled="creatingProduct" @click.stop="onNewProduct">
                  {{ $t('+ New') }}
                </button>
              </div>
            </article>

            <!-- Blog Posts (Coming Soon) -->
            <article class="card card-pad opacity-60 flex flex-col gap-4 reveal select-none cursor-not-allowed" style="--d: 500ms">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="icon-tile icon-tile--violet">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </span>
                  <div>
                    <span class="eyebrow block">{{ $t('Editorial') }}</span>
                    <h3 class="section-title mt-0.5">{{ $t('Blog Posts') }}</h3>
                  </div>
                </div>
                <span class="text-xs uppercase font-bold tracking-wider text-text-muted">Coming Soon</span>
              </div>
              
              <div class="py-6 text-center text-text-muted text-sm italic">
                {{ $t('The Blog Dashboard is being rebuilt.') }}
              </div>

              <div class="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                <span class="text-xs text-text-muted font-bold flex items-center gap-1">
                  {{ $t('Manage Posts') }}
                </span>
                <button type="button" class="btn-secondary py-1 px-3 text-xs rounded-lg" disabled>
                  {{ $t('+ New') }}
                </button>
              </div>
            </article>
          </div>

          <!-- Bottom Grid (Recent Activity + Connected Websites Cards) -->
          <div class="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4 mt-4 reveal" style="--d: 580ms">
            <!-- Recent activity -->
            <section class="card card-pad">
              <header class="flex items-baseline justify-between border-b border-border pb-3 mb-4">
                <h3 class="section-title">{{ $t('Recently Updated') }}</h3>
                <span class="text-xs text-text-soft">{{ $t('Products &amp; posts') }}</span>
              </header>
              <div v-if="recentActivity.length" class="flex flex-col gap-1.5">
                <div
                  v-for="item in recentActivity"
                  :key="item.id"
                  class="flex items-center justify-between p-2 rounded-btn hover:bg-soft transition-colors cursor-pointer"
                  @click="go(item.to)"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <span class="badge text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-wider shrink-0" :class="item.kind === 'product' ? 'bg-blue-500/10 text-blue-600' : 'bg-purple-500/10 text-purple-600'">
                      {{ item.kind }}
                    </span>
                    <span v-if="item.image" class="w-8 h-8 rounded-lg overflow-hidden border border-border flex-shrink-0">
                      <img :src="item.image" :alt="item.title" class="w-full h-full object-cover" />
                    </span>
                    <span v-else class="w-8 h-8 rounded-lg bg-soft text-primary font-bold text-xs flex items-center justify-center border border-border flex-shrink-0">
                      {{ initials(item.title) }}
                    </span>
                    <span class="text-sm font-semibold text-text-main truncate">{{ item.title || 'Untitled' }}</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="badge text-[10px] px-1.5 py-0.5" :class="item.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-text-muted'">
                      {{ item.status === 'published' ? 'Live' : 'Draft' }}
                    </span>
                    <span class="text-xs text-text-soft font-mono shrink-0">{{ formatRelative(item.updatedAt) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="py-12 text-center text-text-muted text-sm italic">
                {{ loading ? 'Loading content…' : 'Nothing here yet.' }}
              </div>
            </section>

            <!-- Connected websites directory grid cards -->
            <section class="card card-pad">
              <header class="flex items-baseline justify-between border-b border-border pb-3 mb-4">
                <h3 class="section-title">{{ $t('Connected Websites') }}</h3>
                <span class="text-xs text-text-soft">{{ $t('Manage live and admin links') }}</span>
              </header>
              <div v-if="frameworkWebsites.length" class="flex flex-col gap-3">
                <div v-for="w in frameworkWebsites" :key="w.id" class="flex items-center justify-between p-3 rounded-btn border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all">
                  <div class="flex items-center gap-3 min-w-0">
                    <img v-if="w.faviconUrl" :src="w.faviconUrl" class="w-7 h-7 rounded-md object-cover border border-border flex-shrink-0" alt="" />
                    <span v-else class="w-7 h-7 rounded-md bg-primary-soft text-primary font-bold text-xs flex items-center justify-center border border-border flex-shrink-0">{{ w.name[0].toUpperCase() }}</span>
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-text-main truncate">{{ w.name }}</span>
                        <span class="badge-framework-tag">{{ $t('Headless') }}</span>
                      </div>
                      <span class="text-xs text-primary hover:underline truncate block cursor-pointer" @click.stop="openInBrowser(w, 'live')">{{ w.domain }}</span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <span class="cms-status-badge text-[10px] font-bold px-1.5 py-0.5 rounded-full" :class="getConnectionStatus(w).dotClass">
                      <span class="cms-status-dot" /> {{ getConnectionStatus(w).text }}
                    </span>
                    <button type="button" class="btn-primary py-1 px-2.5 text-xs rounded-lg" @click="openInBrowser(w, 'live')">
                      {{ $t('Live') }}
                    </button>
                    <button type="button" class="btn-secondary py-1 px-2.5 text-xs rounded-lg" @click="openInBrowser(w, 'admin')">
                      {{ $t('Admin') }}
                    </button>
                    <button type="button" class="p-1 flex items-center justify-center hover:bg-soft rounded-lg transition-colors text-text-muted hover:text-text-main" @click="activeSetupWebsite = w" :title="$t('API Keys')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="py-12 text-center text-text-muted text-sm italic">
                <p>{{ $t('No websites registered.') }}</p>
                <RouterLink to="/websites/new" class="btn-secondary py-1 px-3 text-xs rounded-lg mt-2 inline-block">
                  {{ $t('+ Add Website') }}
                </RouterLink>
              </div>
            </section>
          </div>
        </div>

        <!-- ── STATE 2: Embedded App Browser Workspace (Selected Website is NOT NULL) ── -->
        <div v-else class="cms-browser-stage">
          <!-- Browser Toolbar -->
          <div class="app-browser-toolbar">
            <button type="button" class="btn-browser-action btn-browser-close" @click="closeBrowser" :title="$t('Close Workspace (Esc)')">
              ×
            </button>

            <!-- Navigation Controls -->
            <div class="browser-nav-group">
              <button type="button" class="btn-browser-action" @click="resetToHome" :title="$t('Home')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </button>
              <button type="button" class="btn-browser-action" @click="reloadIframe" :title="$t('Reload View (F5)')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              </button>
            </div>

            <!-- View Mode Switcher -->
            <div class="browser-mode-tabs">
              <button
                type="button"
                class="browser-mode-tab"
                :class="{ 'active': activeBrowserMode === 'live' }"
                @click="activeBrowserMode = 'live'"
              >
                {{ $t('Live View') }}
              </button>
              <div class="browser-mode-tab-split">
                <button
                  type="button"
                  class="browser-mode-tab"
                  :class="{ 'active': activeBrowserMode === 'admin' }"
                  @click="activeBrowserMode = 'admin'"
                >
                  {{ $t('Admin Panel') }}
                </button>
                <button type="button" class="btn-edit-admin-path" @click="toggleEditAdminPath" :title="$t('Edit Admin Path')">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                </button>
              </div>
            </div>

            <!-- Custom Admin Path Edit Popover -->
            <Transition name="fade">
              <div v-if="editAdminPath" class="admin-path-popover">
                <label class="popover-label">{{ $t('Configure Admin Route Path:') }}</label>
                <div class="popover-row">
                  <input v-model="adminPathInput" type="text" class="input input-sm popover-input" :placeholder="$t('/admin')" @keyup.enter="saveAdminPath" />
                  <button type="button" class="btn-primary btn-sm" @click="saveAdminPath">{{ $t('Save') }}</button>
                </div>
              </div>
            </Transition>

            <!-- SSL & Address Bar -->
            <div class="browser-address-bar">
              <span class="ssl-lock" :title="$t('Connection Secured (SSL)')" style="display: flex; align-items: center; justify-content: center; color: #16a34a;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input type="text" readonly :value="currentBrowserUrl" class="browser-url-input" />
              <button type="button" class="btn-address-copy flex items-center justify-center gap-1 min-w-[70px]" @click="copyText(currentBrowserUrl, 'url')" :title="$t('Copy URL')">
                <Transition name="scale-fade" mode="out-in">
                  <span v-if="copiedField === 'url'" class="flex items-center gap-1 text-green-500 font-bold">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>{{ $t('Copied') }}</span>
                  </span>
                  <span v-else class="flex items-center gap-1 text-primary">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>{{ $t('Copy') }}</span>
                  </span>
                </Transition>
              </button>
            </div>

            <!-- Responsive Device Selectors -->
            <div class="browser-device-toggles">
              <button type="button" class="btn-device-toggle" :class="{ 'active': activeDevice === 'desktop' }" @click="activeDevice = 'desktop'" :title="$t('Desktop Preview')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                <span class="device-label">{{ $t('Desktop') }}</span>
              </button>
              <button type="button" class="btn-device-toggle" :class="{ 'active': activeDevice === 'tablet' }" @click="activeDevice = 'tablet'" :title="$t('Tablet Preview')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <span class="device-label">{{ $t('Tablet') }}</span>
              </button>
              <button type="button" class="btn-device-toggle" :class="{ 'active': activeDevice === 'mobile' }" @click="activeDevice = 'mobile'" :title="$t('Mobile Preview')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                <span class="device-label">{{ $t('Mobile') }}</span>
              </button>
            </div>

            <!-- Context Actions -->
            <div class="browser-utility-group">
              <button v-if="selectedWebsite.isFramework" type="button" class="btn-browser-action" :class="{ 'active': showCredsDrawer }" @click="showCredsDrawer = !showCredsDrawer" :title="$t('View Supabase Keys')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
                {{ $t('Credentials') }}
              </button>
              <button type="button" class="btn-browser-action btn-open-external" @click="openExternally" :title="$t('Open in System Browser')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                {{ $t('Open External') }}
              </button>
            </div>
          </div>

          <!-- Credentials Copy Drawer -->
          <Transition name="slide-down">
            <div v-if="showCredsDrawer && selectedWebsite.isFramework" class="browser-creds-drawer">
              <div class="creds-drawer-content">
                <div class="creds-field">
                  <span class="creds-label">{{ $t('SUPABASE_WEBSITE_ID:') }}</span>
                  <code class="creds-code">{{ selectedWebsite.id }}</code>
                  <button type="button" class="btn-secondary btn-xs btn-creds-copy min-w-[76px]" @click="copyText(selectedWebsite.id, 'drawerId')">
                    <Transition name="scale-fade" mode="out-in">
                      <span v-if="copiedField === 'drawerId'" class="flex items-center justify-center gap-1 text-green-500 font-bold">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>{{ $t('Copied') }}</span>
                      </span>
                      <span v-else class="flex items-center justify-center gap-1">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>{{ $t('Copy') }}</span>
                      </span>
                    </Transition>
                  </button>
                </div>
                <div class="creds-status-ping-row">
                  <span class="creds-label">{{ $t('Status check:') }}</span>
                  <span class="cms-status-badge" :class="getConnectionStatus(selectedWebsite).dotClass">
                    <span class="cms-status-dot" /> {{ getConnectionStatus(selectedWebsite).text }}
                  </span>
                  <button type="button" class="btn-secondary btn-xs" :disabled="testingConnection" @click="testConnection(selectedWebsite.id)">
                    {{ testingConnection ? 'Sending ping…' : 'Send Test Ping' }}
                  </button>
                  <span v-if="testResult" :style="{ color: testResult.success ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: '0.74rem', marginLeft: '0.5rem' }">
                    {{ testResult.message }}
                  </span>
                </div>
              </div>
            </div>
          </Transition>

          <!-- Iframe Viewport Container -->
          <div class="browser-viewport-stage" :class="'device-' + activeDevice">
            <!-- Simulated YouTube-Style Load Bar -->
            <div v-if="loadingIframe" class="iframe-load-bar" />

            <!-- CSP Warning Bar -->
            <div v-if="!cspNoticeDismissed" class="csp-notice-banner flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-amber-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span class="text-xs text-text-muted">
                  <strong>{{ $t('Security Note:') }}</strong> {{ $t('If the website refuses to load or shows a blank page, it is blocked by security frame headers (X-Frame-Options/CSP). Click the') }} <a href="#" @click.prevent="openExternally" class="inline-flex items-center gap-1 font-bold text-primary hover:underline">{{ $t('Open External') }} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="inline"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a> {{ $t('button in the toolbar to access it.') }}
                </span>
              </div>
              <button type="button" class="btn-dismiss-csp hover:text-text-main text-text-soft" @click="cspNoticeDismissed = true" :title="$t('Dismiss note')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- Resizing Device Viewport wrapper -->
            <div class="device-frame-container" :class="`frame-${activeDevice}`">
              <!-- Tablet/Mobile Screen bezel mockup -->
              <div v-if="activeDevice !== 'desktop'" class="device-mockup-bezel">
                <div class="device-bezel-camera"></div>
                <div class="device-bezel-speaker"></div>
              </div>

              <div class="device-frame-inner">
                <iframe
                  v-if="currentBrowserUrl"
                  :key="iframeKey"
                  :src="currentBrowserUrl"
                  class="browser-iframe"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  @load="onIframeLoaded"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Setup Guide Modal -->
      <Transition name="modal-zoom">
        <div v-if="activeSetupWebsite" class="modal-overlay" @click="activeSetupWebsite = null">
          <div class="modal-card" @click.stop>
            <header class="modal-header">
              <div class="modal-title-wrap">
                <img v-if="activeSetupWebsite.faviconUrl" :src="activeSetupWebsite.faviconUrl" class="modal-fav" alt="" />
                <h3 class="modal-title">Connect {{ activeSetupWebsite.name }}</h3>
              </div>
              <button type="button" class="modal-close" @click="activeSetupWebsite = null">×</button>
            </header>

            <div class="modal-body">
              <p class="modal-desc">
                {{ $t('Copy this Website ID into your framework website\'s environment configuration (usually the') }} <code>{{ $t('.env') }}</code> {{ $t('file) as') }} <code>{{ $t('SUPABASE_WEBSITE_ID') }}</code> {{ $t('to link it to the CMS.') }}
              </p>

              <div class="modal-copy-field">
                <label class="modal-copy-label">{{ $t('SUPABASE_WEBSITE_ID') }}</label>
                <div class="modal-copy-row">
                  <input type="text" readonly :value="activeSetupWebsite.id" class="input modal-copy-input" />
                  <button type="button" class="btn-secondary modal-copy-btn min-w-[84px]" @click="copyText(activeSetupWebsite.id, 'id')">
                    <Transition name="scale-fade" mode="out-in">
                      <span v-if="copiedField === 'id'" class="flex items-center justify-center gap-1 text-green-500 font-bold">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>{{ $t('Copied') }}</span>
                      </span>
                      <span v-else class="flex items-center justify-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        <span>{{ $t('Copy') }}</span>
                      </span>
                    </Transition>
                  </button>
                </div>
              </div>

              <div class="modal-guide-note" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div>
                  <strong>{{ $t('Test the connection:') }}</strong>
                  <p style="margin-top: 0.15rem; font-size: 0.76rem;">{{ $t('Send a test connection ping to the CMS to verify the website is reachable.') }}</p>
                </div>
                <button type="button" class="btn-secondary btn-sm" :disabled="testingConnection" @click="testConnection(activeSetupWebsite.id)">
                  {{ testingConnection ? 'Sending ping…' : 'Send Test Connection Ping' }}
                </button>
                <p v-if="testResult" :style="{ color: testResult.success ? '#16a34a' : '#dc2626', fontWeight: 700, margin: 0, fontSize: '0.76rem' }">
                  {{ testResult.message }}
                </p>
              </div>

              <div class="modal-guide-note">
                <strong>{{ $t('First time setup?') }}</strong>
                <p>{{ $t('Refer to your project\'s integration documentation in') }} <code>{{ $t('docs/AI-PROMPT-LARAVEL.md') }}</code> {{ $t('for step-by-step instructions on setting up your routes, controllers, and services.') }}</p>
              </div>
            </div>

            <footer class="modal-foot">
              <button type="button" class="btn-primary" style="width: 100%;" @click="activeSetupWebsite = null">{{ $t('Got it') }}</button>
            </footer>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import CmsLockedScreen from '@/components/cms/CmsLockedScreen.vue';
import { useCmsProductsStore } from '@/stores/cmsProducts';
import { useDataStore, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { usePageRealtime } from '@/services/realtimeService';
import { supabase } from '@/lib/supabase';

usePageRealtime(['cms_products', 'websites']);

const router        = useRouter();
const productsStore = useCmsProductsStore();
const dataStore     = useDataStore();
const auth          = useAuthStore();

const creatingProduct = ref(false);
const loading         = ref(false);
const activeSetupWebsite = ref<Website | null>(null);
const copiedField = ref<string | null>(null);

const testingConnection = ref(false);
const testResult = ref<{ success: boolean; message: string } | null>(null);

// Browser Workspace States
const selectedWebsite = ref<Website | null>(null);
const activeDevice = ref<'desktop' | 'tablet' | 'mobile'>('desktop');
const activeBrowserMode = ref<'live' | 'admin'>('live');
const sidebarCollapsed = ref(false);
const editAdminPath = ref(false);
const adminPathInput = ref('/admin');
const iframeKey = ref(0);
const showCredsDrawer = ref(false);
const loadingIframe = ref(false);

const cspNoticeDismissed = ref(localStorage.getItem('cms_dismissed_csp_notice') === 'true');
watch(cspNoticeDismissed, (val) => {
  localStorage.setItem('cms_dismissed_csp_notice', String(val));
});

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

onMounted(async () => {
  if (auth.isQualityChecker) return;
  loading.value = true;
  try {
    await Promise.all([
      productsStore.fetchProducts(),
      dataStore.fetchWebsites()
    ]);
  } finally {
    loading.value = false;
  }

  // Keyboard shortcut listener to exit browser (Esc)
  window.addEventListener('keydown', handleGlobalKey);
});

const handleGlobalKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && selectedWebsite.value) {
    closeBrowser();
  }
};

const frameworkWebsites = computed(() => {
  return dataStore.websites.filter((w) => w.isFramework);
});

const wordpressWebsites = computed(() => {
  return dataStore.websites.filter((w) => !w.isFramework);
});

const copyText = async (text: string, field: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedField.value = field;
    setTimeout(() => {
      if (copiedField.value === field) copiedField.value = null;
    }, 2000);
  } catch {
    /* clipboard blocked */
  }
};

const getConnectionStatus = (w: Website) => {
  if (!w.lastAccessedAt) return { text: 'Not Connected', dotClass: 'dot--gray' };
  const lastActive = new Date(w.lastAccessedAt).getTime();
  const diffMinutes = (Date.now() - lastActive) / 1000 / 60;
  if (diffMinutes <= 15) {
    return { text: 'Connected (Active)', dotClass: 'dot--green' };
  } else if (diffMinutes <= 1440) {
    return { text: 'Inactive (Idle)', dotClass: 'dot--orange' };
  } else {
    return { text: 'Disconnected', dotClass: 'dot--red' };
  }
};

const testConnection = async (websiteId: string) => {
  testingConnection.value = true;
  testResult.value = null;
  try {
    const { error: err } = await supabase.rpc('ping_website', { p_website_id: websiteId });
    if (err) {
      testResult.value = { success: false, message: `Ping failed: ${err.message}` };
    } else {
      testResult.value = { success: true, message: 'Ping successful!' };
      await dataStore.fetchWebsites(true);
    }
  } catch (err: any) {
    testResult.value = { success: false, message: `Ping failed: ${err.message || err}` };
  } finally {
    testingConnection.value = false;
  }
};

watch(activeSetupWebsite, () => {
  testResult.value = null;
});

// Browser Navigation Actions
const onIframeLoaded = () => {
  loadingIframe.value = false;
};

const selectWebsite = (w: Website) => {
  selectedWebsite.value = w;
  sidebarCollapsed.value = true;
  loadingIframe.value = true;
};

const openInBrowser = (w: Website, mode: 'live' | 'admin') => {
  selectedWebsite.value = w;
  activeBrowserMode.value = mode;
  sidebarCollapsed.value = true;
  loadingIframe.value = true;
};

const closeBrowser = () => {
  selectedWebsite.value = null;
  sidebarCollapsed.value = false;
  loadingIframe.value = false;
};

const resetToHome = () => {
  activeBrowserMode.value = 'live';
  iframeKey.value++;
  loadingIframe.value = true;
};

const reloadIframe = () => {
  iframeKey.value++;
  loadingIframe.value = true;
};

// Admin Path Management
const getAdminPath = (wId: string) => {
  return localStorage.getItem(`cms_admin_path_${wId}`) || '/admin';
};

const toggleEditAdminPath = () => {
  editAdminPath.value = !editAdminPath.value;
};

const saveAdminPath = () => {
  if (!selectedWebsite.value) return;
  let path = adminPathInput.value.trim();
  if (path && !path.startsWith('/')) {
    path = '/' + path;
  }
  localStorage.setItem(`cms_admin_path_${selectedWebsite.value.id}`, path);
  editAdminPath.value = false;
  iframeKey.value++;
  loadingIframe.value = true;
};

const openExternally = () => {
  if (currentBrowserUrl.value) {
    window.open(currentBrowserUrl.value, '_blank');
  }
};

// Computed Live Iframe URL
const currentBrowserUrl = computed(() => {
  if (!selectedWebsite.value) return '';
  let domain = selectedWebsite.value.domain.trim();
  if (!domain.startsWith('http://') && !domain.startsWith('https://')) {
    domain = 'https://' + domain;
  }
  if (activeBrowserMode.value === 'admin') {
    const path = getAdminPath(selectedWebsite.value.id);
    return domain.replace(/\/+$/, '') + (path.startsWith('/') ? path : '/' + path);
  }
  return domain;
});

watch(currentBrowserUrl, () => {
  if (selectedWebsite.value) {
    loadingIframe.value = true;
  }
  activeSetupWebsite.value = null;
  testResult.value = null;
});

// ── Counts ───────────────────────────────────────────────────────────
const publishedProducts = computed(() => productsStore.products.filter((p) => p.status === 'published').length);
const draftProducts     = computed(() => productsStore.products.filter((p) => p.status === 'draft').length);
const totalLive         = computed(() => publishedProducts.value);

// ── Count-up animation ───────────────────────────────────────────────
const createCounter = (source: () => number) => {
  const display = ref(0);
  watch(source, (to) => {
    if (prefersReducedMotion) { display.value = to; return; }
    const from = display.value;
    if (from === to) return;
    const start = performance.now();
    const dur = 850;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      display.value = Math.round(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { immediate: true });
  return display;
};

const productsCount = createCounter(() => productsStore.products.length);
const liveCount     = createCounter(() => totalLive.value);
const draftCount    = createCounter(() => draftProducts.value);

const kpis = computed(() => [
  {
    key: 'products', label: 'Products', tone: 'blue', display: productsCount.value,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
  },
  {
    key: 'live', label: 'Published Live', tone: 'green', display: liveCount.value,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  },
  {
    key: 'drafts', label: 'Drafts', tone: 'slate', display: draftCount.value,
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  },
]);

// ── Recent lists ─────────────────────────────────────────────────────
const recentProducts = computed(() =>
  [...productsStore.products].sort(byUpdated).slice(0, 3)
);

interface ActivityItem {
  id: string; kind: 'product'; title: string;
  status: string; updatedAt: string; image: string | null; to: string;
}
const recentActivity = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [
    ...productsStore.products.map((p) => ({
      id: `prod-${p.id}`, kind: 'product' as const, title: p.productName,
      status: p.status, updatedAt: p.updatedAt, image: p.productImages[0]?.url ?? null,
      to: `/cms/products/${p.id}`,
    })),
  ];
  return items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4);
});

const byUpdated = (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0] ?? '').join('').toUpperCase() || '?';

const formatRelative = (iso: string): string => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const go = (to: string) => { void router.push(to); };

const onNewProduct = async () => {
  if (creatingProduct.value) return;
  creatingProduct.value = true;
  try {
    const p = await productsStore.createProduct({ productName: 'Untitled product', slug: '', status: 'draft' });
    if (p) await router.push(`/cms/products/${p.id}`);
  } finally {
    creatingProduct.value = false;
  }
};
</script>

<style scoped>
/* ── Main Layout ── */
.cms-home-container {
  display: flex;
  height: 100%;
  width: 100%;
  margin: 0;
  overflow: hidden;
  background: var(--bg);
}

/* ── Collapsible Left Sidebar ── */
.cms-sidebar {
  width: 250px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-collapsed .cms-sidebar {
  width: 68px;
}

.cms-sidebar-header {
  height: 56px;
  padding: 0 0.85rem 0 1.15rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  overflow: hidden;
}
.sidebar-collapsed .cms-sidebar-header {
  padding: 0;
  justify-content: center;
}
.cms-logo-wrap {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  white-space: nowrap;
}
.sidebar-collapsed .cms-logo-text {
  opacity: 0;
  max-width: 0;
}
.cms-logo-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%);
  color: #f8fbff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-primary);
}
.cms-logo-text {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: -0.015em;
  color: var(--text-main);
  transition: opacity 0.25s ease, max-width 0.25s ease;
  opacity: 1;
  max-width: 150px;
  overflow: hidden;
}
.chevron-toggle-icon {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.chevron-toggle-icon.collapsed {
  transform: rotate(180deg);
}
.btn-sidebar-toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.btn-sidebar-toggle:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}

.cms-sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.85rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.sidebar-collapsed .cms-sidebar-scroll {
  padding: 0.85rem 0.35rem;
}
.cms-sidebar-actions {
  display: flex;
  gap: 0.4rem;
}
.sidebar-collapsed .cms-sidebar-actions {
  display: none;
}

.cms-sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.cms-section-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
  padding-left: 0.55rem;
}
.sidebar-collapsed .cms-section-label {
  display: none;
}
.cms-sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.cms-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.55rem;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cms-sidebar-item:hover {
  background: var(--soft-bg);
}
.cms-sidebar-item:active {
  transform: scale(0.96);
}
.cms-sidebar-item--active {
  background: var(--primary-soft);
  border-left: 3px solid var(--primary);
  box-shadow: inset 2px 0 6px rgba(21, 214, 194, 0.06);
  font-weight: 700;
  transform: scale(1.02);
}
.sidebar-collapsed .cms-sidebar-item {
  justify-content: center;
  padding: 0.45rem 0;
}
.cms-item-fav-wrap {
  position: relative;
  width: 1.85rem;
  height: 1.85rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cms-item-fav {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--border);
  background: var(--bg);
}
.cms-item-letter {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  background: var(--soft-bg);
  color: var(--primary);
  font-weight: 900;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
}
.cms-item-status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 7.5px;
  height: 7.5px;
  border-radius: 50%;
  border: 1.5px solid var(--sidebar-bg);
}
.cms-item-status-dot.dot--green  { background: #16a34a; }
.cms-item-status-dot.dot--orange { background: #d97706; }
.cms-item-status-dot.dot--red    { background: #dc2626; }
.cms-item-status-dot.dot--gray   { background: #64748b; }

.cms-item-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.sidebar-collapsed .cms-item-meta {
  display: none;
}
.cms-item-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-item-domain {
  font-size: 0.65rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-sidebar-empty {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
  padding-left: 0.55rem;
}

/* ── Main Workspace Stage ── */
.cms-main-stage {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}

.cms-dashboard-stage {
  flex: 1;
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* ── STATE 2: Browser Stage ── */
.cms-browser-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg);
}

/* Browser Toolbar */
.app-browser-toolbar {
  height: 48px;
  background: var(--topbar-bg);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 0.85rem;
  gap: 0.65rem;
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}
.btn-browser-action {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.35rem 0.55rem;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.76rem;
  font-weight: 700;
  transition: background 0.15s, color 0.15s;
}
.btn-browser-action:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}
.btn-browser-action.active {
  background: var(--primary-soft);
  color: var(--primary);
}
.btn-browser-close {
  font-size: 1.35rem;
  padding: 0.15rem 0.5rem;
  color: #ef4444;
  font-weight: 400;
}
.btn-browser-close:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
.browser-nav-group {
  display: flex;
  gap: 0.2rem;
}

/* View Mode Tabs */
.browser-mode-tabs {
  display: flex;
  background: var(--soft-bg);
  border-radius: 8px;
  padding: 0.18rem;
  border: 1px solid var(--border);
}
.browser-mode-tab {
  background: none;
  border: none;
  padding: 0.28rem 0.65rem;
  border-radius: 6px;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.browser-mode-tab.active {
  background: var(--card-bg);
  color: var(--text-main);
  box-shadow: var(--shadow-sm);
}
.browser-mode-tab-split {
  display: flex;
  align-items: center;
}
.btn-edit-admin-path {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.28rem 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  border-radius: 6px;
  margin-left: 0.1rem;
}
.btn-edit-admin-path:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}

/* Admin Path Edit Popover */
.admin-path-popover {
  position: absolute;
  top: 52px;
  left: 170px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.popover-label {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
}
.popover-row {
  display: flex;
  gap: 0.35rem;
}
.popover-input {
  width: 140px;
  background: var(--input-bg) !important;
  color: var(--text-main) !important;
  border-color: var(--border) !important;
  font-family: monospace;
}

/* SSL lock & Address bar */
.browser-address-bar {
  flex: 1;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 0.55rem;
  gap: 0.4rem;
  min-width: 150px;
  max-width: 480px;
}
.ssl-lock {
  font-size: 0.75rem;
  flex-shrink: 0;
}
.browser-url-input {
  background: none;
  border: none;
  color: var(--text-main);
  font-size: 0.76rem;
  font-family: monospace;
  width: 100%;
  outline: none;
}
.btn-address-copy {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  flex-shrink: 0;
}
.btn-address-copy:hover {
  text-decoration: underline;
}

/* Device toggles */
.browser-device-toggles {
  display: flex;
  background: var(--soft-bg);
  border-radius: 8px;
  padding: 0.18rem;
  border: 1px solid var(--border);
  gap: 0.15rem;
}
.btn-device-toggle {
  background: none;
  border: none;
  padding: 0.28rem 0.5rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: background 0.15s, color 0.15s;
}
.btn-device-toggle.active {
  background: var(--card-bg);
  color: var(--text-main);
  box-shadow: var(--shadow-sm);
}
@media (max-width: 1000px) {
  .device-label { display: none; }
}

.browser-utility-group {
  display: flex;
  gap: 0.35rem;
}
.btn-open-external {
  color: var(--primary);
}

/* Credentials Drawer */
.browser-creds-drawer {
  background: var(--sidebar-bg);
  border-bottom: 1px solid var(--border);
  padding: 0.55rem 0.95rem;
  z-index: 9;
  box-shadow: var(--shadow-sm);
}
.creds-drawer-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.15rem;
}
.creds-field {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
.creds-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
}
.creds-code {
  font-family: monospace;
  font-size: 0.78rem;
  background: var(--soft-bg);
  color: var(--primary);
  padding: 0.15rem 0.4rem;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.btn-creds-copy {
  padding: 0.15rem 0.45rem;
  font-size: 0.68rem;
}
.creds-status-ping-row {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

/* Browser Viewport Stage */
.browser-viewport-stage {
  flex: 1;
  overflow: auto;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: radial-gradient(circle at center, var(--soft-bg) 0%, var(--bg) 100%);
}
.browser-viewport-stage.device-desktop {
  padding: 0;
}
.browser-viewport-stage.device-desktop .device-frame-container {
  width: 100%;
  height: 100%;
  flex: 1;
}

.csp-notice-banner {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-left: 4px solid #d97706; /* amber warning accent */
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  margin-bottom: 0.75rem;
  max-width: 800px;
  box-shadow: var(--shadow-sm);
}
.btn-dismiss-csp {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;
}
.btn-dismiss-csp:hover {
  background: var(--border);
}
.csp-notice-banner a {
  color: var(--primary);
  text-decoration: none;
}
.csp-notice-banner a:hover {
  text-decoration: underline;
}

/* Device Viewports & Bezels */
.device-frame-container {
  background: var(--card-elevated-bg);
  box-shadow: var(--shadow-lg);
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1), height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Desktop Sizing */
.frame-desktop {
  width: 100%;
  height: 100%;
  border-radius: 0;
}
.frame-desktop .device-frame-inner {
  height: 100%;
  border-radius: 0;
}

/* Tablet Sizing Mockup */
.frame-tablet {
  width: 768px;
  height: 90%;
  max-height: 1024px;
  border-radius: 28px;
  padding: 24px 18px;
  background: var(--sidebar-bg);
  border: 4px solid var(--border-strong);
  box-sizing: content-box;
}
.frame-tablet .device-frame-inner {
  height: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.frame-tablet .device-mockup-bezel {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.frame-tablet .device-bezel-camera {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--border-strong);
}

/* Mobile Sizing Mockup */
.frame-mobile {
  width: 375px;
  height: 90%;
  max-height: 750px;
  border-radius: 40px;
  padding: 34px 20px;
  background: var(--sidebar-bg);
  border: 5px solid var(--border-strong);
  box-sizing: content-box;
}
.frame-mobile .device-frame-inner {
  height: 100%;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.frame-mobile .device-mockup-bezel {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.frame-mobile .device-bezel-camera {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--border-strong);
}
.frame-mobile .device-bezel-speaker {
  width: 45px;
  height: 4px;
  border-radius: 99px;
  background: var(--border-strong);
}

.device-frame-inner {
  width: 100%;
  background: var(--bg);
}
.browser-iframe {
  width: 100%;
  height: 100%;
  border: none;
  background: var(--bg-page);
}

/* Glassmorphic tags in website cards */
.cms-dashboard-site-card {
  transition: border-color 0.15s, box-shadow 0.15s;
  border: 1px solid var(--border);
}
.cms-dashboard-site-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}
.cms-site-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.badge-framework-tag {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.badge-wp-tag {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  letter-spacing: 0.02em;
}
.cms-site-card-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}
.btn-icon-dots {
  background: none;
  border: none;
  font-size: 0.95rem;
  cursor: pointer;
  padding: 0.15rem 0.3rem;
  border-radius: 6px;
}
.btn-icon-dots:hover {
  background: var(--soft-bg);
}

/* icon tiles for tone override */
.icon-tile--blue { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
.icon-tile--violet { background: rgba(124, 92, 252, 0.12); color: #7c5cfc; }
.icon-tile--green { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
.icon-tile--slate { background: var(--soft-bg); color: var(--text-muted); }

/* Animations */
.fade-enter-active, .fade-leave-active { transition: opacity 0.18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-down-enter-active, .slide-down-leave-active { transition: transform 0.22s ease, opacity 0.22s ease; }
.slide-down-enter-from, .slide-down-leave-to { transform: translateY(-15px); opacity: 0; }

/* Scale Fade Transition (for copy checkmarks) */
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.scale-fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

/* Modal Zoom Spring Transition */
.modal-zoom-enter-active,
.modal-zoom-leave-active {
  transition: opacity 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-zoom-enter-active .modal-card,
.modal-zoom-leave-active .modal-card {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-zoom-enter-from {
  opacity: 0;
}
.modal-zoom-enter-from .modal-card {
  transform: scale(0.9) translateY(15px);
}

.modal-zoom-leave-to {
  opacity: 0;
}
.modal-zoom-leave-to .modal-card {
  transform: scale(0.95) translateY(10px);
}

/* Iframe Simulated Progress Bar */
.iframe-load-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary) 0%, #10b981 50%, var(--primary) 100%);
  background-size: 200% 100%;
  animation: load-bar-shimmer 1.5s infinite linear, load-bar-progress 4s forwards cubic-bezier(0.1, 0.8, 0.1, 1);
  z-index: 15;
}

@keyframes load-bar-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@keyframes load-bar-progress {
  0% { width: 0%; }
  100% { width: 95%; }
}

/* Tactile button presses scale */
.btn-primary:active,
.btn-secondary:active,
.btn-sidebar-new:active,
.btn-device-toggle:active,
.browser-mode-tab:active,
.btn-browser-action:active,
.btn-edit-admin-path:active,
.btn-dismiss-csp:active,
.modal-close:active {
  transform: scale(0.97) !important;
}

/* Pulsing Status Dot Animations */
.cms-item-status-dot.dot--green,
.cms-status-dot.dot--green,
.cms-status-badge.dot--green .cms-status-dot {
  box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6);
  animation: dot-pulse-green 2s infinite;
}
@keyframes dot-pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.6); }
  70% { box-shadow: 0 0 0 5px rgba(22, 163, 74, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}

/* Sweeping Metallic Glare on Hover cards */
.card-hover {
  position: relative;
  overflow: hidden;
}
.card-hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: -150%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(248, 251, 255, 0.08) 30%,
    rgba(248, 251, 255, 0.2) 50%,
    rgba(248, 251, 255, 0.08) 70%,
    transparent 100%
  );
  transform: skewX(-25deg);
  pointer-events: none;
  transition: none;
}
:root[data-theme='dark-gray'] .card-hover::before {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(248, 251, 255, 0.02) 30%,
    rgba(248, 251, 255, 0.06) 50%,
    rgba(248, 251, 255, 0.02) 70%,
    transparent 100%
  );
}
.card-hover:hover::before {
  left: 150%;
  transition: left 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.card-hover:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border)) !important;
  box-shadow: 0 10px 25px rgba(21, 214, 194, 0.1) !important;
  transform: translateY(-4px) !important;
}
:root[data-theme='dark-gray'] .card-hover:hover {
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35), 0 0 20px rgba(21, 214, 194, 0.15) !important;
}

/* ── Standard CSS styles from original code ── */
.cms-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 20px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--primary) 6%, var(--card-bg)) 0%,
      var(--card-bg) 100%);
  padding: 1.7rem 1.6rem;
  box-shadow: var(--shadow-sm);
}
.cms-hero-glow {
  position: absolute;
  top: -55%;
  right: -10%;
  width: 26rem;
  height: 26rem;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 18%, transparent) 0%, transparent 68%);
  filter: blur(8px);
  pointer-events: none;
  animation: cms-drift 16s ease-in-out infinite;
}
@keyframes cms-drift {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.85; }
  50%      { transform: translate(-2.5rem, 1.5rem) scale(1.08); opacity: 1; }
}
.cms-hero-text { position: relative; z-index: 1; min-width: 0; }
.cms-hero-eyebrow { color: var(--primary); opacity: 0.9; }
.cms-hero-title {
  margin: 0.35rem 0 0;
  font-size: clamp(1.7rem, 3.4vw, 2.4rem);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.02;
  color: var(--text-main);
}
.cms-hero-sub {
  margin: 0.55rem 0 0;
  max-width: 34rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-muted);
}
.cms-hero-pulse {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.9rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
}
.cms-hero-pulse-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #16a34a;
  box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5);
  animation: cms-ping 2s ease-in-out infinite;
}
@keyframes cms-ping {
  0%   { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.45); }
  70%  { box-shadow: 0 0 0 7px rgba(22, 163, 74, 0); }
  100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
}
.cms-hero-actions { position: relative; z-index: 1; display: inline-flex; gap: 0.55rem; flex-wrap: wrap; }

.cms-kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
}
@media (max-width: 760px) { .cms-kpis { grid-template-columns: repeat(2, 1fr); } }
.cms-kpi {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.95rem 1rem;
  box-shadow: var(--shadow-sm);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}
.cms-kpi:hover {
  border-color: color-mix(in srgb, var(--primary) 24%, var(--border));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
.cms-kpi-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.cms-kpi-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem; height: 2rem;
  border-radius: 9px;
}
.cms-kpi-icon--blue   { background: color-mix(in srgb, #15D6C2 14%, transparent); color: #15D6C2; }
.cms-kpi-icon--violet { background: color-mix(in srgb, #7c5cfc 15%, transparent); color: #7c5cfc; }
.cms-kpi-icon--green  { background: color-mix(in srgb, #16a34a 14%, transparent); color: #16a34a; }
.cms-kpi-icon--slate  { background: var(--soft-bg); color: var(--text-muted); }
.cms-kpi-value {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}
.cms-kpi-label { display: block; margin-top: 0.5rem; font-size: 0.78rem; color: var(--text-muted); }

.cms-modules {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
}
@media (max-width: 860px) { .cms-modules { grid-template-columns: 1fr; } }
.cms-module {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 1.15rem;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: border-color 170ms ease, box-shadow 170ms ease, transform 170ms ease;
}
.cms-module:hover {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
}
.cms-module-head { display: flex; align-items: center; gap: 0.8rem; }
.cms-module-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem; height: 3rem;
  border-radius: 13px;
  flex-shrink: 0;
  transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.cms-module:hover .cms-module-icon { transform: scale(1.08) rotate(-3deg); }
.cms-module-icon--product { background: color-mix(in srgb, #15D6C2 13%, transparent); color: #15D6C2; }
.cms-module-icon--blog    { background: color-mix(in srgb, #7c5cfc 14%, transparent); color: #7c5cfc; }
.cms-module-headings { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; flex: 1; }
.cms-module-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
}
.cms-module-total {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--text-soft);
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.cms-module-meta { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.cms-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.73rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.22rem 0.6rem;
  border: 1px solid var(--border);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
}
.cms-pill-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.cms-pill--live  { color: #16a34a; background: color-mix(in srgb, #16a34a 9%, transparent); border-color: color-mix(in srgb, #16a34a 24%, transparent); }
.cms-pill--draft { color: var(--text-muted); }

.cms-module-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.cms-mini {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.45rem;
  border-radius: 10px;
  transition: background 130ms ease;
}
.cms-mini:hover { background: var(--soft-bg); }
.cms-mini-thumb {
  width: 1.9rem; height: 1.9rem;
  border-radius: 7px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  display: inline-flex; align-items: center; justify-content: center;
}
.cms-mini-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cms-mini-thumb--blank {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.62rem; font-weight: 900; color: var(--primary);
}
.cms-mini-title {
  flex: 1; min-width: 0;
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cms-mini-status {
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
}
.cms-mini-status.is-published { color: #16a34a; }
.cms-mini-status.is-draft     { color: var(--text-soft); }

.cms-module-empty {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
  padding: 0.3rem 0;
}
.cms-module-foot {
  margin-top: auto;
  padding-top: 0.4rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cms-module-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--primary);
}
.cms-module-link svg { transition: transform 180ms ease; }
.cms-module:hover .cms-module-link svg { transform: translateX(4px); }
.cms-module-new { font-size: 0.76rem; padding: 0.32rem 0.7rem; height: auto; }

.cms-recent {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.cms-recent-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid var(--border);
}
.cms-recent-sub { font-size: 0.76rem; color: var(--text-soft); }
.cms-recent-list { list-style: none; margin: 0; padding: 0.3rem; display: flex; flex-direction: column; }
.cms-recent-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 0.7rem;
  border-radius: 11px;
  cursor: pointer;
  transition: background 130ms ease;
}
.cms-recent-row:hover { background: var(--soft-bg); }
.cms-recent-type {
  flex-shrink: 0;
  width: 4.2rem;
  font-size: 0.64rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  padding: 0.18rem 0.4rem;
  border-radius: 6px;
  text-align: center;
}
.cms-recent-type.is-product { color: #15D6C2; background: color-mix(in srgb, #15D6C2 11%, transparent); }
.cms-recent-type.is-post    { color: #7c5cfc; background: color-mix(in srgb, #7c5cfc 12%, transparent); }
.cms-recent-thumb {
  width: 2rem; height: 2rem;
  border-radius: 7px;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  display: inline-flex; align-items: center; justify-content: center;
}
.cms-recent-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cms-recent-thumb--blank {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.64rem; font-weight: 900; color: var(--primary);
}
.cms-recent-title {
  flex: 1; min-width: 0;
  font-size: 0.86rem; font-weight: 600; color: var(--text-main);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cms-recent-status {
  display: inline-flex; align-items: center; gap: 0.35rem;
  flex-shrink: 0;
  font-size: 0.7rem; font-weight: 800;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
}
.cms-recent-status.is-published { color: #16a34a; }
.cms-recent-status.is-draft     { color: var(--text-soft); }
.cms-recent-time {
  flex-shrink: 0;
  width: 4.5rem;
  text-align: right;
  font-size: 0.73rem;
  color: var(--text-soft);
  font-variant-numeric: tabular-nums;
}
.cms-recent-empty { padding: 1.5rem 1.1rem; text-align: center; }

.cms-bottom-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 0.9rem;
}
@media (max-width: 960px) {
  .cms-bottom-grid { grid-template-columns: 1fr; }
}

.cms-framework-sites {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.cms-framework-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid var(--border);
}
.cms-framework-sub { font-size: 0.76rem; color: var(--text-soft); }
.cms-framework-list {
  list-style: none;
  margin: 0;
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.cms-framework-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
  padding: 0.55rem 0.7rem;
  border-radius: 11px;
  background: var(--card-bg);
}
.cms-framework-info {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}
.cms-framework-fav {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 5px;
  object-fit: cover;
  border: 1px solid var(--border);
}
.cms-framework-letter {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 5px;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cms-framework-meta { min-width: 0; }
.cms-framework-name {
  display: block;
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-framework-domain {
  font-size: 0.72rem;
  color: var(--primary);
  text-decoration: none;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cms-framework-domain:hover { text-decoration: underline; }
.cms-framework-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.cms-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
}
.cms-status-badge.dot--green {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.09);
}
.cms-status-badge.dot--orange {
  color: #d97706;
  background: rgba(217, 119, 6, 0.09);
}
.cms-status-badge.dot--red {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.09);
}
.cms-status-badge.dot--gray {
  color: #64748b;
  background: rgba(100, 116, 139, 0.09);
}
.cms-status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.cms-setup-btn {
  font-size: 0.72rem;
  padding: 0.28rem 0.55rem;
  height: auto;
}
.cms-framework-empty {
  padding: 2rem 1.1rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.cms-framework-empty p { margin: 0.4rem 0 0; font-style: italic; }

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.modal-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 18px;
  width: 100%;
  max-width: 480px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.2rem;
  border-bottom: 1px solid var(--border);
}
.modal-title-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.modal-fav {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 4px;
}
.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.015em;
}
.modal-close {
  background: none; border: none;
  font-size: 1.5rem; line-height: 1;
  color: var(--text-muted); cursor: pointer;
  padding: 0; margin-top: -0.2rem;
}
.modal-close:hover { color: var(--text-main); }
.modal-body {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.05rem;
}
.modal-desc {
  margin: 0;
  font-size: 0.84rem;
  color: var(--text-muted);
  line-height: 1.45;
}
.modal-copy-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.modal-copy-label {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
}
.modal-copy-row {
  display: flex;
  gap: 0.4rem;
}
.modal-copy-input {
  font-family: monospace;
  font-size: 0.78rem;
  background: var(--soft-bg);
  flex: 1;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border-color: var(--border);
}
.modal-copy-btn {
  font-size: 0.76rem;
  padding: 0 0.75rem;
  height: auto;
  flex-shrink: 0;
}
.modal-guide-note {
  background: var(--soft-bg);
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}
.modal-guide-note strong {
  display: block;
  color: var(--text-main);
  margin-bottom: 0.15rem;
}
.modal-guide-note p { margin: 0; }
.modal-foot {
  padding: 1rem 1.2rem;
  border-top: 1px solid var(--border);
  background: var(--soft-bg);
}
</style>
