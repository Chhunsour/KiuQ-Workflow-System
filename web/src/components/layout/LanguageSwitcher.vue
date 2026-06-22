<template>
  <div class="relative inline-block text-left" ref="dropdownRef">
    <button
      type="button"
      class="flex items-center gap-2 rounded-btn px-2.5 py-1.5 text-xs font-semibold border border-border bg-card text-text-main hover:bg-soft transition select-none h-9 cursor-pointer"
      @click="open = !open"
      aria-:label="$t('Switch Language')"
      :title="$t('Switch Language')"
    >
      <component :is="activeLang.flag" class="w-[18px] h-[12px] flex-shrink-0 object-contain rounded-[1px]" />
      <span class="font-sans leading-none hidden sm:inline">{{ activeLang.name }}</span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="transition-transform duration-200 text-text-muted" :class="{ 'rotate-180': open }">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>
    
    <div
      v-if="open"
      class="absolute left-0 mt-1.5 z-50 w-36 rounded-card border border-border bg-card shadow-lg p-1 animate-slide-down"
    >
      <button
        v-for="lang in languages"
        :key="lang.code"
        type="button"
        class="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-sans font-semibold rounded-btn hover:bg-soft text-text-main transition cursor-pointer"
        :class="{ 'bg-primary-soft text-primary font-bold': locale === lang.code }"
        @click="selectLanguage(lang.code)"
      >
        <component :is="lang.flag" class="w-[18px] h-[12px] flex-shrink-0 object-contain rounded-[1px]" />
        <span>{{ lang.name }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, h, defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

const { locale } = useI18n();
const open = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

// Self-contained vector flag components (no broken asset paths)
const KhFlag = defineComponent({
  render() {
    return h('svg', {
      viewBox: '0 0 256 160',
      class: 'flag-icon flex-shrink-0',
      innerHTML: `<rect width="256" height="40" fill="#032F75"/><rect y="40" width="256" height="80" fill="#E01F26"/><rect y="120" width="256" height="40" fill="#032F75"/><path d="M128 48.3c-1.3 0-2.4 1-2.4 2.3v13.9H114V57.3c0-1.3-1.1-2.4-2.4-2.4s-2.4 1.1-2.4 2.4v7.2h-11.6V76.1c0 1.3 1.1 2.4 2.4 2.4h3.6v12h-4.8c-1.3 0-2.4 1-2.4 2.3v7.2H90.8c-1.3 0-2.4 1-2.4 2.3v15.7h99.2V102.3c0-1.3-1.1-2.4-2.4-2.4h-5.6v-7.2c0-1.3-1.1-2.4-2.4-2.3h-4.8v-12h3.6c1.3 0 2.4-1.1 2.4-2.4V64.5h-11.6v-7.2c0-1.3-1.1-2.4-2.4-2.4s-2.4 1.1-2.4 2.4v7.2h-11.6V50.6c0-1.3-1.1-2.3-2.4-2.3zm0 4.8c.4 0 .7.3.7.7V76h-1.4V53.8c0-.4.3-.7.7-.7zm-16.5 7c.4 0 .7.3.7.7V76h-1.4V60.8c0-.4.3-.7.7-.7zm33 0c.4 0 .7.3.7.7V76h-1.4V60.8c0-.4.3-.7.7-.7zM98.8 80.9h58.4v12h-58.4v-12zm-3.6 23.7h65.6v11H95.2v-11z" fill="#fff"/>`
    });
  }
});

const EnFlag = defineComponent({
  render() {
    return h('svg', {
      viewBox: '0 0 50 30',
      class: 'flag-icon flex-shrink-0',
      innerHTML: `<rect width="50" height="30" fill="#012169"/><path d="M0,0 L50,30 M50,0 L0,30" stroke="#fff" stroke-width="6"/><path d="M0,0 L50,30 M50,0 L0,30" stroke="#C8102E" stroke-width="2"/><path d="M25,0 V30 M0,15 H50" stroke="#fff" stroke-width="10"/><path d="M25,0 V30 M0,15 H50" stroke="#C8102E" stroke-width="6"/>`
    });
  }
});

const languages = [
  { code: 'en', name: 'English', flag: EnFlag },
  { code: 'km', name: 'Khmer', flag: KhFlag }
];

const activeLang = computed(() => {
  return languages.find(l => l.code === locale.value) || languages[0];
});

const selectLanguage = (code: string) => {
  locale.value = code;
  localStorage.setItem('kiuq-locale', code);
  open.value = false;
};

const handleOutsideClick = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    open.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleOutsideClick);
});
</script>

<script lang="ts">
export default {
  name: 'LanguageSwitcher'
};
</script>

<style scoped>
.animate-slide-down {
  animation: slide-down 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
:deep(.flag-icon) {
  display: block;
  border-radius: 1px;
}
</style>
