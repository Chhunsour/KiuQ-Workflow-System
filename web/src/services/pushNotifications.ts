import { supabase } from '@/lib/supabase';
import { getFcmToken, onForegroundMessage, firebaseConfigured } from '@/lib/firebase';
import { useAuthStore } from '@/stores/auth';

// ── Dev-mode logger ──────────────────────────────────────────────────────────
const DEV = import.meta.env.DEV;
const log  = (...args: unknown[]) => { if (DEV) console.log('[push]',  ...args); };
const warn = (...args: unknown[]) => { if (DEV) console.warn('[push]',  ...args); };
const err  = (...args: unknown[]) => {           console.error('[push]', ...args); };

// ── Service Worker ───────────────────────────────────────────────────────────

const SW_PATH  = '/firebase-messaging-sw.js';
const SW_SCOPE = '/';   // must match the scope the SW was registered with

const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) {
    warn('Service workers not supported in this browser');
    return null;
  }
  try {
    const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
    if (existing) {
      const activeScript = existing.active?.scriptURL ?? existing.installing?.scriptURL ?? existing.waiting?.scriptURL ?? '';
      const activePath = activeScript ? new URL(activeScript).pathname : '';
      if (activePath === SW_PATH) {
        log('Re-using Firebase service worker, scope:', existing.scope);
        return existing;
      }

      warn('Replacing non-Firebase service worker for push:', activePath || existing.scope);
      await existing.unregister();
    }

    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
    await navigator.serviceWorker.ready;
    log('Service worker registered, scope:', reg.scope);
    return reg;
  } catch (e) {
    err('Service worker registration failed:', e);
    return null;
  }
};

// ── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY   = 'kiuq-fcm-token';
const ENABLED_KEY = 'push_enabled';

// ── Public types ─────────────────────────────────────────────────────────────

export interface PushSubscriptionSettings {
  enabled:    boolean;
  permission: NotificationPermission;
  hasToken:   boolean;
}

// ── Device info ──────────────────────────────────────────────────────────────

const deviceInfo = () => {
  const ua = navigator.userAgent;
  const platform =
    /iPhone|iPad/.test(ua) ? 'iOS'     :
    /Android/.test(ua)     ? 'Android' :
    /Mac/.test(ua)         ? 'macOS'   :
    /Win/.test(ua)         ? 'Windows' : 'Unknown';
  const browser =
    /Edg\//.test(ua)    ? 'Edge'    :
    /Chrome\//.test(ua) ? 'Chrome'  :
    /Firefox/.test(ua)  ? 'Firefox' :
    /Safari/.test(ua)   ? 'Safari'  : 'Browser';
  const device =
    /Mobile/.test(ua) ? `${browser} Mobile` : `${browser} on ${platform}`;
  return { platform, browser, device };
};

// ── Read current settings ─────────────────────────────────────────────────────

export const getPushSettings = (): PushSubscriptionSettings => ({
  enabled:    localStorage.getItem(ENABLED_KEY) === 'true',
  permission: typeof Notification !== 'undefined' ? Notification.permission : 'default',
  hasToken:   !!localStorage.getItem(TOKEN_KEY),
});

// ── Save / refresh FCM token to Supabase ─────────────────────────────────────

export const syncToken = async (): Promise<boolean> => {
  const auth = useAuthStore();

  if (!firebaseConfigured) {
    warn('syncToken: Firebase not configured, skipping');
    return false;
  }
  if (!auth.user?.id) {
    warn('syncToken: No authenticated user, skipping');
    return false;
  }

  // Double-check the Supabase session is valid before touching the DB
  const { data: sessionData } = await supabase.auth.getUser();
  if (!sessionData?.user?.id) {
    warn('syncToken: Supabase session invalid, skipping');
    return false;
  }

  try {
    log('Registering service worker…');
    const swReg = await registerServiceWorker();
    if (!swReg) {
      err('Could not register service worker — cannot get FCM token');
      return false;
    }

    // Wait until the SW is active (handles fresh installs)
    if (swReg.installing || swReg.waiting) {
      await new Promise<void>((resolve) => {
        const sw = swReg.installing ?? swReg.waiting!;
        sw.addEventListener('statechange', function handler() {
          if (sw.state === 'activated') {
            sw.removeEventListener('statechange', handler);
            resolve();
          }
        });
        // Fallback: if already activated before listener fires
        if (swReg.active) resolve();
      });
    }

    log('Requesting FCM token…');
    const token = await getFcmToken(swReg);
    if (!token) {
      err('getToken() returned null — check VAPID key, SW registration, and HTTPS');
      return false;
    }
    log('FCM token obtained:', token.slice(0, 24) + '…');

    // Skip DB write if same token already stored this session
    const cached = localStorage.getItem(TOKEN_KEY);
    if (cached === token) {
      log('Token already synced this session, skipping DB write ✓');
      return true;
    }

    const { platform, browser, device } = deviceInfo();
    const now = new Date().toISOString();

    log('Upserting token to push_subscriptions…', { user_id: auth.user.id, browser, platform });

    const { error: upsertErr } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id:      auth.user.id,
          fcm_token:    token,
          browser,
          platform,
          device_name:  device,
          is_active:    true,
          last_used_at: now,
          updated_at:   now,
        },
        { onConflict: 'user_id,fcm_token' }
      );

    if (upsertErr) {
      err('Supabase upsert error:', upsertErr.code, upsertErr.message, upsertErr.details);
      return false;
    }

    localStorage.setItem(TOKEN_KEY,   token);
    localStorage.setItem(ENABLED_KEY, 'true');
    log('Token saved to push_subscriptions ✓');
    return true;
  } catch (e) {
    err('Unexpected error in syncToken:', e);
    return false;
  }
};

// ── Request browser permission + sync token ───────────────────────────────────

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (typeof Notification === 'undefined') {
    warn('Notification API not available in this browser');
    return false;
  }
  if (!firebaseConfigured) {
    warn('Firebase not configured — fill in VITE_FIREBASE_* env vars');
    return false;
  }

  try {
    log('Requesting browser notification permission…');
    const permission = await Notification.requestPermission();
    log('Permission result:', permission);

    if (permission === 'granted') {
      return await syncToken();
    }
    if (permission === 'denied') {
      warn('Permission denied — user must allow in browser settings');
    }
    return false;
  } catch (e) {
    err('requestPermission threw:', e);
    return false;
  }
};

// ── Mark token inactive in DB ─────────────────────────────────────────────────

export const disablePushNotifications = async (): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY);
  const auth  = useAuthStore();

  localStorage.setItem(ENABLED_KEY, 'false');

  if (token && auth.user?.id) {
    try {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .match({ user_id: auth.user.id, fcm_token: token });
      localStorage.removeItem(TOKEN_KEY);
      log('Token marked inactive ✓');
    } catch (e) {
      warn('Failed to deactivate token in DB:', e);
    }
  }
};

// ── Init: register SW + foreground listener ───────────────────────────────────

export const initPushNotifications = async (
  onMessageReceived?: (payload: unknown) => void
): Promise<(() => void) | null> => {
  if (!firebaseConfigured) return null;

  // Register SW unconditionally so Firebase Messaging can work in background
  await registerServiceWorker();

  const permission = typeof Notification !== 'undefined' ? Notification.permission : 'denied';
  log('initPushNotifications — browser permission:', permission);

  // Auto-sync token if user already granted permission (e.g. after page refresh)
  if (permission === 'granted') {
    void syncToken();
  }

  // Set up foreground message handler (fires when tab is visible/focused)
  const unsub = await onForegroundMessage((payload) => {
    log('Foreground FCM message received:', payload);
    if (onMessageReceived) onMessageReceived(payload);
  });

  return unsub ?? null;
};
