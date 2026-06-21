<template>
  <Transition name="sub-slide">
    <div v-if="show && activeUpdate" class="sub-banner card" :class="`sub-banner--${activeUpdate.type}`">
      <!-- Glow effect backdrop -->
      <div class="sub-glow" />

      <button class="sub-close" type="button" aria-label="Close" @click="onClose">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div class="sub-body">
        <div class="sub-meta">
          <div class="sub-icon-wrap" :class="`sub-icon-wrap--${activeUpdate.type}`">
            <span class="sub-icon" v-html="typeIcon(activeUpdate.type)" />
          </div>
          <div class="sub-header-info">
            <div class="sub-label-row">
              <span class="sub-badge" :class="`sub-badge--${activeUpdate.type}`">
                {{ activeUpdate.type }}
              </span>
              <span v-if="isTesting" class="sub-test-badge pulse">Testing Preview</span>
            </div>
            <span class="sub-date">{{ formattedDate(activeUpdate.createdAt) }}</span>
          </div>
        </div>

        <div class="sub-details">
          <h4 class="sub-title">{{ activeUpdate.title }}</h4>
          <p class="sub-message">{{ activeUpdate.message }}</p>
        </div>

        <div class="sub-actions">
          <a
            v-if="activeUpdate.readMoreUrl"
            :href="activeUpdate.readMoreUrl"
            target="_blank"
            rel="noopener"
            class="sub-btn-readmore"
            @click="onReadMore"
          >
            Read details
            <svg class="sub-btn-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <button class="sub-btn-dismiss" :class="`sub-btn-dismiss--${activeUpdate.type}`" type="button" @click="onDismiss">
            Got it
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import type { SystemUpdate } from '@/stores/data';

const auth = useAuthStore();
const show = ref(false);
const activeUpdate = ref<SystemUpdate | null>(null);
const isTesting = ref(false);

const loadLatestUpdate = async () => {
  if (!supabaseConfigured || !auth.user?.id) return;

  try {
    const { data, error } = await supabase
      .from('system_updates')
      .select('*')
      .eq('is_official', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) console.warn('[system-update] fetch failed', error.message);
      return;
    }

    if (data) {
      const update: SystemUpdate = {
        id: data.id,
        updateId: data.update_id,
        type: data.type,
        title: data.title,
        message: data.message,
        readMoreUrl: data.read_more_url,
        isOfficial: data.is_official,
        createdBy: data.created_by,
        createdAt: data.created_at
      };

      // If different from what the user has seen, show it
      if (update.updateId !== auth.profile?.lastSeenUpdateId) {
        activeUpdate.value = update;
        isTesting.value = false;
        show.value = true;
      }
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[system-update] load error', err);
  }
};

const markAsSeen = async (updateId: string) => {
  if (isTesting.value) return; // Don't write to DB during testing preview
  if (!auth.user?.id || !supabaseConfigured) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ last_seen_update_id: updateId })
      .eq('id', auth.user.id);

    if (!error && auth.profile) {
      auth.profile.lastSeenUpdateId = updateId;
    }
  } catch (err) {
    console.error('[system-update] failed to save seen status', err);
  }
};

const onClose = async () => {
  if (activeUpdate.value) {
    await markAsSeen(activeUpdate.value.updateId);
  }
  show.value = false;
};

const onDismiss = async () => {
  if (activeUpdate.value) {
    await markAsSeen(activeUpdate.value.updateId);
  }
  show.value = false;
};

const onReadMore = async () => {
  if (activeUpdate.value) {
    await markAsSeen(activeUpdate.value.updateId);
  }
  show.value = false;
};

const formattedDate = (dStr?: string) => {
  if (!dStr) return 'Just now';
  try {
    const d = new Date(dStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Just now';
  }
};

const typeIcon = (type: string) => {
  if (type === 'feature') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.886L4.202 9 10.09 10.912 12 16.798l1.912-5.886L19.798 10l-5.886-1.912z"/></svg>`;
  }
  if (type === 'fix') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
  }
  if (type === 'improvement') {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.5 8.5-5-5L1 18"/><polyline points="16 7 22 7 22 13"/></svg>`;
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .738-1.674l-2-2.222A2 2 0 0 1 18 11.778V8c0-3.07-1.64-5.64-4.5-6.32V1a1.5 1.5 0 0 0-3 0v.68C7.639 2.36 6 4.93 6 8v3.778c0 .647-.26 1.27-.738 1.702l-2 2.222z"/></svg>`;
};

// Listen to custom local preview testing event
const onTestUpdate = (e: Event) => {
  const customEvent = e as CustomEvent<SystemUpdate>;
  if (customEvent.detail) {
    activeUpdate.value = customEvent.detail;
    isTesting.value = true;
    show.value = true;
  }
};

onMounted(() => {
  loadLatestUpdate();
  window.addEventListener('test-system-update', onTestUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener('test-system-update', onTestUpdate);
});
</script>

<style scoped>
.sub-banner {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 100;
  width: 100%;
  max-width: 400px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  padding: 1.35rem 1.4rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Left accent — KiuQ Blue */
.sub-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 3px;
  background: var(--primary);
}

.sub-glow { display: none; }

.sub-close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  width: 1.7rem;
  height: 1.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  z-index: 2;
  transition: background 0.2s ease, color 0.2s ease;
}
.sub-close:hover { background: var(--soft-bg); color: var(--text-main); }

.sub-body { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.9rem; }
.sub-meta { display: flex; align-items: center; gap: 0.8rem; }

.sub-icon-wrap {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--primary-soft);
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}

.sub-header-info { display: flex; flex-direction: column; gap: 0.15rem; }
.sub-label-row { display: flex; align-items: center; gap: 0.4rem; }

.sub-badge {
  font-family: 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  line-height: 1;
  background: var(--soft-bg);
  color: var(--text-muted);
}

.sub-test-badge {
  font-size: 0.6rem;
  font-weight: 800;
  color: var(--primary);
  background: var(--primary-soft);
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  line-height: 1;
}

.sub-date { font-size: 0.7rem; color: var(--text-soft); }

.sub-details { display: flex; flex-direction: column; gap: 0.3rem; }
.sub-title {
  font-family: 'Raleway', sans-serif;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.01em;
}
.sub-message { font-size: 0.84rem; line-height: 1.5; color: var(--text-muted); margin: 0; }

.sub-actions { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 0.4rem; }
.sub-btn-readmore {
  font-size: 0.8rem;
  font-weight: 800;
  color: var(--text-muted);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: color 0.2s ease;
}
.sub-btn-readmore:hover { color: var(--primary); }
.sub-btn-readmore:hover .sub-btn-arrow { transform: translateX(3px); }
.sub-btn-arrow { transition: transform 0.2s ease; }

.sub-btn-dismiss {
  font-family: 'Google Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 800;
  border: none;
  border-radius: 10px;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  background: var(--primary);
  color: #04201d;
  transition: background 0.18s ease, transform 0.18s ease;
}
.sub-btn-dismiss:hover { background: var(--primary-hover); transform: translateY(-1px); }
.sub-btn-dismiss:active { transform: translateY(0); }

/* One-shot pulse for the Testing badge */
.sub-test-badge.pulse { animation: pulse 2s infinite; }
@keyframes pulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 45%, transparent); }
  70%  { box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent); }
}

.sub-slide-enter-active,
.sub-slide-leave-active { transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }
.sub-slide-enter-from { opacity: 0; transform: translateY(20px) scale(0.96); }
.sub-slide-leave-to { opacity: 0; transform: translateY(14px) scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .sub-slide-enter-active, .sub-slide-leave-active { transition: none; }
}

@media (max-width: 480px) {
  .sub-banner { bottom: 16px; right: 16px; left: 16px; max-width: calc(100% - 32px); padding: 1.15rem; }
}
</style>
