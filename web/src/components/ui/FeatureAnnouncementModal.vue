<template>
  <Teleport to="body">
    <Transition name="fa-fade">
      <div v-if="show" class="fa-backdrop" role="dialog" aria-modal="true" aria-labelledby="fa-title" @click.self="onClose">
        <Transition name="fa-pop" appear>
          <div v-if="show" class="fa-card">
            <button class="fa-close" type="button" title="Close" @click="onClose">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            <!-- Header -->
            <header class="fa-header">
              <span class="fa-badge">System Update</span>
              <h2 id="fa-title" class="fa-title">New Features Added</h2>
              <p class="fa-subtitle">
                New workflow tools are now available to help the team track fixes,
                speed checks, and daily followups faster.
              </p>
            </header>

            <!-- Feature cards -->
            <div class="fa-grid">
              <article v-for="f in FEATURES" :key="f.key" class="fa-card-item" :style="{ '--accent': f.accent }">
                <div class="fa-icon" v-html="f.icon" />
                <h3 class="fa-item-title">{{ f.title }}</h3>
                <p class="fa-item-desc">{{ f.desc }}</p>
                <RouterLink :to="f.to" class="fa-item-cta" @click="markSeen()">
                  {{ f.cta }}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </RouterLink>
              </article>
            </div>

            <!-- Footer -->
            <footer class="fa-footer">
              <span class="fa-foot-note">This update will only appear once.</span>
              <div class="fa-foot-actions">
                <button class="btn-ghost" type="button" @click="onClose">View Later</button>
                <button class="btn-primary" type="button" :disabled="saving" @click="markSeen(true)">
                  {{ saving ? 'Saving…' : 'Got it' }}
                </button>
              </div>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

/**
 * Bump this key when announcing a new feature batch. Each user only sees
 * each key once. The DB unique constraint on (user_id, key) makes duplicate
 * inserts a no-op.
 */
const ANNOUNCEMENT_KEY = 'new_features_2026_05_quality_speed_ebay';

interface Feature {
  key: string;
  title: string;
  desc: string;
  to: string;
  cta: string;
  accent: string;
  icon: string;
}

const FEATURES: Feature[] = [
  {
    key: 'quality_check',
    title: 'Quality Check',
    desc: 'Track website issues, paste screenshots, assign fixes, and review work by website.',
    to: '/work-board/quality-check',
    cta: 'Open Quality Check',
    accent: '#15D6C2',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
  },
  {
    key: 'speed_followup',
    title: 'Website Speed Optimization',
    desc: 'Complete weekly speed checks to keep websites faster and WordPress smoother.',
    to: '/followup/speed-optimization',
    cta: 'Open Speed Check',
    accent: '#8b5cf6',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  },
  {
    key: 'ebay_followup',
    title: 'eBay Click Followup',
    desc: 'Daily checklist for Monday to Saturday. Simple done tracking for the team.',
    to: '/followup/ebay-click',
    cta: 'Open eBay Followup',
    accent: '#10b981',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  },
];

const auth   = useAuthStore();
const show   = ref(false);
const saving = ref(false);

const checkSeen = async () => {
  if (!supabaseConfigured || !auth.user?.id) return;
  try {
    const { data, error } = await supabase
      .from('feature_announcements_seen')
      .select('id')
      .eq('user_id', auth.user.id)
      .eq('announcement_key', ANNOUNCEMENT_KEY)
      .maybeSingle();
    if (error) {
      // Don't block the dashboard on any error.
      if (import.meta.env.DEV) console.warn('[announcement] check failed', error.message);
      return;
    }
    show.value = !data;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[announcement] check threw', e);
  }
};

/**
 * Persist seen-status. Called when the user clicks "Got it" or any feature CTA.
 * `× / View Later` close the popup without writing — the popup will reappear
 * next session in that case.
 */
const markSeen = async (closeAfter = false) => {
  if (!auth.user?.id || !supabaseConfigured) { show.value = false; return; }
  saving.value = true;
  try {
    const { error } = await supabase
      .from('feature_announcements_seen')
      .upsert(
        { user_id: auth.user.id, announcement_key: ANNOUNCEMENT_KEY },
        { onConflict: 'user_id,announcement_key', ignoreDuplicates: true }
      );
    if (error && import.meta.env.DEV) console.warn('[announcement] mark failed', error.message);
    if (closeAfter) show.value = false;
  } finally {
    saving.value = false;
  }
};

const onClose = () => { show.value = false; };

// Esc-to-close while open
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
watch(show, (v) => {
  if (v) {
    document.addEventListener('keydown', onKey);
    // Prevent background scroll while the modal is up
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
  }
});

onMounted(() => { checkSeen(); });
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<style scoped>
/* ── Backdrop ───────────────────────────────────────────────────────── */
.fa-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: rgba(8, 12, 20, 0.42);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

/* ── Card ──────────────────────────────────────────────────────────── */
.fa-card {
  position: relative;
  width: 100%;
  max-width: 820px;
  max-height: calc(100vh - 2.5rem);
  overflow-y: auto;
  border-radius: 22px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  box-shadow:
    0 28px 70px rgba(8, 12, 20, 0.32),
    0 8px 22px rgba(8, 12, 20, 0.18);
  padding: 2rem 2.1rem 1.4rem;
}

.fa-close {
  position: absolute;
  top: 1.05rem;
  right: 1.05rem;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 140ms, border-color 140ms, background 140ms;
}
.fa-close:hover { color: var(--text-main); border-color: var(--text-muted); }

/* ── Header ─────────────────────────────────────────────────────────── */
.fa-header {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding-right: 2rem;   /* room for the × button */
}
.fa-badge {
  display: inline-flex;
  align-self: flex-start;
  align-items: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  border-radius: 999px;
  padding: 0.18rem 0.6rem;
}
.fa-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.45rem;
  font-weight: 850;
  letter-spacing: -0.01em;
  color: var(--text-main);
}
.fa-subtitle {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-muted);
  max-width: 56ch;
}

/* ── Feature grid ──────────────────────────────────────────────────── */
.fa-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
}
@media (max-width: 760px) { .fa-grid { grid-template-columns: 1fr; } }

.fa-card-item {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.1rem 1.1rem 1.2rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--soft-bg) 45%, var(--card-bg));
  transition: border-color 180ms, transform 180ms, box-shadow 180ms;
}
.fa-card-item:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  transform: translateY(-2px);
  box-shadow: 0 10px 26px color-mix(in srgb, var(--accent) 14%, transparent);
}

.fa-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  color: var(--accent);
  margin-bottom: 0.15rem;
}

.fa-item-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.25;
}

.fa-item-desc {
  margin: 0;
  font-size: 0.84rem;
  line-height: 1.5;
  color: var(--text-muted);
  flex: 1;
}

.fa-item-cta {
  margin-top: 0.2rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  align-self: flex-start;
  border: none;
  background: transparent;
  color: var(--accent);
  padding: 0;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
  transition: gap 160ms, opacity 140ms;
}
.fa-item-cta:hover { gap: 0.55rem; opacity: 0.9; }

/* ── Footer ─────────────────────────────────────────────────────────── */
.fa-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1.4rem;
  padding-top: 1.1rem;
  border-top: 1px solid var(--border);
}
.fa-foot-note {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.fa-foot-actions {
  display: inline-flex;
  gap: 0.6rem;
}

/* ── Animations ─────────────────────────────────────────────────────── */
.fa-fade-enter-active,
.fa-fade-leave-active { transition: opacity 220ms ease; }
.fa-fade-enter-from,
.fa-fade-leave-to { opacity: 0; }

.fa-pop-enter-active { transition: opacity 260ms ease, transform 280ms cubic-bezier(0.16, 1, 0.3, 1); }
.fa-pop-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.fa-pop-enter-from   { opacity: 0; transform: translateY(8px) scale(0.97); }
.fa-pop-leave-to     { opacity: 0; transform: translateY(4px) scale(0.985); }

@media (prefers-reduced-motion: reduce) {
  .fa-fade-enter-active,
  .fa-fade-leave-active,
  .fa-pop-enter-active,
  .fa-pop-leave-active { transition: none !important; }
  .fa-card-item        { transition: none !important; }
}

/* ── Mobile polish ──────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .fa-card { padding: 1.5rem 1.2rem 1.1rem; border-radius: 18px; }
  .fa-title { font-size: 1.25rem; }
  .fa-header { padding-right: 2.25rem; margin-bottom: 1.15rem; }
  .fa-footer { justify-content: stretch; }
  .fa-foot-actions { width: 100%; justify-content: flex-end; }
}
</style>
