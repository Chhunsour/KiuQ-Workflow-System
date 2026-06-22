<template>
  <div class="brand-section card card-pad">
    <div class="brand-header">
      <div class="brand-header-left">
        <span class="brand-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="13.5" cy="6.5" r="2.5" />
            <path d="M17.5 10.5a2.5 2.5 0 0 1 0 5" />
            <circle cx="8.5" cy="14.5" r="2.5" />
            <path d="M6.5 10.5a2.5 2.5 0 0 0 0 5" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
        <h3 class="brand-title">{{ $t('Website Branding') }}</h3>
      </div>
      <a v-if="canEdit" :href="`/websites/${website.id}/edit`" class="btn-secondary brand-edit-link">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
        </svg>
        {{ $t('Edit Branding') }}
      </a>
    </div>

    <!-- Name + Domain -->
    <div class="brand-identity">
      <div class="brand-site-avatar">
        <img
          v-if="website.faviconUrl"
          :src="website.faviconUrl"
          alt=""
          class="brand-favicon"
          @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
        />
        <span v-else class="brand-initials">{{ website.name.slice(0, 2).toUpperCase() }}</span>
      </div>
      <div class="brand-site-info">
        <h4 class="brand-site-name">{{ website.name }}</h4>
        <a
          v-if="website.domain"
          :href="website.domain.startsWith('http') ? website.domain : `https://${website.domain}`"
          target="_blank"
          rel="noopener"
          class="brand-site-domain"
        >{{ displayDomain(website.domain) }}</a>
        <span v-else class="brand-site-domain brand-site-domain--empty">{{ $t('No domain') }}</span>
      </div>
    </div>

    <!-- Colors -->
    <div class="brand-colors-grid">
      <ColorSwatch :color="website.primaryColor" :label="$t('Primary')" @copied="(c) => $emit('copied', 'Color code copied ✓')" />
      <ColorSwatch v-if="website.secondaryColor" :color="website.secondaryColor" :label="$t('Secondary')" @copied="() => $emit('copied', 'Color code copied ✓')" />
      <ColorSwatch v-if="website.accentColor" :color="website.accentColor" :label="$t('Accent')" @copied="() => $emit('copied', 'Color code copied ✓')" />
    </div>

    <!-- Font -->
    <div v-if="website.fontFamily" class="brand-font">
      <span class="brand-font-label">{{ $t('Font Family') }}</span>
      <span class="brand-font-value" :style="{ fontFamily: website.fontFamily }">{{ website.fontFamily }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Website } from '@/stores/data';
import ColorSwatch from './ColorSwatch.vue';

defineProps<{
  website: Website;
  canEdit: boolean;
}>();

defineEmits<{
  (e: 'copied', msg: string): void;
}>();

const displayDomain = (domain: string) => {
  try {
    const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    return url.hostname;
  } catch {
    return domain;
  }
};
</script>

<style scoped>
.brand-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.brand-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.brand-header-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), color-mix(in srgb, var(--primary) 5%, transparent));
  color: var(--primary);
}

.brand-title {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-main);
}

.brand-edit-link {
  text-decoration: none;
  font-size: 0.78rem;
  padding: 0.35rem 0.7rem;
  height: auto;
  min-height: auto;
}

/* Identity */
.brand-identity {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: var(--soft-bg);
}

.brand-site-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .brand-site-avatar {
  background: var(--card-bg);
}

.brand-favicon {
  width: 65%;
  height: 65%;
  object-fit: contain;
}

.brand-initials {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--primary);
}

.brand-site-info {
  min-width: 0;
}

.brand-site-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.brand-site-domain {
  display: block;
  font-size: 0.82rem;
  color: var(--primary);
  text-decoration: none;
  margin-top: 0.1rem;
}
.brand-site-domain:hover { text-decoration: underline; }
.brand-site-domain--empty { color: var(--text-muted); }

/* Colors grid */
.brand-colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.65rem;
}

/* Font */
.brand-font {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.brand-font-label {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  flex-shrink: 0;
}

.brand-font-value {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
}

@media (max-width: 480px) {
  .brand-colors-grid {
    grid-template-columns: 1fr;
  }
}
</style>
