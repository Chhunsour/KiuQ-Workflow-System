<template>
  <div class="cf" ref="wrapRef">
    <label v-if="label" class="label">{{ label }}</label>

    <!-- Trigger -->
    <button type="button" class="cf-trigger" :class="{ 'cf-trigger--open': open }" @click="toggle">
      <span class="cf-swatch" :style="{ background: previewColor }">
        <svg v-if="!modelValue" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
      </span>
      <span class="cf-value">{{ modelValue || 'Pick a color' }}</span>
      <svg class="cf-chevron" :class="{ 'cf-chevron--open': open }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </button>

    <!-- Popover -->
    <Transition name="cf-pop">
      <div v-if="open" class="cf-pop">
        <!-- Live preview -->
        <div class="cf-preview" :style="{ background: previewColor }">
          <span class="cf-preview-hex">{{ normalizedHex.toUpperCase() }}</span>
        </div>

        <!-- Hex + tools -->
        <div class="cf-controls">
          <div class="cf-hex">
            <span class="cf-hash">#</span>
            <input
              ref="hexRef"
              type="text"
              class="cf-hex-input"
              :value="hexDigits"
              maxlength="6"
              spellcheck="false"
              placeholder="3f8dfe"
              @input="onHexInput"
              @keydown.enter.prevent="close"
            />
          </div>

          <label class="cf-tool" title="Open spectrum">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            <input type="color" class="cf-native" :value="normalizedHex" @input="onNative" />
          </label>

          <button v-if="hasEyeDropper" type="button" class="cf-tool" title="Eyedropper" @click="pickWithEyedropper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>
          </button>
        </div>

        <!-- Contrast hint -->
        <div class="cf-contrast">
          <span class="cf-contrast-sample" :style="{ background: normalizedHex, color: contrast.textColor }">Aa</span>
          <span class="cf-contrast-text">
            Pair with <strong>{{ contrast.textColor === '#ffffff' ? 'light' : 'dark' }}</strong> text
          </span>
          <span class="cf-contrast-badge" :class="contrast.ok ? 'cf-badge-ok' : 'cf-badge-warn'">
            {{ contrast.ok ? 'AA ✓' : 'low' }} · {{ contrast.ratio }}:1
          </span>
        </div>

        <!-- Recent -->
        <template v-if="recentColors.length">
          <div class="cf-section-label">Recent</div>
          <div class="cf-presets">
            <button
              v-for="c in recentColors"
              :key="'r-' + c"
              type="button"
              class="cf-preset"
              :class="{ 'cf-preset--active': normalizedHex.toLowerCase() === c.toLowerCase() }"
              :style="{ background: c }"
              :title="c"
              @click="select(c)"
            >
              <svg v-if="normalizedHex.toLowerCase() === c.toLowerCase()" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>
        </template>

        <!-- Presets -->
        <div class="cf-section-label">Presets</div>
        <div class="cf-presets">
          <button
            v-for="c in PRESETS"
            :key="c"
            type="button"
            class="cf-preset"
            :class="{ 'cf-preset--active': normalizedHex.toLowerCase() === c.toLowerCase() }"
            :style="{ background: c }"
            :title="c"
            @click="select(c)"
          >
            <svg v-if="normalizedHex.toLowerCase() === c.toLowerCase()" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </div>
    </Transition>

    <p v-if="helper" class="helper">{{ helper }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ modelValue: string; label?: string; helper?: string }>();
const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const PRESETS = [
  '#0f172a', '#475569', '#94a3b8', '#e2e8f0',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#3f8dfe', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
];

const open = ref(false);
const wrapRef = ref<HTMLElement | null>(null);
const hexRef = ref<HTMLInputElement | null>(null);

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window;

// ── Recent colors (shared across every ColorField via localStorage) ───────────
const RECENT_KEY = 'kiuq-recent-colors';
const recentColors = ref<string[]>([]);

const loadRecents = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    recentColors.value = raw ? (JSON.parse(raw) as string[]).filter((c) => /^#[0-9a-fA-F]{6}$/.test(c)).slice(0, 10) : [];
  } catch { recentColors.value = []; }
};
const pushRecent = (hex: string) => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  const next = [hex, ...recentColors.value.filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, 10);
  recentColors.value = next;
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
};

// ── Contrast hint (WCAG relative luminance) ───────────────────────────────────
const relLum = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};
const contrast = computed(() => {
  const L = relLum(normalizedHex.value);
  const cWhite = (1 + 0.05) / (L + 0.05);
  const cBlack = (L + 0.05) / 0.05;
  const useWhite = cWhite >= cBlack;
  const ratio = useWhite ? cWhite : cBlack;
  return { textColor: useWhite ? '#ffffff' : '#0f172a', ratio: Math.round(ratio * 10) / 10, ok: ratio >= 4.5 };
});

// A valid #rrggbb for the native input + preview (falls back to brand blue).
const normalizedHex = computed(() => {
  const v = (props.modelValue || '').trim();
  return /^#?[0-9a-fA-F]{6}$/.test(v) ? (v.startsWith('#') ? v : `#${v}`) : '#3f8dfe';
});
const previewColor = computed(() => props.modelValue || '#ffffff');
const hexDigits = computed(() => (props.modelValue || '').replace('#', ''));

const update = (v: string) => emit('update:modelValue', v);

const onHexInput = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6);
  update(`#${raw}`);
};
const onNative = (e: Event) => update((e.target as HTMLInputElement).value);
const select = (c: string) => { update(c); pushRecent(c); };

const pickWithEyedropper = async () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = new (window as any).EyeDropper();
    const res = await ed.open();
    if (res?.sRGBHex) update(res.sRGBHex);
  } catch {
    /* user cancelled */
  }
};

const toggle = () => { open.value = !open.value; };
const close = () => {
  open.value = false;
  // Remember whatever color ended up selected.
  const v = (props.modelValue || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) pushRecent(v);
};

const onDocClick = (e: MouseEvent) => {
  if (open.value && wrapRef.value && !wrapRef.value.contains(e.target as Node)) close();
};
const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };

onMounted(() => {
  loadRecents();
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onEsc);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onEsc);
});
</script>

<style scoped>
.cf { position: relative; }

/* Trigger */
.cf-trigger {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--input-bg, var(--card-bg));
  color: var(--text-main);
  cursor: pointer;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}
.cf-trigger:hover { border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); }
.cf-trigger--open {
  border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.cf-swatch {
  display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; flex-shrink: 0;
  border-radius: 8px;
  color: rgba(255,255,255,0.85);
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.1);
  /* checkerboard so empty/transparent reads clearly */
  background-image:
    linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
    linear-gradient(-45deg, transparent 75%, #cbd5e1 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0;
}
.cf-value {
  flex: 1; text-align: left;
  font-family: 'Jost Numbers', 'Google Sans', monospace;
  font-size: 0.85rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cf-chevron { color: var(--text-muted); flex-shrink: 0; transition: transform 200ms ease; }
.cf-chevron--open { transform: rotate(180deg); }

/* Popover */
.cf-pop {
  position: absolute;
  z-index: 60;
  top: calc(100% + 0.4rem);
  left: 0;
  width: min(300px, 92vw);
  padding: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
}

.cf-preview {
  height: 3.25rem;
  border-radius: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 0.45rem;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}
.cf-preview-hex {
  font-family: 'Jost Numbers', 'Google Sans', monospace;
  font-size: 0.68rem; font-weight: 800;
  color: #fff;
  background: rgba(0,0,0,0.35);
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  backdrop-filter: blur(2px);
}

/* Controls row */
.cf-controls { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.7rem; }
.cf-hex {
  flex: 1;
  display: flex; align-items: center;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
  padding: 0 0.55rem;
  height: 2.25rem;
}
.cf-hash { color: var(--text-muted); font-weight: 800; font-family: monospace; }
.cf-hex-input {
  flex: 1; min-width: 0;
  border: none; background: transparent; outline: none;
  font-family: 'Jost Numbers', 'Google Sans', monospace;
  font-size: 0.85rem; font-weight: 700; text-transform: uppercase;
  color: var(--text-main);
  padding-left: 0.2rem;
}
.cf-tool {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.25rem; height: 2.25rem; flex-shrink: 0;
  border: 1px solid var(--border); border-radius: 10px;
  background: var(--soft-bg); color: var(--text-muted);
  cursor: pointer; overflow: hidden;
  transition: border-color 140ms, color 140ms, background 140ms;
}
.cf-tool:hover { border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); color: var(--primary); }
/* native color input fills the tool but stays invisible (icon shows through) */
.cf-native {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  opacity: 0; cursor: pointer; border: none; padding: 0;
}

/* Contrast hint */
.cf-contrast {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.7rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
}
.cf-contrast-sample {
  display: flex; align-items: center; justify-content: center;
  width: 1.85rem; height: 1.85rem; flex-shrink: 0;
  border-radius: 7px;
  font-family: 'Jost Numbers', 'Google Sans', serif;
  font-size: 0.82rem; font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
}
.cf-contrast-text { flex: 1; font-size: 0.76rem; color: var(--text-muted); }
.cf-contrast-text strong { color: var(--text-main); font-weight: 700; }
.cf-contrast-badge {
  flex-shrink: 0;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem; font-weight: 800;
  border-radius: 999px; padding: 0.12rem 0.5rem;
}
.cf-badge-ok { background: rgba(22,163,74,0.14); color: #16a34a; }
.cf-badge-warn { background: rgba(217,119,6,0.16); color: #d97706; }

/* Section label */
.cf-section-label {
  margin-top: 0.7rem; margin-bottom: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.64rem; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-muted);
}

/* Presets */
.cf-presets {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.3rem;
}
.cf-preset {
  aspect-ratio: 1;
  border-radius: 7px;
  border: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.cf-preset:hover { transform: scale(1.14); box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.25); }
.cf-preset--active {
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.12), 0 0 0 2px var(--card-bg), 0 0 0 4px var(--primary);
}

/* Transition */
.cf-pop-enter-active { transition: opacity 150ms ease, transform 170ms cubic-bezier(0.16,1,0.3,1); }
.cf-pop-leave-active { transition: opacity 120ms ease, transform 120ms ease; }
.cf-pop-enter-from, .cf-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(0.98); }
@media (prefers-reduced-motion: reduce) {
  .cf-pop-enter-active, .cf-pop-leave-active, .cf-chevron { transition: none; }
}
</style>
