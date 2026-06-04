/**
 * Tiny runtime helpers for distinguishing the browser/PWA build from the
 * Tauri desktop build at startup.
 *
 * Tauri v2 exposes `window.__TAURI_INTERNALS__` (and `window.__TAURI__` on
 * older versions). We check both so the helper survives a future upgrade
 * without breaking the desktop build.
 */

interface TauriWindow {
  __TAURI__?: unknown;
  __TAURI_INTERNALS__?: unknown;
}

export const isTauri = (): boolean => {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as TauriWindow;
  return Boolean(w.__TAURI__ || w.__TAURI_INTERNALS__);
};

/**
 * True only when running in a browser context that can host service workers
 * AND we're not inside Tauri. Used to gate browser-only push notification
 * setup so the desktop build doesn't try to register an SW (Tauri's
 * WKWebView does not implement Service Workers).
 */
export const browserSupportsPush = (): boolean => {
  if (isTauri()) return false;
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'Notification' in window;
};
