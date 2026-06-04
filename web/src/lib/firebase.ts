import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { browserSupportsPush } from '@/lib/runtime';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             as string,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID     as string,
};

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;

/**
 * `firebaseConfigured` gates EVERY downstream FCM call. We additionally
 * require `browserSupportsPush()` so that inside Tauri (WKWebView has no
 * Service Worker / web-push) every Firebase-push path no-ops cleanly. UI
 * components already check this flag to hide the push setup banner, so the
 * desktop build will show no broken notification UI.
 */
export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  vapidKey &&
  browserSupportsPush()
);

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let analytics: Analytics | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
  if (!firebaseConfigured) {
    console.warn('[firebase] Not configured — fill in VITE_FIREBASE_* and VITE_FIREBASE_VAPID_KEY in .env');
    return null;
  }
  if (!app) {
    app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    console.log('[firebase] App initialized, project:', firebaseConfig.projectId);
  }
  return app;
};

export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (!firebaseConfigured) return null;
  const supported = await isSupported();
  if (!supported) {
    console.warn('[firebase] FCM not supported in this browser (no SW or HTTPS?)');
    return null;
  }

  const fbApp = getFirebaseApp();
  if (!fbApp) return null;

  if (!messaging) {
    try {
      messaging = getMessaging(fbApp);
    } catch (err) {
      console.warn('[firebase] Failed to initialize messaging', err);
      return null;
    }
  }
  return messaging;
};

export const getFirebaseAnalytics = (): Analytics | null => {
  const fbApp = getFirebaseApp();
  if (!fbApp) return null;
  if (!analytics) {
    try {
      analytics = getAnalytics(fbApp);
    } catch {
      return null;
    }
  }
  return analytics;
};

export const getFcmToken = async (registration?: ServiceWorkerRegistration): Promise<string | null> => {
  const msg = await getFirebaseMessaging();
  if (!msg) return null;
  if (!vapidKey) {
    console.error('[fcm] VITE_FIREBASE_VAPID_KEY is missing');
    return null;
  }
  try {
    const swRegistration = registration ?? await navigator.serviceWorker.ready;
    console.log('[fcm] Using SW registration scope:', swRegistration.scope);
    const token = await getToken(msg, { vapidKey, serviceWorkerRegistration: swRegistration });
    if (!token) console.warn('[fcm] getToken returned empty string');
    return token || null;
  } catch (err) {
    console.error('[fcm] getToken() threw:', err);
    return null;
  }
};

export type ForegroundPayload = {
  title: string;
  body: string;
  link?: string;
  type?: string;
};

export const onForegroundMessage = async (callback: (payload: ForegroundPayload) => void): Promise<(() => void)> => {
  const msg = await getFirebaseMessaging();
  if (!msg) return () => {};
  const unsub = onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title ?? 'KiuQ Notification',
      body:  payload.notification?.body  ?? '',
      link:  (payload.data?.['link'] as string | undefined),
      type:  (payload.data?.['type'] as string | undefined),
    });
  });
  return unsub;
};

export { app as firebaseApp };
