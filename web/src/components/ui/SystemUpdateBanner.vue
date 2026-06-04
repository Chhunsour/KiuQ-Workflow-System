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
  max-width: 420px;
  background: rgba(30, 41, 59, 0.75);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.35),
    0 8px 24px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color 0.2s ease;
}

/* Gradient Outer Glow Backdrops */
.sub-glow {
  position: absolute;
  top: -60px;
  left: -60px;
  width: 160px;
  height: 160px;
  border-radius: 50%;
  filter: blur(50px);
  opacity: 0.15;
  pointer-events: none;
  z-index: 0;
  transition: all 0.3s ease;
}

.sub-banner--feature .sub-glow {
  background: #8b5cf6;
}
.sub-banner--fix .sub-glow {
  background: #f43f5e;
}
.sub-banner--improvement .sub-glow {
  background: #10b981;
}
.sub-banner--announcement .sub-glow {
  background: #f59e0b;
}

/* Premium Left Accent Border */
.sub-banner::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 5px;
  border-radius: 5px 0 0 5px;
  z-index: 1;
}
.sub-banner--feature::before { background: linear-gradient(to bottom, #8b5cf6, #d946ef); }
.sub-banner--fix::before { background: linear-gradient(to bottom, #f43f5e, #e11d48); }
.sub-banner--improvement::before { background: linear-gradient(to bottom, #10b981, #059669); }
.sub-banner--announcement::before { background: linear-gradient(to bottom, #f59e0b, #d97706); }

.sub-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 1.75rem;
  height: 1.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  z-index: 2;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sub-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg) scale(1.05);
}

.sub-body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sub-meta {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.sub-icon-wrap {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.sub-icon-wrap--feature {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(217, 70, 239, 0.1));
  color: #c084fc;
  border: 1px solid rgba(139, 92, 246, 0.25);
}
.sub-icon-wrap--fix {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.2), rgba(225, 29, 72, 0.1));
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.25);
}
.sub-icon-wrap--improvement {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.1));
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.sub-icon-wrap--announcement {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1));
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.sub-header-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sub-label-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.sub-badge {
  font-family: 'Outfit', 'Google Sans', sans-serif;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  line-height: 1;
}

.sub-badge--feature {
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
}
.sub-badge--fix {
  background: rgba(244, 63, 94, 0.15);
  color: #fda4af;
}
.sub-badge--improvement {
  background: rgba(16, 185, 129, 0.15);
  color: #6ee7b7;
}
.sub-badge--announcement {
  background: rgba(245, 158, 11, 0.15);
  color: #fde047;
}

.sub-test-badge {
  font-size: 0.62rem;
  font-weight: 800;
  color: #c084fc;
  background: rgba(168, 85, 247, 0.15);
  border: 1px solid rgba(168, 85, 247, 0.3);
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  line-height: 1;
}

.sub-date {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
}

.sub-details {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sub-title {
  font-family: 'Raleway', 'Outfit', sans-serif;
  font-size: 1.15rem;
  font-weight: 850;
  color: #ffffff;
  margin: 0;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.sub-message {
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.sub-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
}

.sub-btn-readmore {
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
}
.sub-btn-readmore:hover {
  color: #ffffff;
  opacity: 0.9;
}
.sub-btn-readmore:hover .sub-btn-arrow {
  transform: translateX(3px);
}
.sub-btn-arrow {
  transition: transform 0.2s ease;
}

.sub-btn-dismiss {
  font-family: 'Outfit', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  border: none;
  border-radius: 10px;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.sub-btn-dismiss--feature {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: #ffffff;
}
.sub-btn-dismiss--feature:hover {
  background: linear-gradient(135deg, #9065f7, #8445f0);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 14px rgba(139, 92, 246, 0.35);
}

.sub-btn-dismiss--fix {
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: #ffffff;
}
.sub-btn-dismiss--fix:hover {
  background: linear-gradient(135deg, #f54d6a, #e52c55);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 14px rgba(244, 63, 94, 0.35);
}

.sub-btn-dismiss--improvement {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #ffffff;
}
.sub-btn-dismiss--improvement:hover {
  background: linear-gradient(135deg, #17c28b, #06a171);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 14px rgba(16, 185, 129, 0.35);
}

.sub-btn-dismiss--announcement {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
}
.sub-btn-dismiss--announcement:hover {
  background: linear-gradient(135deg, #fba81b, #e07f12);
  transform: translateY(-1.5px);
  box-shadow: 0 6px 14px rgba(245, 158, 11, 0.35);
}

.sub-btn-dismiss:active {
  transform: translateY(0);
}

/* Pulse animation for Testing badge */
.pulse {
  box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.5);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(168, 85, 247, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
  }
}

/* Animations */
.sub-slide-enter-active,
.sub-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.sub-slide-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.92);
}
.sub-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

@media (max-width: 480px) {
  .sub-banner {
    bottom: 16px;
    right: 16px;
    left: 16px;
    max-width: calc(100% - 32px);
    padding: 1.2rem;
  }
}
</style>
