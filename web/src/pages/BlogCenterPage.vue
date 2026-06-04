<template>
  <div class="bc">
    <!-- ════════════════ HEADER ════════════════ -->
    <header class="bc-head">
      <div class="bc-head-titles">
        <h1 class="bc-h1">
          <span class="bc-h1-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </span>
          Feature Image Prompt Builder
        </h1>
        <p class="bc-h1-sub">Generate branded feature image prompts for blog content.</p>
      </div>

      <!-- Stat pills (compact, premium) -->
      <div class="bc-stats" aria-label="Workspace metrics">
        <span class="bc-stat" title="Websites you can access">
          <span class="bc-stat-num">{{ stats.sites }}</span>
          <span class="bc-stat-lbl">Sites</span>
        </span>
        <span class="bc-stat" title="Prompt templates across your sites">
          <span class="bc-stat-num">{{ stats.templates }}</span>
          <span class="bc-stat-lbl">Templates</span>
        </span>
        <span class="bc-stat" title="Machine images across your sites">
          <span class="bc-stat-num">{{ stats.images }}</span>
          <span class="bc-stat-lbl">Images</span>
        </span>
        <span class="bc-stat" title="Blogs posted this week">
          <span class="bc-stat-num">{{ stats.thisWeek }}</span>
          <span class="bc-stat-lbl">This Week</span>
        </span>
        <span class="bc-stat" title="Blogs posted this month">
          <span class="bc-stat-num">{{ stats.thisMonth }}</span>
          <span class="bc-stat-lbl">This Month</span>
        </span>
      </div>
    </header>

    <!-- ════════════════ MOBILE TABS ════════════════ -->
    <div class="bc-mtabs" role="tablist">
      <button
        v-for="tab in mobileTabs"
        :key="tab.id"
        :class="['bc-mtab', { 'bc-mtab--active': mobileTab === tab.id }]"
        :aria-selected="mobileTab === tab.id"
        role="tab"
        type="button"
        @click="mobileTab = tab.id"
      >
        <span v-html="tab.icon" class="bc-mtab-icon" aria-hidden="true" />
        {{ tab.label }}
        <span v-if="tab.id === 'images'" class="bc-mtab-count">{{ stats.images }}</span>
      </button>
    </div>

    <!-- ════════════════ WORKSPACE GRID ════════════════ -->
    <div class="bc-grid">
      <!-- ─────────── LEFT: WEBSITE SELECTOR ─────────── -->
      <aside class="bc-col bc-col-left" :data-mobile-active="mobileTab === 'websites'">
        <div class="bc-col-head">
          <h2 class="bc-col-title">Websites</h2>
          <span class="bc-col-count">{{ visibleWebsites.length }}</span>
        </div>

        <!-- Search -->
        <div class="bc-input-wrap">
          <svg class="bc-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input v-model="websiteSearch" type="search" class="bc-input bc-input--with-icon" placeholder="Search websites…" />
        </div>

        <!-- Website list -->
        <div class="bc-wlist">
          <button
            v-for="w in filteredWebsites"
            :key="w.id"
            type="button"
            class="bc-wcard"
            :class="{ 'bc-wcard--active': selectedWebsiteId === w.id }"
            :style="{ '--brand': w.primaryColor || 'var(--primary)' }"
            @click="selectWebsite(w)"
          >
            <span class="bc-wcard-bar" aria-hidden="true" />
            <span class="bc-wcard-avatar">
              <img
                v-if="w.faviconUrl"
                :src="w.faviconUrl"
                alt=""
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else>{{ w.name.slice(0, 2).toUpperCase() }}</span>
            </span>
            <span class="bc-wcard-body">
              <span class="bc-wcard-name">{{ w.name }}</span>
              <span v-if="w.domain" class="bc-wcard-domain">{{ displayDomain(w.domain) }}</span>
            </span>
            <span class="bc-wcard-meta">
              <span class="bc-wcard-dots">
                <span v-if="w.primaryColor" class="bc-dot" :style="{ background: w.primaryColor }" />
                <span v-if="w.secondaryColor" class="bc-dot" :style="{ background: w.secondaryColor }" />
              </span>
              <span class="bc-wcard-count">{{ w.products.length }}</span>
            </span>
          </button>

          <div v-if="!filteredWebsites.length" class="bc-empty">
            <template v-if="websiteSearch">No websites match.</template>
            <template v-else-if="!canSeeAllWebsites">No websites assigned to you yet.</template>
            <template v-else>No websites yet.</template>
          </div>
        </div>

        <!-- Selected website detail block -->
        <div v-if="selectedWebsite" class="bc-wdetail">
          <div class="bc-wdetail-row">
            <span class="bc-wdetail-lbl">Palette</span>
            <span class="bc-wdetail-val">
              <span v-for="c in paletteColors" :key="c" class="bc-dot bc-dot--lg" :style="{ background: c }" :title="c" />
            </span>
          </div>
          <div v-if="scheduleLabel" class="bc-wdetail-row">
            <span class="bc-wdetail-lbl">Schedule</span>
            <span class="bc-wdetail-val bc-wdetail-text">{{ scheduleLabel }}</span>
          </div>
          <div v-if="selectedWebsite.websiteType || selectedWebsite.industry" class="bc-wdetail-row">
            <span class="bc-wdetail-lbl">Category</span>
            <span class="bc-wdetail-val bc-wdetail-text">{{ selectedWebsite.industry || selectedWebsite.websiteType }}</span>
          </div>
          <RouterLink
            v-if="canManage"
            :to="`/blog-center/templates/${selectedWebsite.id}`"
            class="bc-wdetail-manage"
          >
            Manage templates →
          </RouterLink>
        </div>
      </aside>

      <!-- ─────────── CENTER: BUILDER ─────────── -->
      <section class="bc-col bc-col-center" :data-mobile-active="mobileTab === 'builder'">
        <!-- No website yet -->
        <div v-if="!selectedWebsite" class="bc-blank">
          <div class="bc-blank-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h3 class="bc-blank-title">Pick a website to start</h3>
          <p class="bc-blank-sub">Choose a brand from the left to load its templates and machines.</p>
        </div>

        <template v-else>
          <!-- Step 1 — image idea / prompt (optional) -->
          <div class="bc-block">
            <div class="bc-block-head">
              <span class="bc-step" :class="{ 'bc-step--done': !!userPrompt.trim() }">1</span>
              <h3 class="bc-block-title">Image idea / prompt</h3>
              <span class="bc-block-tag">Optional</span>
              <span v-if="autosaveLabel" class="bc-block-tag bc-block-tag--saved">{{ autosaveLabel }}</span>
            </div>
            <textarea
              ref="titleInput"
              v-model="userPrompt"
              rows="3"
              class="bc-input bc-input--ta"
              placeholder="Paste a short idea, a long description, or an existing AI prompt. e.g. &quot;Modern skid steer loader working in a construction environment&quot;"
              maxlength="2000"
            />
            <p class="bc-hint">
              Skip this and the builder still generates a branded prompt from your selected machine.
            </p>
          </div>

          <!-- Step 2 — machine -->
          <div class="bc-block">
            <div class="bc-block-head">
              <span class="bc-step" :class="{ 'bc-step--done': !!effectiveMachine }">2</span>
              <h3 class="bc-block-title">Machine</h3>
              <!-- Source toggle: pick from the website library OR paste a URL -->
              <div class="bc-seg" role="tablist" aria-label="Machine source">
                <button
                  type="button"
                  role="tab"
                  class="bc-seg-btn"
                  :class="{ 'bc-seg-btn--active': machineSource === 'library' }"
                  :aria-selected="machineSource === 'library'"
                  @click="machineSource = 'library'"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                  </svg>
                  Library
                </button>
                <button
                  type="button"
                  role="tab"
                  class="bc-seg-btn"
                  :class="{ 'bc-seg-btn--active': machineSource === 'custom' }"
                  :aria-selected="machineSource === 'custom'"
                  @click="machineSource = 'custom'"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Custom URL
                </button>
              </div>
              <span v-if="machineSource === 'library'" class="bc-block-tag">{{ machines.length }} available</span>
            </div>

            <!-- ────── Custom URL mode ────── -->
            <div v-if="machineSource === 'custom'" class="bc-custom">
              <div class="bc-custom-fields">
                <div class="bc-custom-field">
                  <label class="bc-custom-lbl">Image URL</label>
                  <div class="bc-input-wrap">
                    <svg class="bc-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <input
                      v-model="customImageUrl"
                      type="url"
                      class="bc-input bc-input--with-icon"
                      placeholder="https://example.com/machine.jpg"
                      autocomplete="off"
                      spellcheck="false"
                    />
                  </div>
                  <p v-if="customImageUrl && !isCustomUrlValid" class="bc-custom-err">
                    That doesn't look like a valid URL.
                  </p>
                </div>
                <div class="bc-custom-field">
                  <label class="bc-custom-lbl">
                    Machine name <span class="bc-custom-opt">opt</span>
                  </label>
                  <input
                    v-model="customImageName"
                    type="text"
                    class="bc-input"
                    placeholder="e.g. Mini Excavator"
                    maxlength="120"
                  />
                </div>
              </div>

              <!-- Live preview of the custom image -->
              <div v-if="isCustomUrlValid" class="bc-custom-preview">
                <div class="bc-custom-preview-img">
                  <img
                    :src="customImageUrl"
                    alt="Custom machine preview"
                    @error="customPreviewBroken = true"
                    @load="customPreviewBroken = false"
                  />
                  <span v-if="customPreviewBroken" class="bc-custom-preview-warn">
                    Image failed to load — the URL will still be sent in the prompt.
                  </span>
                </div>
                <div class="bc-custom-preview-meta">
                  <span class="bc-custom-preview-name">
                    {{ customImageName.trim() || 'Custom image' }}
                  </span>
                  <span class="bc-custom-preview-tag">Custom URL</span>
                </div>
              </div>
            </div>

            <!-- ────── Library mode ────── -->
            <div v-else-if="machines.length" ref="machineGridEl" class="bc-mgrid">
              <button
                v-for="m in machines"
                :key="m.id"
                type="button"
                class="bc-mcard"
                :class="{ 'bc-mcard--active': selectedMachineId === m.id }"
                @click="selectMachine(m)"
              >
                <span class="bc-mcard-img">
                  <img
                    v-if="m.imageUrl"
                    :src="m.imageUrl"
                    :alt="m.name"
                    loading="lazy"
                    @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                  />
                  <span v-else class="bc-mcard-img-fallback">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                    </svg>
                  </span>
                  <span v-if="selectedMachineId === m.id" class="bc-mcard-tick">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                </span>
                <span class="bc-mcard-name">{{ m.name }}</span>
                <span v-if="m.category" class="bc-mcard-cat">{{ m.category }}</span>
              </button>
            </div>
            <div v-else-if="machineSource === 'library'" class="bc-empty">
              No machines yet on this site.
              <RouterLink v-if="canManage" :to="`/websites/${selectedWebsite.id}/edit`" class="bc-empty-link">Add machines →</RouterLink>
              <button type="button" class="bc-empty-link bc-empty-link--btn" @click="machineSource = 'custom'">
                Or paste a custom URL →
              </button>
            </div>
          </div>

          <!-- Step 3 — template -->
          <div v-if="templates.length" class="bc-block">
            <div class="bc-block-head">
              <span class="bc-step" :class="{ 'bc-step--done': !!activeTemplate }">3</span>
              <h3 class="bc-block-title">Template</h3>
              <RouterLink
                v-if="canManage"
                :to="`/blog-center/templates/${selectedWebsite.id}`"
                class="bc-block-link"
              >Edit</RouterLink>
            </div>
            <div class="bc-tgrid">
              <button
                v-for="t in templates"
                :key="t.id"
                type="button"
                class="bc-tcard"
                :class="{ 'bc-tcard--active': selectedTemplateId === t.id }"
                @click="selectedTemplateId = t.id"
              >
                <span class="bc-tcard-mark" aria-hidden="true">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
                  </svg>
                </span>
                <span class="bc-tcard-name" :title="t.templateName">{{ t.templateName || 'Untitled' }}</span>
                <span v-if="selectedTemplateId === t.id" class="bc-tcard-active" aria-hidden="true" />
              </button>
            </div>
          </div>

          <!-- Step 4 — preview + inline actions -->
          <div class="bc-block">
            <div class="bc-block-head">
              <span class="bc-step" :class="{ 'bc-step--done': isReady }">{{ templates.length ? '4' : '3' }}</span>
              <h3 class="bc-block-title">Generated prompt</h3>
              <span v-if="isReady" class="bc-block-tag bc-block-tag--mono">{{ promptCharCount }} chars</span>

              <!-- Primary copy button lives right in the section header so
                   it's exactly where the user is already looking. -->
              <button
                type="button"
                class="bc-copy"
                :class="{ 'bc-copy--copied': justCopied }"
                :disabled="!isReady"
                @click="copyPrompt"
              >
                <span v-if="justCopied" class="bc-copy-inner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </span>
                <span v-else class="bc-copy-inner">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy Prompt
                </span>
              </button>
            </div>

            <div class="bc-preview" :class="{ 'bc-preview--empty': !isReady }">
              <div v-if="isReady" class="bc-preview-pad">
                <pre class="bc-preview-code"><span
                  v-for="(line, i) in promptLines"
                  :key="i"
                  class="bc-pl"
                ><span class="bc-pl-n">{{ String(i + 1).padStart(2, ' ') }}</span><span class="bc-pl-t" v-html="highlight(line)" /></span></pre>
              </div>
              <div v-else class="bc-preview-empty-inner">
                <div class="bc-checks">
                  <div class="bc-check" :class="{ 'bc-check--done': !!userPrompt.trim() }">
                    <span>{{ userPrompt.trim() ? '✓' : '·' }}</span> Idea
                    <span class="bc-check-opt">opt</span>
                  </div>
                  <div class="bc-check" :class="{ 'bc-check--done': !!effectiveMachine }">
                    <span>{{ effectiveMachine ? '✓' : '·' }}</span> Machine
                  </div>
                  <div v-if="templates.length" class="bc-check" :class="{ 'bc-check--done': !!activeTemplate }">
                    <span>{{ activeTemplate ? '✓' : '·' }}</span> Template
                  </div>
                </div>
                <p class="bc-preview-hint">Fill the steps above to generate.</p>
              </div>
            </div>

            <!-- Secondary actions, plain text-buttons so nothing competes
                 with the primary Copy Prompt above. -->
            <div class="bc-actions">
              <button type="button" class="bc-action" :disabled="!hasAnyStep" @click="resetAll">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" />
                </svg>
                Generate again
              </button>
              <button type="button" class="bc-action" :disabled="!effectiveMachine?.imageUrl" @click="copyImageUrl">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                Copy image URL
              </button>
              <button type="button" class="bc-action" :disabled="!effectiveMachine?.url" @click="openProductPage">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open product page
              </button>
            </div>
          </div>
        </template>
      </section>

      <!-- ─────────── RIGHT: IMAGE LIBRARY ─────────── -->
      <aside class="bc-col bc-col-right" :data-mobile-active="mobileTab === 'images'">
        <div class="bc-col-head">
          <h2 class="bc-col-title">Image Library</h2>
          <span class="bc-col-count">{{ filteredImages.length }}</span>
        </div>

        <!-- Search -->
        <div class="bc-input-wrap">
          <svg class="bc-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input v-model="imageSearch" type="search" class="bc-input bc-input--with-icon" placeholder="Search images…" />
        </div>

        <!-- Filter chips -->
        <div class="bc-chips">
          <button
            type="button"
            class="bc-chip"
            :class="{ 'bc-chip--active': imgFilterWebsite === '' && imgFilterCategory === '' }"
            @click="resetImageFilters"
          >
            All
          </button>
          <button
            v-if="selectedWebsiteId"
            type="button"
            class="bc-chip"
            :class="{ 'bc-chip--active': imgFilterWebsite === selectedWebsiteId }"
            @click="imgFilterWebsite = imgFilterWebsite === selectedWebsiteId ? '' : selectedWebsiteId"
          >
            This Site
          </button>
          <button
            v-for="c in imageCategories.slice(0, 6)"
            :key="c"
            type="button"
            class="bc-chip"
            :class="{ 'bc-chip--active': imgFilterCategory === c }"
            @click="imgFilterCategory = imgFilterCategory === c ? '' : c"
          >
            {{ c }}
          </button>
        </div>

        <!-- Image grid -->
        <div class="bc-igrid">
          <button
            v-for="img in pagedImages"
            :key="`${img.websiteId}:${img.product.id}`"
            type="button"
            class="bc-icard"
            :class="{ 'bc-icard--active': selectedMachineId === img.product.id && selectedWebsiteId === img.websiteId }"
            @click="selectFromLibrary(img)"
          >
            <span class="bc-icard-img">
              <img
                v-if="img.product.imageUrl"
                :src="img.product.imageUrl"
                :alt="img.product.name"
                loading="lazy"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else class="bc-icard-img-fb">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                </svg>
              </span>
            </span>
            <span class="bc-icard-name">{{ img.product.name }}</span>
            <span class="bc-icard-foot">
              <span class="bc-icard-site" :title="img.websiteName">
                <span class="bc-dot bc-dot--sm" :style="{ background: img.brand }" />
                {{ img.websiteName }}
              </span>
              <span v-if="img.product.category" class="bc-icard-cat">{{ img.product.category }}</span>
            </span>
          </button>

          <div v-if="!filteredImages.length" class="bc-empty">
            {{ imageSearch || imgFilterWebsite || imgFilterCategory ? 'No images match.' : 'No images yet on your sites.' }}
          </div>
        </div>

        <button
          v-if="filteredImages.length > visibleImageCount"
          type="button"
          class="bc-loadmore"
          @click="visibleImageCount += 24"
        >
          Show more ({{ filteredImages.length - visibleImageCount }} hidden)
        </button>
      </aside>
    </div>

    <!-- Toast -->
    <Transition name="bc-toast">
      <div v-if="toastVisible" class="bc-toast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useDataStore, type Product, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { useBlogImageCenterStore } from '@/stores/blogImageCenter';
import { useFollowupStore, DEFAULT_BLOG_WEEKDAYS } from '@/stores/followup';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites', 'blog_image_prompts']);

const data = useDataStore();
const auth = useAuthStore();
const blogStore = useBlogImageCenterStore();
const followup = useFollowupStore();

// ─── Permissions / visibility scoping (unchanged behavior) ──────────────────
const canSeeAllWebsites = computed(() => auth.isAdmin || auth.isAssistantHead);
const canManage = computed(() => auth.isAdmin || auth.isAssistantHead);
const currentUserId = computed(() => auth.user?.id ?? '');

const visibleWebsites = computed(() => {
  if (canSeeAllWebsites.value) return data.websites;
  if (!currentUserId.value) return [];
  return data.websites.filter((w) => w.createdBy === currentUserId.value);
});

// ─── Local persistence (unchanged) ──────────────────────────────────────────
const STORAGE_KEY = 'kiuq-blog-center';

interface PersistedState {
  recentWebsiteIds: string[];
  machineUses: Record<string, number>;
  lastTitle: string;
  lastWebsiteId: string;
  /** Last custom-URL image the user pasted; restored on reload. */
  lastCustomImageUrl?: string;
  /** Optional name for the last custom image. */
  lastCustomImageName?: string;
}

const readPersisted = (): PersistedState => {
  if (typeof window === 'undefined') return { recentWebsiteIds: [], machineUses: {}, lastTitle: '', lastWebsiteId: '' };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { recentWebsiteIds: [], machineUses: {}, lastTitle: '', lastWebsiteId: '' };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      recentWebsiteIds: Array.isArray(parsed.recentWebsiteIds) ? parsed.recentWebsiteIds.slice(0, 5) : [],
      machineUses: typeof parsed.machineUses === 'object' && parsed.machineUses ? parsed.machineUses : {},
      lastTitle: typeof parsed.lastTitle === 'string' ? parsed.lastTitle : '',
      lastWebsiteId: typeof parsed.lastWebsiteId === 'string' ? parsed.lastWebsiteId : '',
      lastCustomImageUrl: typeof parsed.lastCustomImageUrl === 'string' ? parsed.lastCustomImageUrl : '',
      lastCustomImageName: typeof parsed.lastCustomImageName === 'string' ? parsed.lastCustomImageName : ''
    };
  } catch {
    return { recentWebsiteIds: [], machineUses: {}, lastTitle: '', lastWebsiteId: '' };
  }
};

const persisted = ref<PersistedState>(readPersisted());

const writePersisted = () => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted.value)); } catch { /* ignore */ }
};

// ─── State ──────────────────────────────────────────────────────────────────
const selectedWebsiteId = ref<string>('');
// User-provided image idea / prompt. Optional — the enhancer falls back
// to a brand-only template when this is empty so generation never blocks.
const userPrompt = ref('');

// Step 2 has two equivalent sources:
//   'library' → pick a product from the website's machine grid
//   'custom'  → paste an arbitrary image URL (with optional name)
// The downstream consumer uses `effectiveMachine`, which abstracts both.
const machineSource = ref<'library' | 'custom'>('library');
const customImageUrl = ref('');
const customImageName = ref('');
const customPreviewBroken = ref(false);
const selectedMachineId = ref<string>('');
const selectedTemplateId = ref<string>('');
const websiteSearch = ref('');
const imageSearch = ref('');
const imgFilterWebsite = ref('');
const imgFilterCategory = ref('');
const visibleImageCount = ref(24);
const justCopied = ref(false);
const toastVisible = ref(false);
const toastMsg = ref('');
const titleInput = ref<HTMLTextAreaElement | null>(null);
const machineGridEl = ref<HTMLElement | null>(null);
const autosaveLabel = ref('');
const mobileTab = ref<'websites' | 'builder' | 'images'>('builder');

const mobileTabs = [
  { id: 'websites' as const, label: 'Websites', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>' },
  { id: 'builder' as const,  label: 'Builder',  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>' },
  { id: 'images' as const,   label: 'Images',   icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>' }
];

// ─── Selected derived ──────────────────────────────────────────────────────
const selectedWebsite = computed<Website | null>(
  () => visibleWebsites.value.find((w) => w.id === selectedWebsiteId.value) ?? null
);

const machines = computed<Product[]>(() => selectedWebsite.value?.products ?? []);

const selectedMachine = computed<Product | null>(
  () => machines.value.find((m) => m.id === selectedMachineId.value) ?? null
);

// URL validation for the custom-URL mode. Accepts http(s) URLs only.
const isCustomUrlValid = computed(() => {
  const raw = customImageUrl.value.trim();
  if (!raw) return false;
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
});

// Unified "machine" the rest of the page consumes. In Custom mode we
// synthesise a Product-shaped object so every downstream consumer
// (prompt builder, action bar buttons, status text) keeps working
// without conditional branches.
const effectiveMachine = computed<Product | null>(() => {
  if (machineSource.value === 'custom') {
    if (!isCustomUrlValid.value) return null;
    const url = customImageUrl.value.trim();
    return {
      id: '__custom__',
      name: customImageName.value.trim() || 'Custom image',
      category: '',
      url,
      imageUrl: url,
      shortDescription: '',
      longDescription: '',
      keyFeatures: '',
      keySpecs: '',
      price: '',
      sku: '',
      manualUrl: '',
      notes: ''
    } as Product;
  }
  return selectedMachine.value;
});

const templates = computed(() =>
  selectedWebsiteId.value ? blogStore.promptsByWebsite(selectedWebsiteId.value) : []
);

const activeTemplate = computed(() =>
  templates.value.find((t) => t.id === selectedTemplateId.value)
    ?? templates.value[0]
    ?? null
);

// ─── Website list (filtered + sorted) ──────────────────────────────────────
const filteredWebsites = computed(() => {
  const q = websiteSearch.value.trim().toLowerCase();
  const list = q
    ? visibleWebsites.value.filter(
        (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q)
      )
    : visibleWebsites.value;
  // Put recent ones on top, then alphabetical
  const recent = new Set(persisted.value.recentWebsiteIds);
  return [...list].sort((a, b) => {
    const ar = recent.has(a.id) ? persisted.value.recentWebsiteIds.indexOf(a.id) : 999;
    const br = recent.has(b.id) ? persisted.value.recentWebsiteIds.indexOf(b.id) : 999;
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name);
  });
});

// ─── Schedule + palette helpers ────────────────────────────────────────────
const paletteColors = computed(() =>
  selectedWebsite.value
    ? [selectedWebsite.value.primaryColor, selectedWebsite.value.secondaryColor, selectedWebsite.value.accentColor].filter(Boolean)
    : []
);

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const scheduleLabel = computed(() => {
  if (!selectedWebsiteId.value) return '';
  const sched = followup.scheduleFor?.(selectedWebsiteId.value);
  if (sched && sched.kind === 'weekly' && sched.weekdays.length) {
    return sched.weekdays.map((d) => DAY_NAMES[d] ?? '').filter(Boolean).join(' · ');
  }
  if (sched && sched.kind === 'monthly' && sched.monthlyDays.length) {
    return `Monthly: ${sched.monthlyDays.slice(0, 4).join(', ')}${sched.monthlyDays.length > 4 ? '…' : ''}`;
  }
  // Fallback to legacy default
  return DEFAULT_BLOG_WEEKDAYS.map((d) => DAY_NAMES[d]).join(' · ');
});

// ─── Status & prompt readiness ─────────────────────────────────────────────
const hasAnyStep = computed(
  () => !!selectedWebsiteId.value || !!userPrompt.value.trim() || !!selectedMachineId.value
);

// Generation is no longer blocked by the idea text — only website + machine
// are required. The enhancer always produces a valid branded prompt.
// `effectiveMachine` covers both library picks and custom-URL pastes.
const isReady = computed(
  () => !!selectedWebsite.value && !!effectiveMachine.value
);

// ─── Prompt enhancement engine ─────────────────────────────────────────────
// Takes whatever idea the user pasted (short, long, or empty) and enriches
// it with the website's branding, the selected machine, and — if present —
// the per-website template. The user never has to type colors, brand
// names, machine descriptions, or URLs; the system injects them.
const generatedPrompt = computed(() => {
  if (!isReady.value || !selectedWebsite.value || !effectiveMachine.value) return '';
  const w = selectedWebsite.value;
  const m = effectiveMachine.value;
  const idea = userPrompt.value.trim();

  // If a per-website template exists, use it as the scaffold and inject
  // every signal we have via token replacement. Recognised tokens:
  // {{idea}} / {{user_prompt}} / {{prompt}} / {{blog_title}} / {{title}}
  // {{website}} / {{brand}} / {{domain}}
  // {{primary_color}} / {{secondary_color}} / {{accent_color}}
  // {{machine}} / {{machine_type}} / {{image_url}} / {{image}}
  if (activeTemplate.value) {
    return activeTemplate.value.promptContent
      .replace(/\{\{?\s*(?:idea|user_?prompt|prompt|blog_?title|title)\s*\}?\}/gi, idea)
      .replace(/\{\{?\s*website\s*\}?\}/gi, w.name)
      .replace(/\{\{?\s*brand\s*\}?\}/gi, w.name)
      .replace(/\{\{?\s*domain\s*\}?\}/gi, w.domain)
      .replace(/\{\{?\s*primary_?color\s*\}?\}/gi, w.primaryColor)
      .replace(/\{\{?\s*secondary_?color\s*\}?\}/gi, w.secondaryColor)
      .replace(/\{\{?\s*accent_?color\s*\}?\}/gi, w.accentColor)
      .replace(/\{\{?\s*machine\s*\}?\}/gi, m.name)
      .replace(/\{\{?\s*machine_?type\s*\}?\}/gi, m.category || m.name)
      .replace(/\{\{?\s*image_?url\s*\}?\}/gi, m.imageUrl)
      .replace(/\{\{?\s*image\s*\}?\}/gi, m.imageUrl)
      + `\n\nReference image: ${m.imageUrl}`;
  }

  // No template — build the branded enhancement prompt from scratch.
  // Output mirrors the example in the spec: open with a brand directive,
  // declare colors + subject, fold in the user's idea, then close with
  // composition + style + reference image.
  const colors = [w.primaryColor, w.secondaryColor, w.accentColor].filter(Boolean);
  const colorPhrase =
    colors.length >= 2
      ? `Use brand colors ${colors.slice(0, 2).join(' and ')}${colors[2] ? ` with ${colors[2]} accents` : ''}.`
      : colors.length === 1
        ? `Use brand color ${colors[0]}.`
        : '';

  const niche = (w.industry || w.websiteType || '').trim();
  const styleNotes = (w.designStyleNotes || '').trim();
  const machineDesc = m.category ? `${m.name} (${m.category})` : m.name;

  const lines: string[] = [];
  lines.push(`Create a professional feature blog image for ${w.name}.`);
  if (colorPhrase) lines.push(colorPhrase);
  lines.push(`Include the provided ${machineDesc} product image as the primary subject.`);
  if (idea) {
    lines.push('');
    lines.push(`Concept: ${idea}`);
    lines.push('');
  }
  if (niche) lines.push(`Industry context: ${niche}.`);
  if (styleNotes) lines.push(`Brand visual style: ${styleNotes}`);
  lines.push(
    'Modern industrial marketing style. Clean background. Website banner composition. '
      + 'High detail machinery photography. Professional lighting. SEO blog feature image style.'
  );
  lines.push('Preserve machine details. Match website branding.');
  lines.push('');
  lines.push(`Reference image: ${m.imageUrl}`);

  return lines.join('\n');
});

const promptCharCount = computed(() => generatedPrompt.value.length);
const promptLines = computed(() => generatedPrompt.value.split('\n'));

// Lightweight syntax-style highlighting (label: value, URLs, color hex)
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const highlight = (line: string) => {
  if (!line) return '<span class="bc-tk-blank">&nbsp;</span>';
  let out = escapeHtml(line);
  // hex colors
  out = out.replace(/(#[0-9a-fA-F]{3,8})\b/g, '<span class="bc-tk-color">$1</span>');
  // urls
  out = out.replace(/(https?:\/\/[^\s)]+)/g, '<span class="bc-tk-url">$1</span>');
  // quoted strings
  out = out.replace(/("[^"]+")/g, '<span class="bc-tk-str">$1</span>');
  // leading "Label:" tags
  out = out.replace(/^([A-Z][\w ]{0,40}):/m, '<span class="bc-tk-key">$1</span>:');
  return out;
};

// ─── Image library (flat across visible websites) ──────────────────────────
interface LibImage {
  product: Product;
  websiteId: string;
  websiteName: string;
  brand: string;
}

const allImages = computed<LibImage[]>(() => {
  const out: LibImage[] = [];
  for (const w of visibleWebsites.value) {
    for (const p of w.products) {
      if (!p.imageUrl) continue;
      out.push({ product: p, websiteId: w.id, websiteName: w.name, brand: w.primaryColor || '#3f8dfe' });
    }
  }
  return out;
});

const imageCategories = computed(() => {
  const set = new Set<string>();
  for (const img of allImages.value) {
    if (img.product.category) set.add(img.product.category);
  }
  return Array.from(set).sort();
});

const filteredImages = computed(() => {
  const q = imageSearch.value.trim().toLowerCase();
  return allImages.value.filter((img) => {
    if (imgFilterWebsite.value && img.websiteId !== imgFilterWebsite.value) return false;
    if (imgFilterCategory.value && img.product.category !== imgFilterCategory.value) return false;
    if (q) {
      const hay = `${img.product.name} ${img.product.category} ${img.websiteName}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
});

const pagedImages = computed(() => filteredImages.value.slice(0, visibleImageCount.value));

const resetImageFilters = () => {
  imgFilterWebsite.value = '';
  imgFilterCategory.value = '';
};

// ─── Stats ─────────────────────────────────────────────────────────────────
const stats = computed(() => {
  const slots = followup.blogSlots ?? [];
  const today = new Date();
  const dayIdx = (today.getDay() + 6) % 7;
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayIdx);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartIso = weekStart.toISOString().slice(0, 10);
  const monthStartIso = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  let thisWeek = 0;
  let thisMonth = 0;
  const visibleIds = new Set(visibleWebsites.value.map((w) => w.id));
  for (const s of slots) {
    if (!visibleIds.has(s.websiteId)) continue;
    if (s.status === 'done' && s.scheduledDate >= weekStartIso) thisWeek++;
    if (s.status === 'done' && s.scheduledDate >= monthStartIso) thisMonth++;
  }

  const templateCount = visibleWebsites.value
    .reduce((sum, w) => sum + (blogStore.promptCountByWebsite[w.id] || 0), 0);

  const imageCount = allImages.value.length;

  return {
    sites: visibleWebsites.value.length,
    templates: templateCount,
    images: imageCount,
    thisWeek,
    thisMonth
  };
});

// ─── Actions ────────────────────────────────────────────────────────────────
const selectWebsite = (w: Website) => {
  selectedWebsiteId.value = w.id;
  selectedMachineId.value = '';
  persisted.value.recentWebsiteIds = [w.id, ...persisted.value.recentWebsiteIds.filter((id) => id !== w.id)].slice(0, 5);
  persisted.value.lastWebsiteId = w.id;
  writePersisted();
  void nextTick(() => titleInput.value?.focus());
  // On mobile, jump to builder after picking a brand
  if (window.innerWidth < 900) mobileTab.value = 'builder';
};

const selectMachine = (m: Product) => {
  selectedMachineId.value = m.id;
  if (m.name) {
    persisted.value.machineUses[m.name] = (persisted.value.machineUses[m.name] || 0) + 1;
    writePersisted();
  }
};

const selectFromLibrary = (img: LibImage) => {
  // Switch website context if needed, then pick the machine.
  if (img.websiteId !== selectedWebsiteId.value) {
    const w = visibleWebsites.value.find((x) => x.id === img.websiteId);
    if (w) selectWebsite(w);
  }
  // Defer selection so reactive updates settle.
  void nextTick(() => {
    // Library picks always force library mode — overriding any stale custom
    // URL the user may have pasted earlier.
    machineSource.value = 'library';
    selectMachine(img.product);
    showToast('Image selected');
    if (window.innerWidth < 900) mobileTab.value = 'builder';
  });
};

const resetAll = () => {
  userPrompt.value = '';
  selectedMachineId.value = '';
  selectedTemplateId.value = '';
  // Also clear the custom URL inputs and snap back to Library mode so the
  // next "Generate Again" starts from a clean state.
  customImageUrl.value = '';
  customImageName.value = '';
  machineSource.value = 'library';
  // Keep selectedWebsiteId so user can regenerate quickly for the same brand.
  void nextTick(() => titleInput.value?.focus());
};

const showToast = (msg: string) => {
  toastMsg.value = msg;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 1600);
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch { return false; }
  }
};

const copyPrompt = async () => {
  if (!isReady.value) return;
  const ok = await copyToClipboard(generatedPrompt.value);
  if (!ok) { showToast('Could not copy'); return; }
  justCopied.value = true;
  showToast('Prompt copied');
  setTimeout(() => { justCopied.value = false; }, 1800);
};

const copyImageUrl = async () => {
  const url = effectiveMachine.value?.imageUrl;
  if (!url) return;
  const ok = await copyToClipboard(url);
  showToast(ok ? 'Image URL copied' : 'Could not copy');
};

const openProductPage = () => {
  const url = effectiveMachine.value?.url;
  if (!url) return;
  window.open(url.startsWith('http') ? url : `https://${url}`, '_blank', 'noopener,noreferrer');
};

const displayDomain = (d: string) => {
  try {
    const u = new URL(d.startsWith('http') ? d : `https://${d}`);
    return u.hostname.replace(/^www\./, '');
  } catch { return d; }
};

// ─── Keyboard ⌘/Ctrl + Enter ───────────────────────────────────────────────
const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && isReady.value) {
    e.preventDefault();
    void copyPrompt();
  }
};

// ─── Auto-template & title autosave ────────────────────────────────────────
watch(templates, (list) => {
  if (list.length && !list.some((t) => t.id === selectedTemplateId.value)) {
    selectedTemplateId.value = list[0].id;
  }
  if (!list.length) selectedTemplateId.value = '';
});

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
watch(userPrompt, (v) => {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    persisted.value.lastTitle = v;
    writePersisted();
    if (v.trim()) {
      autosaveLabel.value = 'Saved';
      setTimeout(() => { autosaveLabel.value = ''; }, 1200);
    }
  }, 400);
});

// Persist the custom URL + name so a refresh doesn't wipe them. Reset the
// broken-preview flag whenever the URL changes so the new image gets a
// fresh load attempt.
watch(customImageUrl, (v) => {
  customPreviewBroken.value = false;
  persisted.value.lastCustomImageUrl = v;
  writePersisted();
});
watch(customImageName, (v) => {
  persisted.value.lastCustomImageName = v;
  writePersisted();
});

// ─── Mount / Unmount ────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('keydown', onKeydown);

  // Restore last session
  // Restore the last idea the user typed (persisted across reloads).
  if (persisted.value.lastTitle) userPrompt.value = persisted.value.lastTitle;
  if (persisted.value.lastCustomImageUrl) customImageUrl.value = persisted.value.lastCustomImageUrl;
  if (persisted.value.lastCustomImageName) customImageName.value = persisted.value.lastCustomImageName;

  await Promise.all([
    data.fetchWebsites(),
    blogStore.fetchAllPrompts(),
    followup.fetchBlogSlots().catch(() => undefined),
    followup.fetchBlogSchedules?.().catch(() => undefined)
  ]);

  // Auto-pick the last used website if it's still visible
  if (persisted.value.lastWebsiteId
      && visibleWebsites.value.some((w) => w.id === persisted.value.lastWebsiteId)) {
    selectedWebsiteId.value = persisted.value.lastWebsiteId;
  } else if (visibleWebsites.value.length === 1) {
    // Single site = no friction; just pick it
    selectedWebsiteId.value = visibleWebsites.value[0].id;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  if (autosaveTimer) clearTimeout(autosaveTimer);
});
</script>

<style scoped>
/* ════════════════════════════════════════════════════
   Blog Center — workspace redesign
   References: Linear / Stripe / Notion / Vercel
   Crisp lines, soft surfaces, restrained color.
   ════════════════════════════════════════════════════ */

.bc {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ────────── HEADER ────────── */
.bc-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.25rem 0 0.6rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.bc-head-titles { min-width: 0; }

.bc-h1 {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
  margin: 0;
  line-height: 1.1;
}

.bc-h1-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #9333ea));
  color: #fff;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 35%, transparent);
}

.bc-h1-sub {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  margin: 0.3rem 0 0;
}

/* Stat pills — small, premium */
.bc-stats {
  display: flex;
  align-items: stretch;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.bc-stat {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 0.32rem 0.65rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 7px;
  min-width: 58px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.bc-stat:hover {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
}

.bc-stat-num {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
  font-feature-settings: 'tnum' on, 'lnum' on;
}

.bc-stat-lbl {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.1rem;
}

/* ────────── MOBILE TABS ────────── */
.bc-mtabs {
  display: none;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.25rem;
  gap: 0.2rem;
}

.bc-mtab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem 0.6rem;
  background: transparent;
  border: none;
  border-radius: 7px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.bc-mtab--active {
  background: var(--soft-bg);
  color: var(--text-main);
  box-shadow: inset 0 0 0 1px var(--border);
}

.bc-mtab-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.bc-mtab-count {
  font-size: 0.66rem;
  font-weight: 700;
  background: var(--primary);
  color: #fff;
  border-radius: 999px;
  padding: 0 0.45rem;
  min-width: 1.1rem;
  text-align: center;
}
.bc-mtab:not(.bc-mtab--active) .bc-mtab-count {
  background: var(--soft-bg);
  color: var(--text-muted);
  box-shadow: inset 0 0 0 1px var(--border);
}

/* ────────── WORKSPACE GRID ────────── */
.bc-grid {
  display: grid;
  grid-template-columns: minmax(240px, 0.95fr) minmax(0, 2fr) minmax(260px, 1fr);
  gap: 0.75rem;
  align-items: start;
  min-height: 0;
}

.bc-col {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
}

.bc-col-left  { min-height: 320px; max-height: calc(100vh - 220px); }
.bc-col-right { min-height: 320px; max-height: calc(100vh - 220px); }

.bc-col-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.4rem;
}

.bc-col-title {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0;
}

.bc-col-count {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  font-feature-settings: 'tnum' on;
}

/* ────────── Inputs ────────── */
.bc-input-wrap {
  position: relative;
}

.bc-input-icon {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.bc-input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  background: var(--soft-bg);
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-size: 0.82rem;
  color: var(--text-main);
  transition: all 0.15s ease;
}
.bc-input:focus {
  outline: none;
  background: var(--card-bg);
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}

.bc-input--with-icon { padding-left: 1.8rem; }
.bc-input--xl {
  font-size: 0.95rem;
  padding: 0.65rem 0.85rem;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-weight: 500;
}

/* Multi-line "image idea" textarea — comfortable to paste long prompts into */
.bc-input--ta {
  font-size: 0.86rem;
  padding: 0.7rem 0.85rem;
  line-height: 1.5;
  resize: vertical;
  min-height: 84px;
  max-height: 240px;
  font-family: inherit;
}

.bc-hint {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin: 0.1rem 0 0;
  line-height: 1.4;
}

.bc-check-opt {
  font-family: 'Jost Numbers', monospace;
  font-size: 0.55rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  background: var(--soft-bg);
  color: var(--text-muted);
  margin-left: 0.25rem;
}

/* ────────── LEFT: website cards ────────── */
.bc-wlist {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  overflow-y: auto;
  min-height: 0;
  margin: -0.2rem;
  padding: 0.2rem;
}

.bc-wcard {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.65rem 0.5rem 0.7rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: all 0.12s ease;
}
.bc-wcard:hover {
  background: var(--soft-bg);
}
.bc-wcard--active {
  background: color-mix(in srgb, var(--brand) 7%, var(--card-bg));
  border-color: color-mix(in srgb, var(--brand) 30%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 10%, transparent);
}

.bc-wcard-bar {
  position: absolute;
  left: 0;
  top: 0.5rem;
  bottom: 0.5rem;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--brand);
  opacity: 0;
  transition: opacity 0.15s ease;
}
.bc-wcard--active .bc-wcard-bar { opacity: 1; }

.bc-wcard-avatar {
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 6px;
  background: var(--soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: var(--brand);
}
.bc-wcard-avatar img { width: 65%; height: 65%; object-fit: contain; }
.bc-wcard-avatar span {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
}

.bc-wcard-body {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  min-width: 0;
}

.bc-wcard-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.005em;
}

.bc-wcard-domain {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.66rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bc-wcard-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.bc-wcard-dots {
  display: flex;
  gap: 0.15rem;
}

.bc-wcard-count {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--soft-bg);
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
}
.bc-wcard--active .bc-wcard-count {
  background: color-mix(in srgb, var(--brand) 12%, transparent);
  color: var(--brand);
}

/* Color dots */
.bc-dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .bc-dot {
  border-color: rgba(255, 255, 255, 0.14);
}
.bc-dot--sm { width: 7px; height: 7px; }
.bc-dot--lg { width: 14px; height: 14px; }

/* Website detail block */
.bc-wdetail {
  margin-top: 0.35rem;
  padding-top: 0.6rem;
  border-top: 1px dashed var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.bc-wdetail-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
}

.bc-wdetail-lbl {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 0.62rem;
  color: var(--text-muted);
  min-width: 58px;
}

.bc-wdetail-val {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
}

.bc-wdetail-text {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bc-wdetail-manage {
  margin-top: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  padding: 0.3rem 0.55rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--primary) 7%, transparent);
  text-align: center;
}
.bc-wdetail-manage:hover {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
}

/* ────────── CENTER: builder ────────── */
.bc-col-center {
  background: var(--card-bg);
  gap: 0.9rem;
}

.bc-blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--text-muted);
}

.bc-blank-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: var(--soft-bg);
  color: var(--primary);
}

.bc-blank-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0.2rem 0 0;
}

.bc-blank-sub {
  font-size: 0.82rem;
  margin: 0;
  max-width: 280px;
}

.bc-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bc-block-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.bc-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 5px;
  background: var(--soft-bg);
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  flex-shrink: 0;
}
.bc-step--done {
  background: #16a34a;
  color: #fff;
}
:root[data-theme='dark-gray'] .bc-step--done { background: #22c55e; }

.bc-block-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  flex: 1;
  letter-spacing: -0.005em;
}

.bc-block-tag {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--soft-bg);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}
.bc-block-tag--mono { font-family: 'Jost Numbers', monospace; font-feature-settings: 'tnum' on; }
.bc-block-tag--saved {
  background: color-mix(in srgb, #16a34a 12%, transparent);
  color: #16a34a;
}
:root[data-theme='dark-gray'] .bc-block-tag--saved { color: #4ade80; }

.bc-block-link {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  text-decoration: none;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}
.bc-block-link:hover { background: color-mix(in srgb, var(--primary) 8%, transparent); }

/* Segmented toggle (Library / Custom URL) */
.bc-seg {
  display: inline-flex;
  align-items: center;
  gap: 0.1rem;
  padding: 0.18rem;
  background: var(--soft-bg);
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px var(--border);
}

.bc-seg-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.28rem 0.55rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
}
.bc-seg-btn:hover { color: var(--text-main); }
.bc-seg-btn--active {
  background: var(--card-bg);
  color: var(--text-main);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}
:root[data-theme='dark-gray'] .bc-seg-btn--active {
  box-shadow: 0 0 0 1px var(--border), 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* Custom URL panel */
.bc-custom {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.65rem;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--primary) 3%, var(--card-bg)),
    var(--card-bg));
  border: 1px dashed color-mix(in srgb, var(--primary) 25%, var(--border));
  border-radius: 10px;
}

.bc-custom-fields {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 0.55rem;
}

.bc-custom-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.bc-custom-lbl {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.bc-custom-opt {
  font-family: 'Jost Numbers', monospace;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  background: var(--soft-bg);
  color: var(--text-muted);
}

.bc-custom-err {
  font-size: 0.66rem;
  color: #dc2626;
  margin: 0;
}
:root[data-theme='dark-gray'] .bc-custom-err { color: #f87171; }

/* Live preview row */
.bc-custom-preview {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.5rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.bc-custom-preview-img {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  background: var(--soft-bg);
  overflow: hidden;
  flex-shrink: 0;
}
.bc-custom-preview-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.bc-custom-preview-warn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0.25rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.55rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--soft-bg);
  line-height: 1.25;
}

.bc-custom-preview-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}

.bc-custom-preview-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bc-custom-preview-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 0.1rem 0.4rem;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Inline link-styled button (for "paste a custom URL" fallback) */
.bc-empty-link--btn {
  background: none;
  border: none;
  cursor: pointer;
  font: inherit;
  padding: 0;
}

@media (max-width: 540px) {
  .bc-custom-fields { grid-template-columns: 1fr; }
  .bc-seg-btn { padding: 0.24rem 0.45rem; font-size: 0.66rem; }
}

/* Machine grid */
.bc-mgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  gap: 0.5rem;
}

.bc-mcard {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.4rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 9px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: all 0.12s ease;
}
.bc-mcard:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  transform: translateY(-1px);
}
.bc-mcard--active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}

.bc-mcard-img {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--soft-bg);
  border-radius: 6px;
  overflow: hidden;
  display: block;
}
.bc-mcard-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.25s ease;
}
.bc-mcard:hover .bc-mcard-img img { transform: scale(1.04); }

.bc-mcard-img-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--text-muted);
  opacity: 0.4;
}

.bc-mcard-tick {
  position: absolute;
  top: 0.25rem;
  right: 0.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  box-shadow: 0 1px 4px rgba(63, 141, 254, 0.4);
}

.bc-mcard-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bc-mcard-cat {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.62rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

/* Template grid */
.bc-tgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.4rem;
}

.bc-tcard {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 0.7rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: all 0.12s ease;
  overflow: hidden;
}
.bc-tcard:hover {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
}
.bc-tcard--active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
  color: var(--primary);
}

.bc-tcard-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 5px;
  background: var(--soft-bg);
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all 0.12s ease;
}
.bc-tcard--active .bc-tcard-mark {
  background: var(--primary);
  color: #fff;
}

.bc-tcard-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}
.bc-tcard--active .bc-tcard-name { color: var(--primary); }

.bc-tcard-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}

/* Prompt preview — code editor feel */
.bc-preview {
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--primary) 3%, var(--card-bg)),
    var(--card-bg));
  border: 1px solid var(--border);
  border-radius: 10px;
  min-height: 160px;
  max-height: 420px;
  overflow: hidden;
  position: relative;
}

.bc-preview-pad {
  overflow-y: auto;
  max-height: 420px;
}

.bc-preview-code {
  font-family: 'Jost Numbers', ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.7;
  margin: 0;
  padding: 0.85rem 0.65rem 0.85rem 0;
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
  font-feature-settings: 'liga' off, 'tnum' on;
}

.bc-pl {
  display: grid;
  grid-template-columns: 2.4rem 1fr;
  align-items: baseline;
}

.bc-pl-n {
  color: var(--text-muted);
  opacity: 0.45;
  text-align: right;
  padding-right: 0.7rem;
  font-size: 0.7rem;
  user-select: none;
  font-variant-numeric: tabular-nums;
}

.bc-pl-t {
  color: var(--text-main);
}

.bc-tk-key   { color: var(--primary); font-weight: 700; }
.bc-tk-str   { color: #16a34a; }
.bc-tk-url   { color: #d97706; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
.bc-tk-color { color: #9333ea; }
.bc-tk-blank { display: inline-block; }
:root[data-theme='dark-gray'] .bc-tk-str { color: #4ade80; }
:root[data-theme='dark-gray'] .bc-tk-url { color: #fbbf24; }
:root[data-theme='dark-gray'] .bc-tk-color { color: #c084fc; }

.bc-preview--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--soft-bg);
}

.bc-preview-empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  padding: 1.5rem 1rem;
}

.bc-checks {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.35rem;
}

.bc-check {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.55rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
}
.bc-check--done {
  color: #16a34a;
  border-color: color-mix(in srgb, #16a34a 30%, transparent);
  background: color-mix(in srgb, #16a34a 7%, var(--card-bg));
}
:root[data-theme='dark-gray'] .bc-check--done { color: #4ade80; }

.bc-check span {
  font-family: 'Jost Numbers', monospace;
  font-weight: 800;
}

.bc-preview-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 0;
}

/* ────────── RIGHT: image library ────────── */
.bc-chips {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.bc-chip {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  background: var(--soft-bg);
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}
.bc-chip:hover {
  color: var(--text-main);
  border-color: var(--border);
}
.bc-chip--active {
  background: var(--primary);
  color: #fff !important;
  border-color: var(--primary);
}

.bc-igrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
  overflow-y: auto;
  min-height: 0;
  margin: -0.15rem;
  padding: 0.15rem;
}

.bc-icard {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.3rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: all 0.12s ease;
  overflow: hidden;
}
.bc-icard:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(63, 141, 254, 0.08);
}
.bc-icard--active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, var(--card-bg));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 18%, transparent);
}

.bc-icard-img {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--soft-bg);
  border-radius: 5px;
  overflow: hidden;
  display: block;
}
.bc-icard-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bc-icard-img-fb {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  opacity: 0.4;
}

.bc-icard-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.bc-icard-foot {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.bc-icard-site {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bc-icard-cat {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  opacity: 0.7;
}

.bc-loadmore {
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 0.45rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
}
.bc-loadmore:hover {
  color: var(--primary);
  border-color: var(--primary);
}

/* Empty inline */
.bc-empty {
  padding: 1.2rem 0.5rem;
  text-align: center;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--text-muted);
  grid-column: 1 / -1;
}
.bc-empty-link {
  display: inline-block;
  margin-left: 0.3rem;
  color: var(--primary);
  font-weight: 700;
  text-decoration: none;
}
.bc-empty-link:hover { text-decoration: underline; }

/* ────────── INLINE ACTIONS (replaces the floating bar) ────────── */

/* Primary copy button — lives in the Generated prompt section header. */
.bc-copy {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.75rem;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.18s ease;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 28%, transparent);
}
.bc-copy:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px color-mix(in srgb, var(--primary) 42%, transparent);
}
.bc-copy:disabled {
  background: var(--soft-bg);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}
.bc-copy--copied {
  background: #16a34a !important;
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.28) !important;
}

.bc-copy-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

/* Secondary action row — sits under the preview */
.bc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  margin-top: 0.1rem;
}

.bc-action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.55rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
}
.bc-action:hover:not(:disabled) {
  background: var(--soft-bg);
  color: var(--text-main);
  border-color: var(--border);
}
.bc-action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ────────── TOAST ────────── */
.bc-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  background: #16a34a;
  color: #fff;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.35);
}
.bc-toast-enter-active,
.bc-toast-leave-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.bc-toast-enter-from,
.bc-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

/* ────────── RESPONSIVE ────────── */
/* Tablet: drop the right column under main */
@media (max-width: 1200px) {
  .bc-grid {
    grid-template-columns: minmax(220px, 0.9fr) minmax(0, 2fr);
  }
  .bc-col-right {
    grid-column: 1 / -1;
    max-height: none;
    min-height: auto;
  }
  .bc-igrid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    max-height: 360px;
  }
}

/* Mobile: tabs */
@media (max-width: 900px) {
  .bc-mtabs { display: flex; }
  .bc-grid {
    grid-template-columns: 1fr;
  }
  .bc-col {
    display: none;
    max-height: none;
  }
  .bc-col[data-mobile-active='true'] {
    display: flex;
  }
  .bc-col-left { min-height: auto; }
  .bc-col-right { min-height: auto; }
  .bc-igrid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    max-height: none;
  }
  .bc-wlist { max-height: none; }
  /* Copy button drops below the title row on tighter screens */
  .bc-block-head { flex-wrap: wrap; }
  .bc-copy {
    width: 100%;
    justify-content: center;
    margin-top: 0.3rem;
  }
}

@media (max-width: 540px) {
  .bc-head { padding-bottom: 0.4rem; }
  .bc-h1 { font-size: 1.15rem; }
  .bc-stats { gap: 0.25rem; }
  .bc-stat { padding: 0.25rem 0.5rem; min-width: 50px; }
  .bc-stat-num { font-size: 0.82rem; }
}
</style>
