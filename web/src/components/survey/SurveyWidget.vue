<template>
  <!-- Floating "Give Feedback" button (shown when the user skipped or minimized without starting) -->
  <Transition name="survey-fab">
    <button
      v-if="iconVisible"
      type="button"
      class="survey-fab"
      :class="{ 'km-text': lang === 'kh' }"
      :title="t.giveFeedback"
      :aria-label="t.giveFeedback"
      @click="openModal"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span class="survey-fab-label">{{ t.giveFeedback }}</span>
    </button>
  </Transition>

  <!-- Bottom-right invitation banner (Not started yet) -->
  <Transition name="survey-banner">
    <div v-if="bannerVisible" class="survey-banner card" :class="{ 'ks-km': lang === 'kh' }" role="dialog" aria-live="polite">
      <button type="button" class="survey-banner-close btn-ghost" :aria-label="t.later" @click="onLater">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
      <div v-if="store.previewMode" class="ks-pill mb-2">{{ t.testingMode }}</div>
      <div class="flex items-start gap-3">
        <span class="survey-banner-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <div class="min-w-0">
          <h4 class="ui-font text-sm font-bold text-text-main">{{ t.bannerTitle }}</h4>
          <p class="mt-0.5 text-xs leading-relaxed text-text-muted">{{ t.bannerText }}</p>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between gap-2">
        <div class="ks-seg ks-seg--sm">
          <button type="button" :class="{ active: lang === 'en' }" @click="lang = 'en'">EN</button>
          <button type="button" class="km-text" :class="{ active: lang === 'kh' }" @click="lang = 'kh'">ខ្មែរ</button>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn-ghost px-3 py-1.5 text-xs" @click="onLater">{{ t.later }}</button>
          <button type="button" class="btn-primary px-3 py-1.5 text-xs" @click="openModal">{{ t.startSurvey }}</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Bottom-right persistent Continue Survey Banner (Started but not submitted) -->
  <Transition name="survey-banner">
    <div v-if="continueBannerVisible" class="survey-continue-banner" :class="{ 'ks-km': lang === 'kh' }" role="dialog">
      <button type="button" class="survey-continue-close" :title="t.later" @click="bannerMinimized = true">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
      <div class="survey-continue-content">
        <span class="survey-continue-indicator animate-pulse" />
        <span class="text-xs font-semibold text-text-main pr-6">{{ t.continueBannerText }}</span>
      </div>
      <div v-if="store.previewMode" class="mt-1 flex items-center justify-between">
        <span class="ks-pill text-[9px] px-1.5 py-0.5">Test Mode</span>
        <button type="button" class="text-[10px] text-text-muted hover:text-text-main hover:underline" @click="exitPreviewFromBanner">Exit Test</button>
      </div>
      <div class="mt-2.5 flex items-center justify-between gap-2">
        <span class="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
          {{ t.stepWord }} {{ form.step }}/{{ totalSteps }}
        </span>
        <button type="button" class="btn-continue" @click="openModal">
          {{ t.continueButton }}
          <svg class="ml-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </div>
  </Transition>

  <!-- Bottom-right minimized survey draft pill -->
  <Transition name="survey-fab">
    <button
      v-if="minimizedPillVisible"
      type="button"
      class="survey-draft-pill"
      :class="{ 'km-text': lang === 'kh' }"
      @click="openModal"
    >
      <span class="survey-continue-indicator animate-pulse mr-1.5" />
      <span class="text-xs font-bold">{{ t.surveyDraftPill }}</span>
    </button>
  </Transition>

  <!-- ── Step-based survey modal ─────────────────────────────────────────── -->
  <Teleport to="body">
    <Transition name="ks-modal">
      <div v-if="modalOpen" class="ks-overlay" @click.self="closeModal">
        <div class="ks-panel" :class="{ 'ks-km': lang === 'kh' }" role="dialog" aria-modal="true">
          <!-- Header -->
          <header class="ks-header">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="ks-title">{{ t.bannerTitle }}</h3>
                <span v-if="store.previewMode" class="ks-pill">{{ t.testingMode }}</span>
              </div>
              <p class="ks-subtitle">{{ t.modalSubtitle }}</p>
            </div>
            <div class="ks-head-actions">
              <div class="ks-seg">
                <button type="button" :class="{ active: lang === 'en' }" @click="lang = 'en'">{{ t.english }}</button>
                <button type="button" class="km-text" :class="{ active: lang === 'kh' }" @click="lang = 'kh'">{{ t.khmer }}</button>
              </div>
              <button type="button" class="ks-close" :aria-label="t.close" @click="closeModal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </header>

          <!-- Compact preview/test bar -->
          <div v-if="store.previewMode" class="ks-preview-bar flex items-center justify-between">
            <span>{{ t.previewingAs }} {{ roleLabel(store.previewRole) }}</span>
            <button type="button" class="text-[10px] hover:underline font-bold" style="color: inherit;" @click="exitPreview">Exit Test</button>
          </div>

          <!-- Thank-you / test-saved -->
          <div v-if="store.justSubmitted" class="ks-body">
            <div class="ks-thanks">
              <span class="ks-thanks-icon">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <h3 class="ks-thanks-title">{{ store.previewMode ? t.testSavedTitle : t.thankYouTitle }}</h3>
              <p class="ks-thanks-text">{{ store.previewMode ? t.testSavedText : t.submitSuccess }}</p>
            </div>
          </div>

          <template v-else>
            <!-- Progress -->
            <div class="ks-progress">
              <div class="ks-steps">
                <span v-for="i in totalSteps" :key="i" class="ks-step-bar" :class="{ done: i <= form.step }" />
              </div>
              <div class="ks-step-head">
                <div class="ks-step-num">{{ t.stepWord }} {{ form.step }}/{{ totalSteps }}</div>
                <div class="ks-step-title">{{ stepTitle }}</div>
                <div class="ks-step-help">{{ stepHelp }}</div>
              </div>
            </div>

            <!-- Body -->
            <div class="ks-body">
              <!-- Step 1: Pick Pages (Multi-select) -->
              <div v-show="form.step === 1" class="ks-grid">
                <button
                  v-for="o in opts.dashboards"
                  :key="o.value"
                  type="button"
                  class="ks-opt"
                  :class="{ active: form.dashboard_keys.includes(o.value) }"
                  @click="toggleDashboard(o.value)"
                >
                  <span>{{ optLabel(o, lang) }}</span>
                  <svg class="ks-opt-check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </button>
              </div>

              <!-- Step 2: What feels wrong? (Clickable chips) -->
              <div v-show="form.step === 2" class="space-y-4">
                <div>
                  <h4 class="ks-chip-header">{{ t.problemsHeader }}</h4>
                  <div class="ks-chips mt-2">
                    <button
                      v-for="o in opts.commonProblems"
                      :key="o.value"
                      type="button"
                      class="ks-chip"
                      :class="{ active: form.issue_tags.includes(o.value) }"
                      @click="toggleIssue(o.value)"
                    >
                      <svg v-if="form.issue_tags.includes(o.value)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" class="mr-1"><path d="M20 6 9 17l-5-5"/></svg>
                      {{ optLabel(o, lang) }}
                    </button>
                  </div>
                </div>

                <div class="pt-2 border-t border-border">
                  <h4 class="ks-chip-header">{{ t.workflowHeader }}</h4>
                  <div class="ks-chips mt-2">
                    <button
                      v-for="o in opts.workflowFeedback"
                      :key="o.value"
                      type="button"
                      class="ks-chip"
                      :class="{ active: form.issue_tags.includes(o.value) }"
                      @click="toggleIssue(o.value)"
                    >
                      <svg v-if="form.issue_tags.includes(o.value)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" class="mr-1"><path d="M20 6 9 17l-5-5"/></svg>
                      {{ optLabel(o, lang) }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Step 3: Mood & Ratings -->
              <div v-show="form.step === 3" class="space-y-5">
                <!-- Mood Section -->
                <div class="ks-rate-group">
                  <div class="ks-rate-q">{{ t.moodLabel }}</div>
                  <div class="ks-mood-grid">
                    <button
                      v-for="o in opts.moods"
                      :key="o.value"
                      type="button"
                      class="ks-mood-btn"
                      :class="{ active: form.mood_tags.includes(o.value) }"
                      @click="toggleMood(o.value)"
                    >
                      <span class="ks-mood-smiley">{{ moodSmiley(o.value) }}</span>
                      <span class="text-xs font-semibold">{{ optLabel(o, lang) }}</span>
                    </button>
                  </div>
                </div>

                <!-- Ease rating -->
                <div class="ks-rate-group pt-3 border-t border-border">
                  <div class="ks-rate-q">{{ t.ratingEase }}</div>
                  <div class="ks-rate-row">
                    <button v-for="o in opts.ease" :key="o.value" type="button" class="ks-rate" :class="{ active: form.ease_rating === o.value }" @click="form.ease_rating = o.value">{{ optLabel(o, lang) }}</button>
                  </div>
                </div>

                <!-- Speed rating -->
                <div class="ks-rate-group">
                  <div class="ks-rate-q">{{ t.ratingSpeed }}</div>
                  <div class="ks-rate-row">
                    <button v-for="o in opts.speed" :key="o.value" type="button" class="ks-rate" :class="{ active: form.speed_rating === o.value }" @click="form.speed_rating = o.value">{{ optLabel(o, lang) }}</button>
                  </div>
                </div>

                <!-- Design/Visual rating -->
                <div class="ks-rate-group">
                  <div class="ks-rate-q">{{ t.ratingDesign }}</div>
                  <div class="ks-rate-row">
                    <button v-for="o in opts.usefulness" :key="o.value" type="button" class="ks-rate" :class="{ active: form.usefulness_rating === o.value }" @click="form.usefulness_rating = o.value">{{ optLabel(o, lang) }}</button>
                  </div>
                </div>
              </div>

              <!-- Step 4: What should we improve? (Clickable improvements) -->
              <div v-show="form.step === 4">
                <div class="ks-chips">
                  <button
                    v-for="o in opts.improvements"
                    :key="o.value"
                    type="button"
                    class="ks-chip"
                    :class="{ active: form.improvement_tags.includes(o.value) }"
                    @click="toggleImprovement(o.value)"
                  >
                    <svg v-if="form.improvement_tags.includes(o.value)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" class="mr-1"><path d="M20 6 9 17l-5-5"/></svg>
                    {{ optLabel(o, lang) }}
                  </button>
                </div>
              </div>

              <!-- Step 5: Review & Send -->
              <div v-show="form.step === 5" class="space-y-4">
                <!-- Selections summary with Edit buttons -->
                <div class="ks-review-card">
                  <div class="ks-review-row">
                    <div class="ks-review-cell">
                      <span class="ks-review-lbl">{{ t.step1Title }}</span>
                      <span class="ks-review-val">{{ formatTags(form.dashboard_keys, opts.dashboards) }}</span>
                    </div>
                    <button type="button" class="ks-review-edit" @click="goToStep(1)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {{ t.edit }}
                    </button>
                  </div>

                  <div class="ks-review-row">
                    <div class="ks-review-cell">
                      <span class="ks-review-lbl">{{ t.step2Title }}</span>
                      <span class="ks-review-val">{{ formatTags(form.issue_tags, [...opts.commonProblems, ...opts.workflowFeedback]) }}</span>
                    </div>
                    <button type="button" class="ks-review-edit" @click="goToStep(2)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {{ t.edit }}
                    </button>
                  </div>

                  <div class="ks-review-row">
                    <div class="ks-review-cell">
                      <span class="ks-review-lbl">{{ t.step3Title }}</span>
                      <span class="ks-review-val">
                        Mood: {{ formatTags(form.mood_tags, opts.moods) || '—' }} |
                        Ease: {{ valLabel(opts.ease, form.ease_rating) }} |
                        Speed: {{ valLabel(opts.speed, form.speed_rating) }} |
                        Design: {{ valLabel(opts.usefulness, form.usefulness_rating) }}
                      </span>
                    </div>
                    <button type="button" class="ks-review-edit" @click="goToStep(3)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {{ t.edit }}
                    </button>
                  </div>

                  <div class="ks-review-row">
                    <div class="ks-review-cell">
                      <span class="ks-review-lbl">{{ t.step4Title }}</span>
                      <span class="ks-review-val">{{ formatTags(form.improvement_tags, opts.improvements) }}</span>
                    </div>
                    <button type="button" class="ks-review-edit" @click="goToStep(4)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      {{ t.edit }}
                    </button>
                  </div>
                </div>

                <!-- Editable Feedback Summary -->
                <div class="ks-field">
                  <div class="flex items-center justify-between">
                    <label class="ks-label">{{ t.summaryLabel }}</label>
                    <button v-if="isSummaryManuallyEdited" type="button" class="text-[10px] text-primary hover:underline font-semibold" @click="resetGeneratedSummary">
                      Re-generate summary
                    </button>
                  </div>
                  <textarea
                    v-model="form.generated_summary"
                    class="ks-textarea ks-summary-box"
                    rows="4"
                    @input="onSummaryInput"
                  />
                </div>

                <!-- Custom Optional Details -->
                <div class="ks-field">
                  <label class="ks-label">{{ t.customNoteLabel }}</label>
                  <textarea
                    v-model="form.custom_note"
                    class="ks-textarea"
                    rows="3"
                    :placeholder="t.customNotePlaceholder"
                  />
                </div>

                <!-- Screenshot drag drop -->
                <div class="ks-field">
                  <label class="ks-label">{{ t.sectionScreenshot }}</label>
                  <div v-if="form.screenshot_url" class="ks-shot">
                    <img :src="form.screenshot_url" alt="screenshot preview" />
                    <button type="button" class="ks-shot-remove" :title="t.removeImage" @click="form.screenshot_url = ''">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <button
                    v-else
                    type="button"
                    class="ks-drop"
                    :class="{ drag: dragActive }"
                    :disabled="screenshotUploading"
                    @click="pickFile"
                    @dragover.prevent="dragActive = true"
                    @dragleave.prevent="dragActive = false"
                    @drop.prevent="onDrop"
                  >
                    <svg class="ks-drop-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.5-3.5L9 20" />
                    </svg>
                    <span class="text-xs font-semibold text-text-main">{{ screenshotUploading ? t.savingDraft : t.q10 }}</span>
                    <span class="text-[10px] text-text-muted">{{ t.uploadHint }}</span>
                  </button>
                  <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange" />
                </div>
              </div>
            </div>
          </template>

          <!-- Footer -->
          <footer class="ks-footer">
            <span class="ks-draft">
              <span v-if="submitError" class="text-status-needs-fix-fg font-semibold">{{ submitError }}</span>
              <span v-else-if="store.draftStatus === 'saving'">{{ t.savingDraft }}</span>
              <span v-else-if="store.draftStatus === 'saved'" class="text-primary font-semibold">{{ t.draftSaved }}</span>
            </span>

            <template v-if="store.justSubmitted">
              <button class="btn-primary" type="button" @click="closeModal">{{ t.close }}</button>
            </template>
            <template v-else>
              <button class="btn-ghost" type="button" @click="closeModal">{{ t.close }}</button>
              <button v-if="form.step > 1" class="btn-secondary" type="button" @click="prevStep">{{ t.back }}</button>
              <button class="btn-secondary" type="button" @click="onSaveDraft">{{ t.saveDraft }}</button>
              <button v-if="form.step < totalSteps" class="btn-primary" type="button" @click="nextStep">{{ t.next }}</button>
              <button v-else class="btn-primary" type="button" :disabled="store.submitting" @click="onSubmit">
                {{ store.previewMode ? t.submitTest : t.submit }}
              </button>
            </template>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useSurveyStore, emptyDraft, type SurveyDraft, isDraftStarted } from '@/stores/survey';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { surveyText, surveyOptions, optLabel, type SurveyLang, type SurveyOption } from '@/lib/surveyI18n';
import { roleLabel } from '@/lib/roles';

const store = useSurveyStore();
const opts = surveyOptions;
const totalSteps = 5;

const modalOpen = ref(false);
const dragActive = ref(false);
const previewSkipped = ref(false);
const bannerMinimized = ref(false);
const isSummaryManuallyEdited = ref(false);
const form = ref<SurveyDraft>(emptyDraft());

const currentDraftState = ref<SurveyDraft | null>(null);

const draftInProgress = computed(() => {
  return currentDraftState.value ? isDraftStarted(currentDraftState.value) : false;
});

const bannerVisible = computed(() =>
  !modalOpen.value && !store.justSubmitted && !draftInProgress.value && (store.previewMode ? !previewSkipped.value : store.showBanner)
);

const continueBannerVisible = computed(() =>
  !modalOpen.value && !store.justSubmitted && draftInProgress.value && !bannerMinimized.value
);

const minimizedPillVisible = computed(() =>
  !modalOpen.value && !store.justSubmitted && draftInProgress.value && bannerMinimized.value
);

const iconVisible = computed(() =>
  !modalOpen.value && !store.justSubmitted && !draftInProgress.value && (store.previewMode ? previewSkipped.value : store.showFloatingIcon)
);

const lang = computed<SurveyLang>({
  get: () => form.value.language,
  set: (v) => { form.value.language = v; }
});
const t = computed(() => surveyText[form.value.language]);

const stepTitle = computed(() => [t.value.step1Title, t.value.step2Title, t.value.step3Title, t.value.step4Title, t.value.step5Title][form.value.step - 1]);
const stepHelp = computed(() => [t.value.step1Help, t.value.step2Help, t.value.step3Help, t.value.step4Help, t.value.step5Help][form.value.step - 1]);

const fileInput = ref<HTMLInputElement | null>(null);
const screenshotUploading = ref(false);
const submitError = ref('');

const formIsValid = computed(() => {
  const hasPage = form.value.dashboard_keys.length > 0;
  const hasIssueOrImprovement = form.value.issue_tags.length > 0 || form.value.improvement_tags.length > 0;
  const hasRatingOrMood =
    form.value.mood_tags.length > 0 ||
    form.value.ease_rating !== '' ||
    form.value.speed_rating !== '' ||
    form.value.usefulness_rating !== '';
  return hasPage && hasIssueOrImprovement && hasRatingOrMood;
});

// ── Selection Toggles ──────────────────────────────────────────────────────
const toggleDashboard = (val: string) => {
  const idx = form.value.dashboard_keys.indexOf(val);
  if (idx === -1) form.value.dashboard_keys.push(val);
  else form.value.dashboard_keys.splice(idx, 1);
};

const toggleIssue = (val: string) => {
  const idx = form.value.issue_tags.indexOf(val);
  if (idx === -1) form.value.issue_tags.push(val);
  else form.value.issue_tags.splice(idx, 1);
};

const toggleImprovement = (val: string) => {
  const idx = form.value.improvement_tags.indexOf(val);
  if (idx === -1) form.value.improvement_tags.push(val);
  else form.value.improvement_tags.splice(idx, 1);
};

const toggleMood = (val: string) => {
  const idx = form.value.mood_tags.indexOf(val);
  if (idx === -1) form.value.mood_tags.push(val);
  else form.value.mood_tags.splice(idx, 1);
};

// ── Smiley mappings ────────────────────────────────────────────────────────
const moodSmiley = (val: string) => {
  switch (val) {
    case 'good': return '😊';
    case 'okay': return '😐';
    case 'annoying': return '😤';
    case 'confusing': return '😕';
    case 'slow': return '⏳';
    case 'broken': return '💥';
    default: return '💬';
  }
};

const valLabel = (list: SurveyOption[], val: string) => {
  const found = list.find(x => x.value === val);
  return found ? optLabel(found, lang.value) : '—';
};

const formatTags = (tags: string[], list: SurveyOption[]) => {
  if (!tags || tags.length === 0) return '—';
  return tags.map(t => {
    const found = list.find(x => x.value === t);
    return found ? optLabel(found, lang.value) : t;
  }).join(', ');
};

// ── Auto-fill summary generator ───────────────────────────────────────────
const generateSummary = () => {
  if (isSummaryManuallyEdited.value) return;

  const langKey = lang.value;
  const dashboards = form.value.dashboard_keys;
  const issues = form.value.issue_tags;
  const improvements = form.value.improvement_tags;
  const moods = form.value.mood_tags;

  if (langKey === 'kh') {
    let text = '';
    if (dashboards.length > 0) {
      const names = dashboards.map(k => {
        const found = opts.dashboards.find(d => d.value === k);
        return found ? optLabel(found, 'kh') : k;
      });
      text += `ខ្ញុំមាន Feedback លើទំព័រ/Dashboard៖ ${names.join(', ')}។\n`;
    }
    if (issues.length > 0) {
      const names = issues.map(k => {
        const found = [...opts.commonProblems, ...opts.workflowFeedback].find(i => i.value === k);
        return found ? optLabel(found, 'kh') : k;
      });
      text += `បញ្ហាជួបប្រទះ៖ ${names.join(', ')}។\n`;
    }
    if (moods.length > 0) {
      const names = moods.map(k => {
        const found = opts.moods.find(m => m.value === k);
        return found ? optLabel(found, 'kh') : k;
      });
      text += `អារម្មណ៍/ការយល់ឃើញ៖ ${names.join(', ')}។\n`;
    }
    if (improvements.length > 0) {
      const names = improvements.map(k => {
        const found = opts.improvements.find(i => i.value === k);
        return found ? optLabel(found, 'kh') : k;
      });
      text += `ការចង់កែលម្អ៖ ${names.join(', ')}។\n`;
    }
    form.value.generated_summary = text;
  } else {
    let text = '';
    if (dashboards.length > 0) {
      const names = dashboards.map(k => {
        const found = opts.dashboards.find(d => d.value === k);
        return found ? optLabel(found, 'en') : k;
      });
      text += `I have feedback about: ${names.join(', ')}.\n`;
    }
    if (issues.length > 0) {
      const names = issues.map(k => {
        const found = [...opts.commonProblems, ...opts.workflowFeedback].find(i => i.value === k);
        return found ? optLabel(found, 'en') : k;
      });
      text += `Problems: ${names.join(', ')}.\n`;
    }
    if (moods.length > 0) {
      const names = moods.map(k => {
        const found = opts.moods.find(m => m.value === k);
        return found ? optLabel(found, 'en') : k;
      });
      text += `Feelings: ${names.join(', ')}.\n`;
    }
    if (improvements.length > 0) {
      const names = improvements.map(k => {
        const found = opts.improvements.find(i => i.value === k);
        return found ? optLabel(found, 'en') : k;
      });
      text += `Wishes/Improvements: ${names.join(', ')}.\n`;
    }
    form.value.generated_summary = text;
  }
};

const onSummaryInput = () => {
  isSummaryManuallyEdited.value = true;
};

const resetGeneratedSummary = () => {
  isSummaryManuallyEdited.value = false;
  generateSummary();
};

// ── Watch Selections for Summary Auto-generation ───────────────────────────
watch(
  [
    () => form.value.dashboard_keys,
    () => form.value.issue_tags,
    () => form.value.improvement_tags,
    () => form.value.mood_tags,
    () => form.value.language
  ],
  () => {
    generateSummary();
  },
  { deep: true }
);

// ── Draft autosave (debounced) ─────────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  form,
  () => {
    if (!modalOpen.value) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      store.saveDraft(form.value);
      currentDraftState.value = { ...form.value };
    }, 500);
  },
  { deep: true }
);

const hydrateForm = () => {
  const d = store.loadDraft();
  form.value = d ?? emptyDraft();
  currentDraftState.value = d;
  if (d && d.generated_summary) {
    // If summary was loaded, check if it was manually modified
    isSummaryManuallyEdited.value = true;
  } else {
    isSummaryManuallyEdited.value = false;
  }
};

// ── Step navigation ────────────────────────────────────────────────────────
const nextStep = () => {
  if (form.value.step === 1 && form.value.dashboard_keys.length === 0) {
    submitError.value = t.value.required;
    return;
  }
  submitError.value = '';
  if (form.value.step < totalSteps) form.value.step += 1;
};

const prevStep = () => {
  submitError.value = '';
  if (form.value.step > 1) form.value.step -= 1;
};

const goToStep = (stepNum: number) => {
  submitError.value = '';
  form.value.step = stepNum;
};

// ── Banner / modal actions ─────────────────────────────────────────────────
const openModal = async () => {
  hydrateForm();
  submitError.value = '';
  modalOpen.value = true;
  if (!store.previewMode) await store.markOpened();
};

const exitPreview = () => {
  store.clearDraft();
  store.stopPreview();
  modalOpen.value = false;
  hydrateForm();
};

const exitPreviewFromBanner = () => {
  store.clearDraft();
  store.stopPreview();
  hydrateForm();
};

const closeModal = () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (modalOpen.value) {
    store.saveDraft(form.value);
  }
  modalOpen.value = false;
  if (!store.justSubmitted) {
    if (!store.previewMode) {
      store.snoozeFromModalClose();
    }
  }
  // Fetch draft again to refresh Continue Banner state
  hydrateForm();
};

const onLater = async () => {
  if (store.previewMode) {
    previewSkipped.value = true;
    return;
  }
  await store.markSkipped();
  hydrateForm();
};

const onSaveDraft = () => {
  if (saveTimer) clearTimeout(saveTimer);
  store.saveDraft(form.value);
  currentDraftState.value = { ...form.value };
};

const onSubmit = async () => {
  submitError.value = '';
  if (!formIsValid.value) {
    submitError.value = t.value.requiredWarning;
    return;
  }
  const ok = store.previewMode
    ? await store.submitTestResponse(form.value)
    : await store.submitResponse(form.value);
  if (!ok) {
    submitError.value = t.value.submitError;
    return;
  }
  currentDraftState.value = null;
  setTimeout(() => {
    modalOpen.value = false;
    if (store.previewMode) store.stopPreview();
  }, 1800);
};

// ── Screenshot upload / paste / drop ───────────────────────────────────────
const pickFile = () => fileInput.value?.click();

const handleFile = async (file: File) => {
  if (!file || !file.type.startsWith('image/')) return;
  screenshotUploading.value = true;
  try {
    const url = await store.uploadScreenshot(file);
    if (url) form.value.screenshot_url = url;
  } finally {
    screenshotUploading.value = false;
  }
};

const onFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) void handleFile(file);
  if (fileInput.value) fileInput.value.value = '';
};

const onDrop = (e: DragEvent) => {
  dragActive.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
};

const onPaste = (e: ClipboardEvent) => {
  if (!modalOpen.value || form.value.screenshot_url) return;
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) { void handleFile(file); e.preventDefault(); }
      break;
    }
  }
};

// Mark "opened" the moment the real banner becomes visible. Never in preview.
watch(
  () => store.showBanner,
  (visible) => { if (visible && !store.previewMode) void store.markOpened(); }
);

// Admin clicked "Preview & Test" in Settings → open the survey banner fresh.
watch(
  () => store.previewSeq,
  () => {
    previewSkipped.value = false;
    modalOpen.value = false;
    bannerMinimized.value = false;
    goToStep(1);
  }
);

watch(
  () => store.previewMode,
  (on) => { if (!on) previewSkipped.value = false; }
);

// Live: appear the instant an admin activates a survey (own channel, isolated).
let campaignChannel: ReturnType<typeof supabase.channel> | null = null;

onMounted(() => {
  void store.initMember().then(() => {
    hydrateForm();
  });
  window.addEventListener('paste', onPaste);
  if (supabaseConfigured) {
    campaignChannel = supabase
      .channel('survey-campaigns-live-ux')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'survey_campaigns' }, () => {
        void store.initMember().then(() => {
          hydrateForm();
        });
      })
      .subscribe();
  }
});

onBeforeUnmount(() => {
  if (saveTimer) clearTimeout(saveTimer);
  window.removeEventListener('paste', onPaste);
  if (campaignChannel) {
    void supabase.removeChannel(campaignChannel);
    campaignChannel = null;
  }
});
</script>

<style scoped>
/* ── Khmer font (Kantumruy Pro) ──────────────────────────────────────────── */
.km-text,
.ks-km,
.ks-km h1, .ks-km h2, .ks-km h3, .ks-km h4, .ks-km p, .ks-km span, .ks-km label,
.ks-km button, .ks-km input, .ks-km textarea, .ks-km select {
  font-family: 'Kantumruy Pro', 'Raleway', sans-serif;
}
.ks-km .ks-textarea, .ks-km .ks-step-title, .ks-km .ks-rate-q, .ks-km .ks-label { line-height: 1.7; }

/* ── Floating "Give Feedback" button ─────────────────────────────────────── */
.survey-fab {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  height: 3rem;
  padding: 0 0.9rem;
  border-radius: 9999px;
  background: var(--primary, #15D6C2);
  color: #04201d;
  border: none;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(21, 214, 194, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.survey-fab:hover { transform: translateY(-2px); box-shadow: 0 12px 26px rgba(21, 214, 194, 0.45); }
.survey-fab-label {
  max-width: 0;
  overflow: hidden;
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 700;
  transition: max-width 0.25s ease, margin-left 0.25s ease;
}
.survey-fab:hover .survey-fab-label { max-width: 9rem; margin-left: 0.5rem; }

/* ── Invitation banner ───────────────────────────────────────────────────── */
.survey-banner {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 40;
  width: min(360px, calc(100vw - 2rem));
  padding: 1rem 1.1rem;
  box-shadow: var(--shadow-lg);
}
.survey-banner-close { position: absolute; top: 0.5rem; right: 0.5rem; height: 1.75rem; width: 1.75rem; padding: 0; }
.survey-banner-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.25rem;
  width: 2.25rem;
  flex-shrink: 0;
  border-radius: 0.65rem;
  background: var(--primary-soft, rgba(21, 214, 194, 0.12));
  color: var(--primary, #15D6C2);
}

/* ── Continue Survey Banner (Persistent) ────────────────────────────────── */
.survey-continue-banner {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 40;
  width: min(360px, calc(100vw - 2rem));
  padding: 0.85rem 1rem;
  background: var(--card-bg, #282828);
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 0.85rem;
  box-shadow: var(--shadow-lg);
}
.survey-continue-close {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.2rem;
  border-radius: 0.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.survey-continue-close:hover {
  background: var(--soft-bg, rgba(255,255,255,0.05));
  color: var(--text-main);
}
.survey-continue-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.survey-continue-indicator {
  height: 6px;
  width: 6px;
  border-radius: 9999px;
  background-color: var(--primary, #15D6C2);
  flex-shrink: 0;
}
.btn-continue {
  display: inline-flex;
  align-items: center;
  background: var(--primary, #15D6C2);
  color: #04201d;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.btn-continue:hover {
  transform: translateY(-1px);
}
.btn-continue:active {
  transform: translateY(0);
}

/* Minimized survey draft pill */
.survey-draft-pill {
  position: fixed;
  right: 1.25rem;
  bottom: 1.25rem;
  z-index: 40;
  display: inline-flex;
  align-items: center;
  height: 2.25rem;
  padding: 0 0.85rem;
  border-radius: 9999px;
  background: var(--card-bg, #282828);
  color: var(--text-main);
  border: 1px solid var(--primary, #15D6C2);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  transition: transform 0.15s ease;
}
.survey-draft-pill:hover {
  transform: translateY(-2px);
}

/* ── Testing pill ────────────────────────────────────────────────────────── */
.ks-pill {
  display: inline-flex;
  align-items: center;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #92400e;
  background: rgba(245, 158, 11, 0.16);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  white-space: nowrap;
}
:root[data-theme='dark-gray'] .ks-pill { color: #fbbf24; }

/* ── Segmented language control ──────────────────────────────────────────── */
.ks-seg {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 0.6rem;
  overflow: hidden;
  background: var(--soft-bg, transparent);
}
.ks-seg button {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.ks-seg button + button { border-left: 1px solid var(--border); }
.ks-seg button.active { background: var(--primary, #15D6C2); color: #04201d; }
.ks-seg--sm button { font-size: 0.72rem; padding: 0.25rem 0.6rem; }

/* ── Modal shell ─────────────────────────────────────────────────────────── */
.ks-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: color-mix(in srgb, var(--text-main) 32%, transparent);
  -webkit-backdrop-filter: blur(4px) saturate(120%);
  backdrop-filter: blur(4px) saturate(120%);
}
:root[data-theme='dark-gray'] .ks-overlay { background: rgba(0, 0, 0, 0.6); }
.ks-panel {
  display: flex;
  flex-direction: column;
  width: min(980px, 100%);
  max-height: calc(100vh - 3rem);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 1rem;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.ks-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.3rem;
  border-bottom: 1px solid var(--border);
}
.ks-title { font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.ks-subtitle { margin-top: 0.2rem; font-size: 0.8rem; line-height: 1.45; color: var(--text-muted); max-width: 52ch; }
.ks-head-actions { display: flex; align-items: center; gap: 0.6rem; flex-shrink: 0; }
.ks-close {
  height: 2rem; width: 2rem;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 0.5rem; border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.ks-close:hover { background: var(--soft-bg, rgba(0,0,0,0.04)); color: var(--text-main); }

.ks-preview-bar {
  padding: 0.45rem 1.3rem;
  font-size: 0.74rem;
  font-weight: 700;
  color: #92400e;
  background: rgba(245, 158, 11, 0.12);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
}
:root[data-theme='dark-gray'] .ks-preview-bar { color: #fbbf24; }

/* ── Progress ────────────────────────────────────────────────────────────── */
.ks-progress { padding: 1rem 1.3rem 0; }
.ks-steps { display: flex; gap: 0.4rem; }
.ks-step-bar { flex: 1; height: 0.3rem; border-radius: 9999px; background: var(--border); transition: background 0.25s ease; }
.ks-step-bar.done { background: var(--primary, #15D6C2); }
.ks-step-head { margin-top: 0.8rem; }
.ks-step-num { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--primary, #15D6C2); }
.ks-step-title { font-size: 1rem; font-weight: 800; color: var(--text-main); margin-top: 0.15rem; }
.ks-step-help { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.ks-body { padding: 1.1rem 1.3rem 1.3rem; overflow-y: auto; flex: 1 1 auto; -webkit-overflow-scrolling: touch; }

/* Option pill cards (multi-select) */
.ks-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.55rem; }
.ks-opt {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.85rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-muted, #94a3b8);
  font-size: 0.85rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.ks-opt:hover {
  border-color: rgba(21, 214, 194, 0.5);
  background: rgba(21, 214, 194, 0.05);
  color: var(--text-main);
  transform: translateY(-1px);
}
.ks-opt.active {
  border-color: var(--primary, #15D6C2);
  background: linear-gradient(135deg, var(--primary, #15D6C2) 0%, #10b981 100%);
  color: #04201d;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(21, 214, 194, 0.35);
}
.ks-opt span { flex: 1; }
.ks-opt-check { color: #04201d; opacity: 0; flex-shrink: 0; transition: opacity 0.15s ease; }
.ks-opt.active .ks-opt-check { opacity: 1; }

/* Clickable Chips layout */
.ks-chip-header { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em; }
.ks-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.ks-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 0.65rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted, #94a3b8);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.ks-chip:hover {
  border-color: rgba(21, 214, 194, 0.5);
  background: rgba(21, 214, 194, 0.05);
  color: var(--text-main);
  transform: scale(1.03);
}
.ks-chip.active {
  border-color: var(--primary, #15D6C2);
  background: linear-gradient(135deg, var(--primary, #15D6C2) 0%, #10b981 100%);
  color: #04201d;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(21, 214, 194, 0.35);
}

/* Mood selector grid */
.ks-mood-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.5rem; }
.ks-mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.75rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.ks-mood-btn:hover {
  border-color: rgba(21, 214, 194, 0.5);
  background: rgba(21, 214, 194, 0.05);
  color: var(--text-main);
  transform: translateY(-1px);
}
.ks-mood-btn:hover .ks-mood-smiley {
  transform: scale(1.15);
}
.ks-mood-btn.active {
  border-color: var(--primary, #15D6C2);
  background: linear-gradient(135deg, var(--primary, #15D6C2) 0%, #10b981 100%);
  color: #04201d;
  box-shadow: 0 4px 18px rgba(21, 214, 194, 0.35);
}
.ks-mood-smiley { font-size: 1.35rem; transition: transform 0.2s ease; }

/* Rating cards */
.ks-rate-group + .ks-rate-group { margin-top: 1.15rem; }
.ks-rate-q { font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.55rem; }
.ks-rate-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
.ks-rate {
  padding: 0.7rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 0.7rem;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted, #94a3b8);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.ks-rate:hover {
  border-color: rgba(21, 214, 194, 0.5);
  background: rgba(21, 214, 194, 0.05);
  color: var(--text-main);
  transform: translateY(-1px);
}
.ks-rate.active {
  border-color: var(--primary, #15D6C2);
  background: linear-gradient(135deg, var(--primary, #15D6C2) 0%, #10b981 100%);
  color: #04201d;
  box-shadow: 0 4px 14px rgba(21, 214, 194, 0.35);
}

/* Textareas & Review Card */
.ks-review-card {
  border: 1px solid var(--border);
  background: var(--soft-bg, rgba(255,255,255,0.01));
  border-radius: 0.75rem;
  overflow: hidden;
}
.ks-review-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 0.85rem;
}
.ks-review-row + .ks-review-row { border-top: 1px solid var(--border); }
.ks-review-cell { display: flex; flex-direction: column; min-width: 0; }
.ks-review-lbl { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 700; }
.ks-review-val { font-size: 0.78rem; font-weight: 500; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ks-review-edit {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: none;
  color: var(--primary, #15D6C2);
  font-size: 0.74rem;
  font-weight: 600;
  cursor: pointer;
}
.ks-review-edit:hover { text-decoration: underline; }

.ks-field + .ks-field { margin-top: 1rem; }
.ks-label { display: block; font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.4rem; }
.ks-textarea {
  width: 100%;
  border: 1.5px solid var(--border);
  background: var(--card-bg);
  color: var(--text-main);
  border-radius: 0.7rem;
  padding: 0.7rem 0.85rem;
  font-size: 0.88rem;
  line-height: 1.55;
  resize: vertical;
  min-height: 5rem;
}
.ks-textarea:focus { outline: none; border-color: var(--primary, #15D6C2); box-shadow: 0 0 0 3px rgba(21, 214, 194, 0.15); }
.ks-summary-box { background: var(--soft-bg, rgba(255,255,255,0.03)); border-style: dashed; }

/* Screenshot */
.ks-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 8rem;
  border: 2px dashed var(--border);
  border-radius: 0.9rem;
  background: var(--soft-bg, transparent);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.ks-drop:hover, .ks-drop.drag { border-color: var(--primary, #15D6C2); background: var(--primary-soft, rgba(21, 214, 194, 0.08)); }
.ks-drop:disabled { opacity: 0.6; cursor: default; }
.ks-drop-icon { color: var(--primary, #15D6C2); }
.ks-shot { position: relative; display: inline-block; max-width: 100%; }
.ks-shot img { max-height: 14rem; max-width: 100%; border-radius: 0.8rem; border: 1px solid var(--border); object-fit: contain; }
.ks-shot-remove {
  position: absolute; top: 0.5rem; right: 0.5rem;
  height: 1.9rem; width: 1.9rem;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 9999px; border: none;
  background: rgba(0, 0, 0, 0.6); color: #fff; cursor: pointer;
}
.ks-shot-remove:hover { background: rgba(0, 0, 0, 0.78); }

/* ── Footer ──────────────────────────────────────────────────────────────── */
.ks-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.3rem;
  border-top: 1px solid var(--border);
  background: var(--card-bg);
}
.ks-draft { font-size: 0.76rem; color: var(--text-muted); margin-right: auto; }

/* ── Thank-you ───────────────────────────────────────────────────────────── */
.ks-thanks { text-align: center; padding: 2.5rem 1rem; }
.ks-thanks-icon {
  display: inline-flex; align-items: center; justify-content: center;
  height: 3.5rem; width: 3.5rem; border-radius: 9999px;
  background: var(--primary-soft, rgba(21, 214, 194, 0.12)); color: var(--primary, #15D6C2);
}
.ks-thanks-title { font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-top: 0.7rem; }
.ks-thanks-text { font-size: 0.85rem; color: var(--text-muted); margin-top: 0.3rem; }

/* ── Transitions ─────────────────────────────────────────────────────────── */
.survey-banner-enter-active, .survey-fab-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.survey-banner-leave-active, .survey-fab-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.survey-banner-enter-from, .survey-banner-leave-to,
.survey-fab-enter-from, .survey-fab-leave-to { opacity: 0; transform: translateY(12px); }

.ks-modal-enter-active { transition: opacity 0.2s ease; }
.ks-modal-leave-active { transition: opacity 0.15s ease; }
.ks-modal-enter-from, .ks-modal-leave-to { opacity: 0; }
.ks-modal-enter-active .ks-panel { transition: transform 0.22s cubic-bezier(0.34, 1.3, 0.5, 1); }
.ks-modal-enter-from .ks-panel { transform: translateY(10px) scale(0.985); }

@media (prefers-reduced-motion: reduce) {
  .survey-banner-enter-active, .survey-banner-leave-active,
  .survey-fab-enter-active, .survey-fab-leave-active,
  .ks-modal-enter-active, .ks-modal-leave-active,
  .ks-modal-enter-active .ks-panel { transition: none; }
}

/* ── Mobile: full-screen sheet ───────────────────────────────────────────── */
@media (max-width: 640px) {
  .ks-overlay { padding: 0; }
  .ks-panel {
    width: 100%;
    max-width: 100%;
    height: 100vh;
    height: 100dvh;
    max-height: none;
    border-radius: 0;
    border: 0;
  }
  .ks-header { flex-wrap: wrap; }
  .ks-grid { grid-template-columns: repeat(2, 1fr); }
  .ks-mood-grid { grid-template-columns: repeat(3, 1fr); }
  .ks-rate-row { grid-template-columns: repeat(2, 1fr); }
  .ks-footer { flex-wrap: wrap; }
  .ks-footer .ks-draft { width: 100%; margin-bottom: 0.3rem; }
}
</style>
