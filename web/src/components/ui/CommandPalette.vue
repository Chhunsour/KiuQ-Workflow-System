<template>
  <Teleport to="body">
    <Transition name="cp-fade">
      <div v-if="open" class="cp-overlay" @click.self="close">
        <div class="cp-panel" role="dialog" aria-:label="$t('Command palette')">
          <!-- Search input -->
          <div class="cp-input-row">
            <svg class="cp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="cp-input"
              :placeholder="$t('Search pages, websites, prompts…')"
              @keydown.down.prevent="move(1)"
              @keydown.up.prevent="move(-1)"
              @keydown.enter.prevent="goActive"
              @keydown.esc.prevent="close"
            />
            <kbd class="cp-esc">{{ $t('esc') }}</kbd>
          </div>

          <!-- Results -->
          <div class="cp-results">
            <div v-if="flat.length === 0" class="cp-empty">
              No results for "{{ query }}"
            </div>

            <template v-for="group in groups" :key="group.type">
              <div class="cp-group-label">{{ group.type }}</div>
              <button
                v-for="item in group.items"
                :key="item.key"
                type="button"
                class="cp-item"
                :class="{ 'cp-item--active': item.index === activeIndex }"
                @click="go(item)"
                @mousemove="activeIndex = item.index"
              >
                <span class="cp-item-icon" v-html="item.icon" />
                <span class="cp-item-text">
                  <span class="cp-item-label">{{ item.label }}</span>
                  <span v-if="item.sub" class="cp-item-sub">{{ item.sub }}</span>
                </span>
                <span class="cp-item-type">{{ group.type }}</span>
              </button>
            </template>
          </div>

          <!-- Footer hint -->
          <div class="cp-footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> {{ $t('navigate') }}</span>
            <span><kbd>↵</kbd> {{ $t('open') }}</span>
            <span><kbd>{{ modKey }}</kbd><kbd>K</kbd> {{ $t('toggle') }}</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { adminNavItems, memberNavItems, qualityCheckerNavItems, type NavItem } from '@/components/layout/navItems';

const router = useRouter();
const auth = useAuthStore();
const data = useDataStore();

const open = ref(false);
const query = ref('');
const activeIndex = ref(0);
const inputRef = ref<HTMLInputElement | null>(null);

const modKey = computed(() => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'));

// Default icons
const ICON = {
  page: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
  website: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>',
  prompt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
};

// ── Navigation targets (role-aware), flattened from the sidebar nav ──────────
const navSource = computed<NavItem[]>(() => {
  let items = auth.isAdmin
    ? adminNavItems
    : auth.isQualityChecker
      ? qualityCheckerNavItems
      : memberNavItems;

  if (!auth.isHeadOrSupervisor) {
    items = items.filter((item) => !item.isExecutiveOnly);
  }

  const userRole = auth.profile?.role ? auth.profile.role.trim().toLowerCase() : '';
  const isTaskAlertManager = userRole === 'admin' || userRole === 'owner' || userRole === 'head';
  if (!isTaskAlertManager) {
    items = items.filter((item) => !item.isTaskAlertManagerOnly);
  }

  const isHead = auth.normalizedRole === 'head';
  items = items.filter((item) => !item.isHeadOnly || isHead);

  const isAdminRole = auth.normalizedRole === 'admin';
  items = items.filter((item) => !item.hideFromAdmin || !isAdminRole);

  return items;
});

interface NavTarget { label: string; to: string; icon: string }
const navTargets = computed<NavTarget[]>(() => {
  const out: NavTarget[] = [];
  const seen = new Set<string>();
  const push = (label: string, to: string, icon: string) => {
    if (seen.has(to)) return;
    seen.add(to);
    out.push({ label, to, icon });
  };
  navSource.value.forEach((item) => {
    push(item.label, item.to, item.icon || ICON.page);
    item.children?.forEach((c) => push(c.label, c.to, c.icon || ICON.page));
  });
  return out;
});

// ── Result item shape ────────────────────────────────────────────────────────
interface CmdItem { key: string; index: number; label: string; sub?: string; icon: string; to: string }

const matches = (q: string, ...fields: (string | null | undefined)[]) =>
  fields.some((f) => (f ?? '').toLowerCase().includes(q));

const groups = computed(() => {
  const q = query.value.trim().toLowerCase();

  const pageItems = (q ? navTargets.value.filter((t) => matches(q, t.label)) : navTargets.value).slice(0, 8);

  const siteItems = q
    ? data.websites.filter((w) => matches(q, w.name, w.domain)).slice(0, 6)
    : [];

  const promptItems = q
    ? data.prompts.filter((p) => matches(q, p.title, p.category, p.pageGroup)).slice(0, 6)
    : [];

  const result: { type: string; items: CmdItem[] }[] = [];
  let idx = 0;

  if (pageItems.length) {
    result.push({
      type: 'Pages',
      items: pageItems.map((t) => ({ key: `nav:${t.to}`, index: idx++, label: t.label, icon: t.icon, to: t.to })),
    });
  }
  if (siteItems.length) {
    result.push({
      type: 'Websites',
      items: siteItems.map((w) => ({
        key: `site:${w.id}`,
        index: idx++,
        label: w.name || 'Untitled website',
        sub: w.domain || undefined,
        icon: ICON.website,
        to: `/websites/${w.id}/edit`,
      })),
    });
  }
  if (promptItems.length) {
    result.push({
      type: 'Prompts',
      items: promptItems.map((p) => ({
        key: `prompt:${p.id}`,
        index: idx++,
        label: p.title || 'Untitled prompt',
        sub: p.category || p.pageGroup || undefined,
        icon: ICON.prompt,
        to: p.pageGroup ? `/prompt-library/${encodeURIComponent(p.pageGroup)}/${p.id}` : '/prompt-library',
      })),
    });
  }
  return result;
});

const flat = computed<CmdItem[]>(() => groups.value.flatMap((g) => g.items));

watch(query, () => { activeIndex.value = 0; });

const move = (delta: number) => {
  const n = flat.value.length;
  if (!n) return;
  activeIndex.value = (activeIndex.value + delta + n) % n;
};

const go = (item: CmdItem) => {
  close();
  if (router.currentRoute.value.fullPath !== item.to) router.push(item.to);
};

const goActive = () => {
  const item = flat.value[activeIndex.value];
  if (item) go(item);
};

const openPalette = async () => {
  open.value = true;
  query.value = '';
  activeIndex.value = 0;
  // Lazy-load searchable content the first time it's needed.
  if (data.websites.length === 0) void data.fetchWebsites();
  if (data.prompts.length === 0) void data.fetchPrompts();
  await nextTick();
  inputRef.value?.focus();
};

const close = () => { open.value = false; };

const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    open.value ? close() : void openPalette();
  }
};

const onExternalOpen = () => { if (!open.value) void openPalette(); };

onMounted(() => {
  document.addEventListener('keydown', onKeydown);
  window.addEventListener('open-command-palette', onExternalOpen);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  window.removeEventListener('open-command-palette', onExternalOpen);
});
</script>

<style scoped>
.cp-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12vh 1rem 1rem;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
}
.cp-panel {
  width: min(640px, 100%);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.28);
  overflow: hidden;
}

/* Input */
.cp-input-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.9rem 1rem;
  border-bottom: 1px solid var(--border);
}
.cp-search-icon { color: var(--text-muted); flex-shrink: 0; }
.cp-input {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  font-size: 0.98rem;
  color: var(--text-main);
}
.cp-esc {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
}

/* Results */
.cp-results { overflow-y: auto; padding: 0.4rem; }
.cp-empty { padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; }
.cp-group-label {
  padding: 0.5rem 0.6rem 0.25rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cp-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.6rem 0.6rem;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.cp-item--active { background: color-mix(in srgb, var(--primary) 12%, transparent); }
.cp-item-icon {
  display: flex;
  flex-shrink: 0;
  color: var(--primary);
}
.cp-item-icon :deep(svg) { width: 17px; height: 17px; }
.cp-item-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.cp-item-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cp-item-sub {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cp-item-type {
  flex-shrink: 0;
  font-size: 0.66rem;
  font-weight: 700;
  color: var(--text-muted);
  opacity: 0.7;
}

/* Footer */
.cp-footer {
  display: flex;
  gap: 1rem;
  padding: 0.55rem 1rem;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--soft-bg) 50%, transparent);
  font-size: 0.7rem;
  color: var(--text-muted);
}
.cp-footer span { display: inline-flex; align-items: center; gap: 0.3rem; }
.cp-footer kbd {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.05rem 0.32rem;
}

/* Transition */
.cp-fade-enter-active { transition: opacity 140ms ease; }
.cp-fade-leave-active { transition: opacity 110ms ease; }
.cp-fade-enter-from, .cp-fade-leave-to { opacity: 0; }
.cp-fade-enter-active .cp-panel { animation: cp-pop 180ms cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes cp-pop { from { transform: translateY(-8px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .cp-fade-enter-active, .cp-fade-leave-active, .cp-fade-enter-active .cp-panel { transition: none; animation: none; }
}
</style>
