import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type ThemeMode = 'light' | 'dark-gray';

const storageKey = 'wordpress-prompt-system-theme';

const preferredTheme = (): ThemeMode => {
  const saved = window.localStorage.getItem(storageKey);
  if (saved === 'light' || saved === 'dark-gray') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-gray' : 'light';
};

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>('light');

  const isDarkGray = computed(() => mode.value === 'dark-gray');
  const label = computed(() => (isDarkGray.value ? 'Dark Gray Mode' : 'Light Mode'));

  const apply = (next: ThemeMode) => {
    mode.value = next;
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(storageKey, next);
  };

  const init = () => {
    apply(preferredTheme());
  };

  const toggle = () => {
    apply(isDarkGray.value ? 'light' : 'dark-gray');
  };

  return {
    mode,
    isDarkGray,
    label,
    init,
    apply,
    toggle
  };
});
