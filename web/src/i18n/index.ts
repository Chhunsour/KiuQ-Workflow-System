import { createI18n } from 'vue-i18n';
import en from '../locales/en.json';
import km from '../locales/km.json';
import { supabase } from '../lib/supabase';

const savedLocale = localStorage.getItem('kiuq-locale') || 'en';

export const i18n = createI18n({
  legacy: false, // CompAPI mode
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: {
    en,
    km
  },
  missingWarn: true,
  fallbackWarn: false,
  missing(locale, key) {
    if (locale === 'km') {
      const enMessage = getNestedKey(en, key);
      const textToTranslate = (enMessage && typeof enMessage === 'string')
        ? enMessage
        : (!key.includes('.') && key.trim().length > 0 ? key : null);

      if (textToTranslate) {
        void autoTranslateKey(key, textToTranslate);
      }
    }
  }
});

// Helper to traverse nested keys (e.g. "performance.clicks")
function getNestedKey(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split('.').reduce((prev, curr) => prev && prev[curr], obj);
}

// Helper to set nested keys (e.g. "performance.clicks" = "...")
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

const translatingKeys = new Set<string>();

// Invoke Edge Function to translate in the background and insert to reactive store
async function autoTranslateKey(key: string, enMessage: string) {
  if (translatingKeys.has(key)) return;
  translatingKeys.add(key);

  try {
    const { data, error } = await supabase.functions.invoke('translate-ui-text', {
      body: {
        sourceText: enMessage,
        sourceLocale: 'en',
        targetLocale: 'km',
        key: key
      }
    });

    if (error) throw error;
    if (data && data.translatedText) {
      const kmMessages = i18n.global.getLocaleMessage('km');
      const newKmMessages = JSON.parse(JSON.stringify(kmMessages));
      setNestedKey(newKmMessages, key, data.translatedText);
      i18n.global.setLocaleMessage('km', newKmMessages);
      console.log(`[i18n-auto] Dynamically translated: "${key}" -> "${data.translatedText}"`);
    }
  } catch (err) {
    console.error(`[i18n-auto] Failed to translate: "${key}"`, err);
  } finally {
    translatingKeys.delete(key);
  }
}

// Fetch all cached translations at app load to avoid visual shifts
export async function loadCachedTranslations() {
  try {
    const { data, error } = await supabase
      .from('ui_translations_cache')
      .select('translation_key, translated_text')
      .eq('target_locale', 'km')
      .is('translation_key', 'not.null');

    if (error) throw error;
    if (data && data.length > 0) {
      const kmMessages = i18n.global.getLocaleMessage('km');
      const newKmMessages = JSON.parse(JSON.stringify(kmMessages));
      for (const item of data) {
        if (item.translation_key && item.translated_text) {
          setNestedKey(newKmMessages, item.translation_key, item.translated_text);
        }
      }
      i18n.global.setLocaleMessage('km', newKmMessages);
      console.log(`[i18n-auto] Preloaded ${data.length} cached translations from Supabase.`);
    }
  } catch (err) {
    console.error('[i18n-auto] Failed to preload cached translations:', err);
  }
}
