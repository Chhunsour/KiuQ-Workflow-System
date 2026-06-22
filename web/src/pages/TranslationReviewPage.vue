<template>
  <div class="translation-review-container">
    <PageHeader
      :title="$t('translationReview.title')"
      :subtitle="$t('translationReview.subtitle')"
    />

    <!-- Notifications -->
    <div
      v-if="success"
      class="mb-5 rounded-xl border border-status-approved-bg bg-status-approved-bg/15 px-4 py-3 text-sm text-status-approved-fg flex items-center gap-2 animate-fade-in"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>{{ success }}</span>
    </div>
    <div
      v-if="error"
      class="mb-5 rounded-xl border border-status-needs-fix-bg bg-status-needs-fix-bg/15 px-4 py-3 text-sm text-status-needs-fix-fg flex items-center gap-2 animate-fade-in"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span>{{ error }}</span>
    </div>

    <!-- Toolbar controls -->
    <div class="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <div class="relative flex-1 min-w-[260px]">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input
            v-model="searchQuery"
            type="text"
            class="input pl-9 h-9 text-xs"
            :placeholder="$t('translationReview.searchPlaceholder')"
          />
        </div>

        <select v-model="statusFilter" class="input h-9 text-xs min-w-[140px] bg-card">
          <option value="all">{{ $t('translationReview.filterAll') }}</option>
          <option value="unreviewed">{{ $t('translationReview.filterUnreviewed') }}</option>
          <option value="reviewed">{{ $t('translationReview.filterReviewed') }}</option>
        </select>

        <select v-model="typeFilter" class="input h-9 text-xs min-w-[140px] bg-card">
          <option value="all">{{ $t('translationReview.typeAll') }}</option>
          <option value="auto">{{ $t('translationReview.typeAuto') }}</option>
          <option value="manual">{{ $t('translationReview.typeManual') }}</option>
        </select>
      </div>

      <!-- Action Statistics -->
      <div class="text-xs text-text-muted font-sans font-medium flex gap-3 flex-shrink-0">
        <span>{{ $t('translationReview.totalItems') }}: <strong class="text-text-main font-semibold font-number">{{ filteredCount }}</strong></span>
        <span class="text-border">|</span>
        <span>{{ $t('translationReview.unreviewedItems') }}: <strong class="text-status-pending-fg font-semibold font-number">{{ unreviewedCount }}</strong></span>
      </div>
    </div>

    <!-- Table content -->
    <div class="card overflow-hidden border border-border/60">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse font-sans">
          <thead>
            <tr class="bg-soft/40 border-b border-border/50 text-[10px] uppercase font-bold text-text-muted tracking-wider">
              <th class="p-3 pl-4 min-w-[200px]">{{ $t('translationReview.colEnglish') }}</th>
              <th class="p-3 min-w-[250px]">{{ $t('translationReview.colKhmer') }}</th>
              <th class="p-3 min-w-[160px]">{{ $t('translationReview.colKey') }}</th>
              <th class="p-3 min-w-[80px]">{{ $t('translationReview.colProvider') }}</th>
              <th class="p-3 min-w-[120px]">{{ $t('translationReview.colStatus') }}</th>
              <th class="p-3 pr-4 text-right min-w-[140px]">{{ $t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/30 text-xs">
            <tr v-if="loading" class="text-text-muted">
              <td colspan="6" class="p-8 text-center">
                <LoadingBlock :loading="loading" :error="null" />
              </td>
            </tr>
            <tr v-else-if="pagedTranslations.length === 0" class="text-text-muted">
              <td colspan="6" class="p-8 text-center font-sans py-16">
                {{ $t('translationReview.noItemsFound') }}
              </td>
            </tr>
            <tr
              v-else
              v-for="row in pagedTranslations"
              :key="row.id"
              class="hover:bg-soft/5 transition-colors group"
            >
              <!-- English text -->
              <td class="p-3 pl-4 align-top max-w-[260px]">
                <div class="font-medium text-text-main leading-relaxed select-all">{{ row.source_text }}</div>
                <div v-if="row.context" class="text-[9px] text-text-muted mt-1 bg-soft/30 px-1.5 py-0.5 rounded inline-block font-mono max-w-full truncate">{{ row.context }}</div>
              </td>

              <!-- Khmer translated inline input -->
              <td class="p-3 align-top">
                <div class="flex gap-2">
                  <textarea
                    v-model="editBuffer[row.id]"
                    rows="1"
                    class="input py-1.5 h-8 text-[11px] font-sans resize-none leading-normal w-full bg-card"
                    :placeholder="$t('Enter Khmer translation...')"
                    @keydown.enter.prevent="saveTranslation(row)"
                  ></textarea>
                  <button
                    v-if="editBuffer[row.id] !== row.translated_text"
                    type="button"
                    class="btn-primary h-8 px-2 flex items-center justify-center animate-fade-in"
                    :title="$t('common.save')"
                    @click="saveTranslation(row)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                </div>
              </td>

              <!-- Translation key -->
              <td class="p-3 align-top text-[10px] font-mono text-text-muted max-w-[180px] break-all leading-normal select-all">
                {{ row.translation_key || '—' }}
              </td>

              <!-- Provider badge -->
              <td class="p-3 align-top">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-sans border bg-soft/20 text-text-muted font-medium border-border/40 capitalize">
                  {{ row.provider || 'free' }}
                </span>
              </td>

              <!-- Status tags -->
              <td class="p-3 align-top flex flex-col gap-1.5 items-start">
                <span
                  class="text-[9px] font-sans font-bold px-1.5 py-0.5 rounded border leading-none uppercase tracking-wider"
                  :class="row.is_reviewed ? 'bg-status-approved-bg/10 text-status-approved-fg border-status-approved-bg/20' : 'bg-status-pending-bg/15 text-status-pending-fg border-status-pending-bg/20'"
                >
                  {{ row.is_reviewed ? $t('translationReview.statusReviewed') : $t('translationReview.statusUnreviewed') }}
                </span>
                <span
                  class="text-[9px] font-sans text-text-muted"
                  :title="fmtDateTime(row.created_at)"
                >
                  {{ row.is_auto_generated ? 'Auto' : 'Manual' }}
                </span>
              </td>

              <!-- Actions -->
              <td class="p-3 pr-4 align-top text-right">
                <div class="flex gap-1.5 justify-end">
                  <button
                    v-if="!row.is_reviewed"
                    type="button"
                    class="btn-secondary h-7 px-2 text-[10px] font-semibold"
                    @click="markReviewed(row)"
                  >
                    {{ $t('translationReview.btnReview') }}
                  </button>
                  <button
                    type="button"
                    class="btn-ghost h-7 w-7 text-status-needs-fix-fg hover:bg-status-needs-fix-bg/10 flex items-center justify-center p-0"
                    :title="$t('common.delete')"
                    @click="deleteTranslation(row)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="totalPages > 1" class="perf-pager bg-soft/5 border-t border-border/40 px-4 py-3 flex items-center justify-between">
        <span class="font-sans text-xs text-text-muted">
          Showing {{ (currentPage - 1) * perPage + 1 }}–{{ Math.min(currentPage * perPage, filteredTranslations.length) }} of {{ filteredTranslations.length }}
        </span>
        <div class="flex items-center gap-1.5">
          <button
            class="btn-secondary h-8 px-3 text-xs"
            type="button"
            :disabled="currentPage <= 1"
            @click="currentPage--"
          >
            {{ $t('Prev') }}
          </button>
          <button
            class="btn-secondary h-8 px-3 text-xs"
            type="button"
            :disabled="currentPage >= totalPages"
            @click="currentPage++"
          >
            {{ $t('Next') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import { supabase } from '@/lib/supabase';
import { i18n } from '@/i18n';

const { t } = useI18n();

const loading = ref(false);
const success = ref('');
const error = ref('');

const allTranslations = ref<any[]>([]);
const editBuffer = ref<Record<string, string>>({}); // Temp buffer holding inline translation textarea changes

// Filters state
const searchQuery = ref('');
const statusFilter = ref<'all' | 'unreviewed' | 'reviewed'>('all');
const typeFilter = ref<'all' | 'auto' | 'manual'>('all');

// Pagination
const currentPage = ref(1);
const perPage = 15;

const fetchTranslations = async () => {
  loading.value = true;
  success.value = '';
  error.value = '';
  try {
    const { data, error: err } = await supabase
      .from('ui_translations_cache')
      .select('*')
      .order('created_at', { ascending: false });

    if (err) throw err;

    allTranslations.value = data || [];

    // Initialize edit textareas buffer
    const buffer: Record<string, string> = {};
    for (const item of allTranslations.value) {
      buffer[item.id] = item.translated_text;
    }
    editBuffer.value = buffer;
  } catch (err: any) {
    error.value = err.message || 'Failed to load translations.';
  } finally {
    loading.value = false;
  }
};

// Filtered and searched data computes
const filteredTranslations = computed(() => {
  return allTranslations.value.filter((item) => {
    // 1. Search Query Match
    const q = searchQuery.value.toLowerCase().trim();
    if (q) {
      const matchSource = String(item.source_text ?? '').toLowerCase().includes(q);
      const matchTrans = String(item.translated_text ?? '').toLowerCase().includes(q);
      const matchKey = String(item.translation_key ?? '').toLowerCase().includes(q);
      if (!matchSource && !matchTrans && !matchKey) return false;
    }

    // 2. Review Status Match
    if (statusFilter.value === 'reviewed' && !item.is_reviewed) return false;
    if (statusFilter.value === 'unreviewed' && item.is_reviewed) return false;

    // 3. Auto-Gen Type Match
    if (typeFilter.value === 'auto' && !item.is_auto_generated) return false;
    if (typeFilter.value === 'manual' && item.is_auto_generated) return false;

    return true;
  });
});

const filteredCount = computed(() => filteredTranslations.value.length);

const unreviewedCount = computed(() => {
  return allTranslations.value.filter((t) => !t.is_reviewed).length;
});

// Pagination computes
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTranslations.value.length / perPage)));
const pagedTranslations = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  const end = start + perPage;
  return filteredTranslations.value.slice(start, end);
});

// Reset page number on filter/search change
watch([searchQuery, statusFilter, typeFilter], () => {
  currentPage.value = 1;
});

// Helper to set nested key inside locale object
function setNestedKey(obj: any, path: string, value: string) {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
}

// Helper to delete nested key inside locale object
function deleteNestedKey(obj: any, path: string) {
  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part]) return;
    curr = curr[part];
  }
  delete curr[parts[parts.length - 1]];
}

// Save edited translation inline
const saveTranslation = async (row: any) => {
  success.value = '';
  error.value = '';
  const newText = editBuffer.value[row.id]?.trim();
  if (!newText) {
    error.value = 'Translation text cannot be empty.';
    return;
  }

  try {
    const { error: err } = await supabase
      .from('ui_translations_cache')
      .update({
        translated_text: newText,
        is_reviewed: true,
        is_auto_generated: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', row.id);

    if (err) throw err;

    row.translated_text = newText;
    row.is_reviewed = true;
    row.is_auto_generated = false;
    success.value = `Successfully saved Khmer translation.`;

    // Dynamic Vue i18n reload if translation key exists
    if (row.translation_key) {
      const kmMessages = i18n.global.getLocaleMessage('km');
      const newKmMessages = JSON.parse(JSON.stringify(kmMessages));
      setNestedKey(newKmMessages, row.translation_key, newText);
      i18n.global.setLocaleMessage('km', newKmMessages);
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to save translation.';
  }
};

// Quick mark as reviewed
const markReviewed = async (row: any) => {
  success.value = '';
  error.value = '';
  try {
    const { error: err } = await supabase
      .from('ui_translations_cache')
      .update({ is_reviewed: true })
      .eq('id', row.id);

    if (err) throw err;

    row.is_reviewed = true;
    success.value = `Marked "${row.source_text}" as reviewed.`;
  } catch (err: any) {
    error.value = err.message || 'Failed to update review status.';
  }
};

// Delete translation cache row
const deleteTranslation = async (row: any) => {
  const confirmMsg = `Are you sure you want to delete translation cache for "${row.source_text}"? It will fall back to English until re-translated.`;
  if (!confirm(confirmMsg)) return;

  success.value = '';
  error.value = '';
  try {
    const { error: err } = await supabase
      .from('ui_translations_cache')
      .delete()
      .eq('id', row.id);

    if (err) throw err;

    allTranslations.value = allTranslations.value.filter((t) => t.id !== row.id);
    success.value = `Deleted translation cache row.`;

    // Remove dynamic translation from active i18n
    if (row.translation_key) {
      const kmMessages = i18n.global.getLocaleMessage('km');
      const newKmMessages = JSON.parse(JSON.stringify(kmMessages));
      deleteNestedKey(newKmMessages, row.translation_key);
      i18n.global.setLocaleMessage('km', newKmMessages);
    }
  } catch (err: any) {
    error.value = err.message || 'Failed to delete translation cache.';
  }
};

// Format DateTime nicely
const fmtDateTime = (isoStr: string) => {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

onMounted(() => {
  fetchTranslations();
});
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
