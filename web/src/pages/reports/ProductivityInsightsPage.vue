<template>
  <div class="productivity-insights-page flex flex-col gap-6">
    <!-- AI Kicker Banner -->
    <div class="card card-pad bg-gradient-to-r from-primary/10 via-pink-500/5 to-indigo-500/10 border border-primary/20 flex items-center gap-4 relative overflow-hidden">
      <!-- Ambient background decoration -->
      <div class="absolute -right-10 -bottom-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
      <div class="absolute -left-10 -top-10 w-40 h-40 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div class="icon-tile text-primary bg-primary/15 flex-shrink-0 animate-pulse">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="section-title text-text-main">{{ $t('AI Accountability Companion') }}</h3>
        <p class="text-xs text-text-muted mt-1">{{ $t('Automated discipline recommendations and workflow compliance diagnostics generated from system logs and task cards.') }}</p>
      </div>
      <button type="button" class="btn-primary text-xs h-9 px-3.5 flex-shrink-0" @click="generateNewInsights" :disabled="reloading">
        {{ reloading ? 'Analyzing...' : 'Re-Analyze Accountability' }}
      </button>
    </div>

    <!-- Recommendations and Risk Analysis Cards -->
    <div v-if="loading" class="flex flex-col gap-4">
      <div v-for="i in 3" :key="i" class="card skeleton h-28" />
    </div>

    <div v-else class="flex flex-col gap-4">
      <div
        v-for="insight in insights"
        :key="insight.title"
        class="card card-pad flex gap-4 bg-card border transition"
        :class="getBorderClass(insight.type)"
      >
        <!-- Type colored indicator badge -->
        <div class="icon-tile flex-shrink-0" :class="getBadgeClass(insight.type)">
          <span v-html="getIcon(insight.type)" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <h4 class="text-sm font-extrabold text-text-main">{{ insight.title }}</h4>
            <span class="text-[9px] font-bold uppercase py-0.5 px-1.5 rounded-full" :class="getBadgeClass(insight.type)">
              {{ insight.type }}
            </span>
          </div>
          <p class="text-xs text-text-muted mt-1.5 leading-relaxed">{{ insight.message }}</p>
          
          <!-- Recommended Actions list -->
          <div class="recommendation-block mt-3 bg-soft/50 p-2.5 rounded-btn border border-border">
            <span class="eyebrow text-[9px] text-text-muted tracking-wider uppercase font-black">{{ $t('Recommended Action:') }}</span>
            <p class="text-xs text-text-main font-semibold mt-1 flex items-center gap-1.5">
              <span class="text-primary font-bold">{{ $t('👉') }}</span>
              {{ insight.recommendation }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useReportsStore } from '@/stores/reports';

const reportsStore = useReportsStore();
const insights = ref<any[]>([]);
const loading = ref(true);
const reloading = ref(false);

const loadInsights = async () => {
  try {
    insights.value = await reportsStore.generateInsights();
  } catch (err) {
    console.error('[ProductivityInsightsPage] failed loading insights', err);
  } finally {
    loading.value = false;
  }
};

const generateNewInsights = async () => {
  reloading.value = true;
  await new Promise(resolve => setTimeout(resolve, 800)); // simulation aesthetic
  await loadInsights();
  reloading.value = false;
};

const getBorderClass = (type: string) => {
  if (type === 'success') return 'border-emerald-500/20';
  if (type === 'danger') return 'border-rose-500/20';
  if (type === 'warning') return 'border-amber-500/20';
  return 'border-border';
};

const getBadgeClass = (type: string) => {
  if (type === 'success') return 'bg-emerald-500/10 text-emerald-500';
  if (type === 'danger') return 'bg-rose-500/10 text-rose-500';
  if (type === 'warning') return 'bg-amber-500/10 text-amber-500';
  return 'bg-blue-500/10 text-blue-500';
};

const getIcon = (type: string) => {
  if (type === 'success') return '🏆';
  if (type === 'danger') return '🚨';
  if (type === 'warning') return '⚠️';
  return '💡';
};

onMounted(loadInsights);
</script>

<style scoped>
.productivity-insights-page {
  width: 100%;
}
</style>
