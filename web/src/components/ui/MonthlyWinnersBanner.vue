<template>
  <Teleport to="body">
    <Transition name="mw-fade">
      <div v-if="open" class="mw-overlay" @click.self="dismiss">
        <div class="mw-card">
          <!-- Confetti + floating emojis -->
          <div class="mw-confetti" aria-hidden="true">
            <span v-for="i in 22" :key="i" :style="{ '--i': i }" />
          </div>
          <div class="mw-floaties" aria-hidden="true">
            <span class="mw-float mw-float--1">🎉</span>
            <span class="mw-float mw-float--2">⭐</span>
            <span class="mw-float mw-float--3">🎊</span>
            <span class="mw-float mw-float--4">✨</span>
          </div>

          <span v-if="preview" class="mw-preview">Preview</span>
          <button class="mw-close" type="button" aria-label="Close" @click="dismiss">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>

          <!-- Header -->
          <div class="mw-head">
            <div class="mw-trophy">🏆</div>
            <h2 class="mw-title">{{ monthLabel }} Champions</h2>
            <p class="mw-sub">The results are in — here's who crushed it! 🔥</p>
          </div>

          <div v-if="loading" class="mw-loading">Loading results…</div>
          <div v-else-if="winners.length === 0" class="mw-empty">No ranked activity for {{ monthLabel }} yet.</div>

          <template v-else>
            <!-- Podium (2 · 1 · 3) -->
            <div class="mw-podium">
              <!-- 2nd -->
              <div v-if="winners[1]" class="mw-col">
                <div class="mw-person">
                  <span class="mw-ava">
                    <img v-if="winners[1].avatarUrl" :src="winners[1].avatarUrl" :alt="winners[1].fullName" />
                    <span v-else>{{ initials(winners[1].fullName) }}</span>
                    <span class="mw-medal">🥈</span>
                  </span>
                  <span class="mw-name">{{ firstName(winners[1].fullName) }}</span>
                  <span class="mw-pts">{{ formatNumber(winners[1].totalPoints) }} pts</span>
                </div>
                <div class="mw-stand mw-stand--2"><span class="mw-stand-num">2</span></div>
              </div>

              <!-- 1st -->
              <div v-if="winners[0]" class="mw-col mw-col--champ">
                <div class="mw-crown" aria-hidden="true">👑</div>
                <div class="mw-person">
                  <span class="mw-ava mw-ava--champ">
                    <img v-if="winners[0].avatarUrl" :src="winners[0].avatarUrl" :alt="winners[0].fullName" />
                    <span v-else>{{ initials(winners[0].fullName) }}</span>
                    <span class="mw-medal mw-medal--champ">🥇</span>
                  </span>
                  <span class="mw-name mw-name--champ">{{ firstName(winners[0].fullName) }}</span>
                  <span class="mw-pts mw-pts--champ">{{ formatNumber(winners[0].totalPoints) }} pts</span>
                </div>
                <div class="mw-stand mw-stand--1"><span class="mw-stand-num">1</span></div>
              </div>

              <!-- 3rd -->
              <div v-if="winners[2]" class="mw-col">
                <div class="mw-person">
                  <span class="mw-ava">
                    <img v-if="winners[2].avatarUrl" :src="winners[2].avatarUrl" :alt="winners[2].fullName" />
                    <span v-else>{{ initials(winners[2].fullName) }}</span>
                    <span class="mw-medal">🥉</span>
                  </span>
                  <span class="mw-name">{{ firstName(winners[2].fullName) }}</span>
                  <span class="mw-pts">{{ formatNumber(winners[2].totalPoints) }} pts</span>
                </div>
                <div class="mw-stand mw-stand--3"><span class="mw-stand-num">3</span></div>
              </div>
            </div>

            <!-- Champion gift callout -->
            <div class="mw-gift">
              <span class="mw-gift-emoji">🎁</span>
              <div class="mw-gift-text">
                <strong>{{ firstName(winners[0].fullName) }} is the champion!</strong>
                <span>Go ask a gift from Sour xD</span>
              </div>
            </div>

            <!-- 4th — honorable mention -->
            <div v-if="winners[3]" class="mw-hm">
              <span class="mw-hm-rank">4</span>
              <span class="mw-hm-avatar">
                <img v-if="winners[3].avatarUrl" :src="winners[3].avatarUrl" :alt="winners[3].fullName" />
                <span v-else>{{ initials(winners[3].fullName) }}</span>
              </span>
              <span class="mw-hm-text"><strong>{{ winners[3].fullName }}</strong> took 4th — also crushing it! 💪</span>
              <span class="mw-hm-pts">{{ formatNumber(winners[3].totalPoints) }} pts</span>
            </div>
          </template>

          <button class="mw-cta" type="button" @click="goLeaderboard">
            See the full leaderboard →
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

interface Winner { memberId: string; fullName: string; avatarUrl: string; totalPoints: number; rank: number }

const router = useRouter();
const auth = useAuthStore();

const open = ref(false);
const preview = ref(false);
const loading = ref(false);
const winners = ref<Winner[]>([]);

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Previous calendar month (the one we celebrate).
const prevMonth = (() => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
})();

const monthLabel = ref(prevMonth.label);

const seenKey = () => `kiuq-winners-seen:${auth.user?.id ?? 'anon'}:${prevMonth.key}`;

const fetchWinners = async (monthKey: string) => {
  loading.value = true;
  try {
    const { data, error } = await supabase.rpc('get_team_leaderboard', { p_month_key: monthKey });
    if (error) throw error;
    const rows = (Array.isArray(data) ? data : []) as {
      member_id: string; full_name: string; avatar_url: string | null; total_points: number; rank: number;
    }[];
    winners.value = rows.slice(0, 4).map((r) => ({
      memberId: r.member_id,
      fullName: r.full_name || 'Team member',
      avatarUrl: r.avatar_url || '',
      totalPoints: r.total_points,
      rank: r.rank,
    }));
  } catch (e) {
    console.error('[winners-banner] fetch failed', e);
    winners.value = [];
  } finally {
    loading.value = false;
  }
};

// Open the real banner (previous month, not a preview).
const openReal = async () => {
  preview.value = false;
  monthLabel.value = prevMonth.label;
  open.value = true;
  await fetchWinners(prevMonth.key);
};

// Auto-show once per month — for ADMINS only. Team members reach the banner
// at the end of their personal MonthlyRecap, which fires 'show-winners-banner'.
const checkAuto = async () => {
  if (!supabaseConfigured || !auth.user?.id) return;
  if (!auth.isAdmin) return;
  if (localStorage.getItem(seenKey()) === '1') return;
  preview.value = false;
  monthLabel.value = prevMonth.label;
  await fetchWinners(prevMonth.key);
  if (winners.value.length > 0 && winners.value[0].totalPoints > 0) open.value = true;
};

// Admin/head preview — always opens, never marks "seen".
const openPreview = async () => {
  preview.value = true;
  monthLabel.value = prevMonth.label;
  open.value = true;
  await fetchWinners(prevMonth.key);
  if (winners.value.length === 0 || winners.value[0]?.totalPoints === 0) {
    const d = new Date();
    const curKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthLabel.value = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    await fetchWinners(curKey);
  }
};

const dismiss = () => {
  open.value = false;
  if (!preview.value && auth.user?.id) localStorage.setItem(seenKey(), '1');
};

const goLeaderboard = () => {
  dismiss();
  if (router.currentRoute.value.path !== '/leaderboard') router.push('/leaderboard');
};

const formatNumber = (v: number) => new Intl.NumberFormat().format(v);
const firstName = (name: string) => (name || 'Member').split(/\s+/)[0];
const initials = (name: string) =>
  (name || '?').split(/[\s@.]+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();

const onPreviewEvent = () => { void openPreview(); };
const onShowEvent = () => { void openReal(); };

onMounted(() => {
  window.addEventListener('open-winners-banner', onPreviewEvent);
  window.addEventListener('show-winners-banner', onShowEvent);
  void checkAuto();
});
onBeforeUnmount(() => {
  window.removeEventListener('open-winners-banner', onPreviewEvent);
  window.removeEventListener('show-winners-banner', onShowEvent);
});
</script>

<style scoped>
.mw-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(8, 11, 20, 0.66);
  backdrop-filter: blur(6px);
}
.mw-card {
  position: relative;
  width: min(440px, 100%);
  max-height: 92vh;
  overflow-y: auto;
  border-radius: 26px;
  background: var(--card-bg);
  border: 1px solid color-mix(in srgb, #f59e0b 42%, var(--border));
  box-shadow: 0 0 0 1px color-mix(in srgb, #f59e0b 16%, transparent), 0 40px 90px rgba(0,0,0,0.45);
  padding: 1.9rem 1.5rem 1.45rem;
  text-align: center;
}

/* Preview pill — top-left, clear of the trophy */
.mw-preview {
  position: absolute; top: 1rem; left: 1rem; z-index: 4;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.58rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--text-muted); background: var(--soft-bg);
  border: 1px solid var(--border); border-radius: 999px; padding: 0.18rem 0.6rem;
}
.mw-close {
  position: absolute; top: 0.9rem; right: 0.9rem; z-index: 4;
  display: inline-flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; border: none; border-radius: 999px;
  background: var(--soft-bg); color: var(--text-muted); cursor: pointer; transition: background 140ms;
}
.mw-close:hover { background: var(--border); color: var(--text-main); }

/* Confetti */
.mw-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; border-radius: 26px; }
.mw-confetti span {
  position: absolute; top: -16px; width: 8px; height: 15px; border-radius: 2px; opacity: 0;
  left: calc(var(--i) * 4.4%);
  background: hsl(calc(var(--i) * 33deg), 90%, 62%);
  animation: mw-fall 3s ease-in calc(var(--i) * 0.08s) infinite;
}
.mw-confetti span:nth-child(3n) { border-radius: 50%; width: 9px; height: 9px; }
@keyframes mw-fall { 0% { opacity: 0; transform: translate(0,-10px) rotate(0); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(calc(var(--i) * 0.5px - 14px), 460px) rotate(560deg); } }

/* Floating emojis */
.mw-floaties { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.mw-float { position: absolute; font-size: 1.3rem; opacity: 0.8; animation: mw-bob 3.6s ease-in-out infinite; }
.mw-float--1 { left: 7%;  top: 16%; animation-delay: 0s; }
.mw-float--2 { right: 9%; top: 13%; animation-delay: 0.7s; }
.mw-float--3 { left: 11%; bottom: 20%; animation-delay: 1.2s; }
.mw-float--4 { right: 8%; bottom: 24%; animation-delay: 1.7s; }
@keyframes mw-bob { 0%,100% { transform: translateY(0) rotate(-7deg); } 50% { transform: translateY(-10px) rotate(7deg); } }

/* Header */
.mw-head { position: relative; z-index: 2; }
.mw-trophy { font-size: 2.9rem; line-height: 1; margin-bottom: 0.2rem; animation: mw-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) both, mw-bob 3s ease-in-out 0.6s infinite; }
@keyframes mw-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); } 100% { transform: scale(1); opacity: 1; } }
.mw-title {
  margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.55rem; font-weight: 900; color: var(--text-main); line-height: 1.1;
}
.mw-sub { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.85rem; }

.mw-loading, .mw-empty { padding: 2rem 0; color: var(--text-muted); font-size: 0.88rem; position: relative; z-index: 2; }

/* ── Podium ── */
.mw-podium {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  align-items: end;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
.mw-col { display: flex; flex-direction: column; align-items: center; min-width: 0; }
.mw-col--champ { animation: mw-rise 0.55s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
.mw-col:not(.mw-col--champ):nth-of-type(1) { animation: mw-rise 0.55s cubic-bezier(0.16,1,0.3,1) 0.25s both; }
.mw-col:not(.mw-col--champ):nth-of-type(3) { animation: mw-rise 0.55s cubic-bezier(0.16,1,0.3,1) 0.4s both; }
@keyframes mw-rise { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }

.mw-crown { font-size: 1.5rem; line-height: 1; margin-bottom: 0.15rem; animation: mw-bob 2.4s ease-in-out infinite; }

.mw-person { display: flex; flex-direction: column; align-items: center; gap: 0.1rem; margin-bottom: 0.55rem; }

.mw-ava {
  position: relative;
  display: flex; align-items: center; justify-content: center;
  width: 3.2rem; height: 3.2rem; border-radius: 999px; overflow: visible;
  background: var(--card-bg); color: var(--primary);
  border: 2.5px solid var(--border);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.88rem; font-weight: 900;
}
.mw-ava img { width: 100%; height: 100%; object-fit: cover; border-radius: 999px; }
.mw-ava > span:not(.mw-medal) { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.mw-ava--champ {
  width: 4.6rem; height: 4.6rem; font-size: 1.2rem;
  border-color: #f59e0b;
  box-shadow: 0 0 0 4px color-mix(in srgb, #f59e0b 20%, transparent), 0 0 28px color-mix(in srgb, #f59e0b 55%, transparent);
}
.mw-medal {
  position: absolute; bottom: -0.35rem; left: 50%; transform: translateX(-50%);
  font-size: 0.95rem; line-height: 1;
  background: var(--card-bg); border-radius: 999px; padding: 0 0.1rem;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
}
.mw-medal--champ { font-size: 1.15rem; bottom: -0.45rem; }

.mw-name {
  margin-top: 0.5rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.85rem; font-weight: 800; color: var(--text-main);
  max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mw-name--champ { font-size: 0.98rem; }
.mw-pts { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); }
.mw-pts--champ { color: #f59e0b; font-size: 0.82rem; font-weight: 800; }

/* Stands */
.mw-stand {
  position: relative;
  width: 100%;
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 0.55rem;
  border-radius: 14px 14px 0 0;
  background: var(--soft-bg);
  border: 1px solid var(--border); border-bottom: none;
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.05);
}
.mw-stand--1 { height: 6rem; }
.mw-stand--2 { height: 4rem; }
.mw-stand--3 { height: 3rem; }
.mw-stand--1 {
  background: color-mix(in srgb, #f59e0b 18%, var(--soft-bg));
  border-color: color-mix(in srgb, #f59e0b 48%, var(--border));
  box-shadow: inset 0 2px 0 rgba(255,255,255,0.12), 0 -8px 26px -10px color-mix(in srgb, #f59e0b 60%, transparent);
}
.mw-stand-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.7rem; font-weight: 900; color: var(--text-muted); opacity: 0.5;
}
.mw-stand--1 .mw-stand-num { font-size: 2.2rem; color: #d97706; opacity: 0.9; }

/* Gift callout */
.mw-gift {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 0.75rem;
  margin-top: 1.1rem; padding: 0.8rem 0.95rem;
  border-radius: 16px;
  background: color-mix(in srgb, #f59e0b 12%, var(--card-bg));
  border: 1.5px dashed color-mix(in srgb, #f59e0b 58%, var(--border));
  text-align: left;
}
.mw-gift-emoji { font-size: 1.85rem; line-height: 1; animation: mw-wiggle 1.8s ease-in-out infinite; flex-shrink: 0; }
@keyframes mw-wiggle { 0%,100% { transform: rotate(-8deg) scale(1); } 50% { transform: rotate(10deg) scale(1.12); } }
.mw-gift-text { display: flex; flex-direction: column; gap: 0.05rem; }
.mw-gift-text strong { font-size: 0.92rem; font-weight: 800; color: var(--text-main); }
.mw-gift-text span { font-size: 0.95rem; font-weight: 800; color: #d97706; }

/* 4th honorable mention */
.mw-hm {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 0.65rem;
  margin-top: 0.7rem; padding: 0.55rem 0.7rem;
  border-radius: 13px; border: 1px solid var(--border);
  background: color-mix(in srgb, var(--soft-bg) 45%, var(--card-bg));
  text-align: left;
}
.mw-hm-rank {
  flex-shrink: 0; width: 1.5rem; text-align: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.95rem; font-weight: 900; color: var(--text-muted);
}
.mw-hm-avatar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; border-radius: 999px; overflow: hidden;
  background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.66rem; font-weight: 800;
}
.mw-hm-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mw-hm-text { flex: 1; min-width: 0; font-size: 0.78rem; color: var(--text-muted); }
.mw-hm-text strong { color: var(--text-main); font-weight: 700; }
.mw-hm-pts { flex-shrink: 0; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.82rem; font-weight: 800; color: var(--text-main); }

/* CTA */
.mw-cta {
  position: relative; overflow: hidden; z-index: 2;
  margin-top: 1.25rem; width: 100%;
  padding: 0.78rem 1rem; border: none; border-radius: 14px; cursor: pointer;
  background: #f59e0b;
  color: #fff; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.92rem; font-weight: 800;
  box-shadow: 0 10px 26px -6px color-mix(in srgb, #f59e0b 65%, transparent);
  transition: transform 140ms ease, box-shadow 140ms ease;
}
.mw-cta::after {
  content: ''; position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
  background: transparent;
  transform: skewX(-20deg);
}
.mw-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 32px -6px color-mix(in srgb, #f59e0b 75%, transparent); }
@keyframes mw-shimmer { 0% { left: -60%; } 55%,100% { left: 130%; } }

/* Transition */
.mw-fade-enter-active { transition: opacity 180ms ease; }
.mw-fade-leave-active { transition: opacity 140ms ease; }
.mw-fade-enter-from, .mw-fade-leave-to { opacity: 0; }
.mw-fade-enter-active .mw-card { animation: mw-zoom 280ms cubic-bezier(0.16, 1, 0.3, 1); }
@keyframes mw-zoom { from { transform: translateY(14px) scale(0.94); opacity: 0; } to { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .mw-confetti span, .mw-float, .mw-trophy, .mw-crown, .mw-gift-emoji, .mw-col, .mw-cta::after, .mw-fade-enter-active .mw-card { animation: none; }
}
</style>
