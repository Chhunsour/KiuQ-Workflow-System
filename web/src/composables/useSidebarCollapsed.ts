import { ref } from 'vue';

const STORAGE_KEY = 'kiuq_sidebar_collapsed';

const readInitial = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

// Module-level singleton so Sidebar and AdminLayout share one source of truth.
const collapsed = ref<boolean>(readInitial());

const setCollapsed = (value: boolean) => {
  collapsed.value = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore storage errors — collapse still works for the session */
  }
};

const toggleCollapsed = () => setCollapsed(!collapsed.value);

export function useSidebarCollapsed() {
  return { collapsed, setCollapsed, toggleCollapsed };
}
