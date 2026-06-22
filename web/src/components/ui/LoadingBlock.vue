<template>
  <div v-if="loading && !timedOut && !error" class="card card-pad flex flex-col items-center justify-center py-16 text-center min-h-[300px]">
    <div class="mb-6 ui-font text-lg font-bold text-text-main tracking-tight">{{ $t('KiuQ Website System') }}</div>
    
    <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-soft/50 text-3xl shadow-sm border border-border">
      <span class="animate-pulse">{{ currentMessage.emoji }}</span>
    </div>
    
    <div class="relative overflow-hidden rounded-full bg-soft/30 px-6 py-2 mb-2 max-w-sm">
      <div class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-text-soft/15 to-transparent"></div>
      <div class="ui-font text-sm font-medium text-text-main relative z-10">{{ currentMessage.text }}</div>
    </div>
    
    <div class="flex gap-1 mt-3">
      <div class="w-2 h-2 rounded-full bg-primary/40 animate-[bounce_1.4s_infinite_0s]"></div>
      <div class="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1.4s_infinite_0.2s]"></div>
      <div class="w-2 h-2 rounded-full bg-primary/80 animate-[bounce_1.4s_infinite_0.4s]"></div>
    </div>
  </div>

  <div v-else-if="timedOut && !error" class="card card-pad flex flex-col items-center justify-center py-12 text-center">
    <div class="mb-4 text-4xl">{{ $t('😅') }}</div>
    <div class="ui-font text-lg font-bold text-status-needs-fix-fg mb-2">{{ $t('This is taking longer than expected') }}</div>
    <div class="text-sm text-text-muted max-w-md mx-auto mb-6">{{ $t('The data is taking too long to load. Try again before we blame the cloud.') }}</div>
    <div class="flex gap-3 justify-center">
      <button v-if="retry" class="btn-primary px-4" type="button" @click="onRetry">
        {{ $t('Retry') }}
      </button>
      <RouterLink to="/" class="btn-secondary px-4">
        {{ $t('Go Dashboard') }}
      </RouterLink>
    </div>
  </div>

  <div v-else-if="error" class="card card-pad flex flex-col items-center justify-center py-12 text-center">
    <div class="mb-4 text-4xl">{{ $t('😵') }}</div>
    <div class="ui-font text-lg font-bold text-status-needs-fix-fg mb-2">{{ $t('Could not load data') }}</div>
    <div class="text-sm text-text-muted max-w-md mx-auto mb-6">{{ $t('Something went wrong while loading this page. Please try again.') }}</div>
    <p v-if="error !== true" class="text-xs text-text-muted/70 mb-6 bg-soft/50 p-2 rounded max-w-sm mx-auto overflow-hidden text-ellipsis whitespace-nowrap">{{ error }}</p>
    <div class="flex gap-3 justify-center">
      <button v-if="retry" class="btn-primary px-4" type="button" @click="onRetry">
        {{ $t('Retry') }}
      </button>
    </div>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';

const props = withDefaults(
  defineProps<{
    loading: boolean;
    error: string | boolean | null;
    retry?: () => void | Promise<void>;
    timeoutMs?: number;
  }>(),
  { timeoutMs: 10_000 }
);

const funnyMessages = [
  { text: "Waking up the tiny robots", emoji: "🤖" },
  { text: "Loading your website magic", emoji: "✨" },
  { text: "Asking the database nicely", emoji: "🗂️" },
  { text: "Preparing your work board", emoji: "🧠" },
  { text: "Finding your tasks before they escape", emoji: "🏃" },
  { text: "Dusting off the prompt library", emoji: "📚" },
  { text: "Counting team points without cheating", emoji: "🏆" },
  { text: "Pulling data from the cloud", emoji: "☁️" },
  { text: "Making everything look less broken", emoji: "🛠️" },
  { text: "Loading… please do not fight the computer", emoji: "😭" },
  { text: "Convincing the server that we paid for this", emoji: "😭" },
  { text: "Fetching data like it owes us money", emoji: "💸" },
  { text: "Checking if the cloud is still awake", emoji: "☁️" },
  { text: "Paying respect to the database gods", emoji: "🙏" },
  { text: "Loading KiuQ secrets… just kidding, calm down", emoji: "🔐" },
  { text: "Finding the task your teammate definitely forgot", emoji: "👀" },
  { text: "Organizing chaos into cards", emoji: "🃏" },
  { text: "Preparing prompts that hopefully don’t sound lame", emoji: "📚" },
  { text: "Looking for the missing deadline before admin does", emoji: "⏰" },
  { text: "Making the dashboard look busy so Sour stays calm", emoji: "😭" },
  { text: "Checking who is online and who is pretending", emoji: "👀" },
  { text: "Counting points, no bribing the leaderboard", emoji: "🏆" },
  { text: "Finding work before work finds you", emoji: "🧠" },
  { text: "Loading files, links, tasks, and emotional damage", emoji: "🛠️" },
  { text: "Asking the work board to behave today", emoji: "🙏" },
  { text: "Summoning the prompt library from the cloud", emoji: "📚" },
  { text: "Loading your tasks… yes, they are still there", emoji: "😭" },
  { text: "Trying to make website work less painful", emoji: "✨" },
  { text: "Searching for the button that actually works", emoji: "🔍" },
  { text: "One member is named Samnang, but no Samnang today", emoji: "🍀" },
  { text: "Samnang means lucky… the task deadline disagrees", emoji: "😭" },
  { text: "Checking if Samnang finally got lucky with this task", emoji: "🍀" },
  { text: "Loading luck level: Samnang pending…", emoji: "⏳" },
  { text: "Preparing the board before someone says ‘I didn’t see the task’", emoji: "👀" }
];

const getRandomMessage = () => funnyMessages[Math.floor(Math.random() * funnyMessages.length)];

const currentMessage = ref(getRandomMessage());
const timedOut = ref(false);
let timeoutTimer: ReturnType<typeof setTimeout> | null = null;
let rotateTimer: ReturnType<typeof setTimeout> | null = null;

const cleanupTimers = () => {
  if (timeoutTimer) clearTimeout(timeoutTimer);
  if (rotateTimer) clearTimeout(rotateTimer);
  timeoutTimer = null;
  rotateTimer = null;
};

watch(
  () => props.loading,
  (isLoading) => {
    cleanupTimers();
    if (!isLoading) {
      timedOut.value = false;
      return;
    }
    
    // Pick a new message for each new loading session
    currentMessage.value = getRandomMessage();
    timedOut.value = false;

    // Rotate message once after 6 seconds
    rotateTimer = setTimeout(() => {
      if (props.loading && !timedOut.value && !props.error) {
        let nextMsg;
        do {
          nextMsg = getRandomMessage();
        } while (nextMsg.text === currentMessage.value.text);
        currentMessage.value = nextMsg;
      }
    }, 6000);

    // Timeout after 10 seconds
    timeoutTimer = setTimeout(() => {
      if (props.loading && !props.error) {
        timedOut.value = true;
      }
    }, props.timeoutMs);
  },
  { immediate: true }
);

const onRetry = async () => {
  timedOut.value = false;
  currentMessage.value = getRandomMessage();
  await props.retry?.();
};

onBeforeUnmount(cleanupTimers);
</script>

<style scoped>
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
