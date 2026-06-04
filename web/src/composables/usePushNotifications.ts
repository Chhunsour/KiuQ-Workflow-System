// Composable that manages FCM lifecycle for a logged-in user:
// – registers the service worker
// – gets + saves FCM token
// – sets up foreground message listener
// – exposes a requestPermission helper for the Settings page

import { ref } from 'vue';
import { firebaseConfigured } from '@/lib/firebase';
import { 
  initPushNotifications, 
  requestNotificationPermission, 
  disablePushNotifications,
  getPushSettings 
} from '@/services/pushNotifications';

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export const usePushNotifications = (options: {
  userId: string;
  onForeground?: (payload: any) => void;
}) => {
  const permission = ref<PushPermission>(getPushSettings().permission as PushPermission);
  const initializing = ref(false);
  let foregroundUnsub: (() => void) | null = null;

  const init = async () => {
    if (!firebaseConfigured) return;
    initializing.value = true;

    // The service handles registration and foreground listener setup
    foregroundUnsub = await initPushNotifications(options.onForeground);

    initializing.value = false;
  };

  const requestPermission = async (): Promise<PushPermission> => {
    const success = await requestNotificationPermission();
    if (success) {
      permission.value = 'granted';
    } else {
      permission.value = (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported') as PushPermission;
    }
    return permission.value;
  };

  const revoke = async () => {
    await disablePushNotifications();
    foregroundUnsub?.();
    foregroundUnsub = null;
  };

  return { permission, initializing, init, requestPermission, revoke };
};
