// Supabase Edge Function: translate-ui-text
// Automates UI text translation to target locales (e.g. Khmer) and caches results in Supabase.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GOOGLE_KEY = Deno.env.get("GOOGLE_TRANSLATION_API_KEY");
const DEEPL_KEY = Deno.env.get("DEEPL_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  sourceText: string;
  sourceLocale?: string;
  targetLocale?: string;
  context?: string;
  key?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Authenticate caller (must be a valid authenticated user of the app)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: userErr } = await supabase.auth.getUser(authHeader.slice(7));
  if (userErr || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  // 2. Parse request payload
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { sourceText } = body;
  const sourceLocale = body.sourceLocale || "en";
  const targetLocale = body.targetLocale || "km";
  const context = body.context || null;
  const key = body.key || null;

  if (!sourceText) {
    return json({ error: "sourceText is required" }, 400);
  }

  // 3. Skip translation for non-translatable texts (numbers, URLs, variables, emails)
  if (shouldSkipTranslation(sourceText)) {
    console.log(`[translate-ui-text] Skipping translation for: "${sourceText}"`);
    return json({ translatedText: sourceText, skipped: true });
  }

  try {
    // 4. Check cache table
    const { data: cached, error: cacheErr } = await supabase
      .from("ui_translations_cache")
      .select("translated_text")
      .eq("target_locale", targetLocale)
      .eq("source_text", sourceText)
      .maybeSingle();

    if (cacheErr) {
      console.error(`[translate-ui-text] Cache query error:`, cacheErr.message);
    }

    if (cached?.translated_text) {
      console.log(`[translate-ui-text] Cache HIT for: "${sourceText}" -> "${cached.translated_text}"`);
      return json({ translatedText: cached.translated_text, cached: true });
    }

    // 5. Cache MISS - Perform translation
    console.log(`[translate-ui-text] Cache MISS for: "${sourceText}". Translating...`);
    const result = await performTranslation(sourceText, sourceLocale, targetLocale);

    if (result.translatedText) {
      // 6. Save back to cache table using upsert to avoid race condition conflicts
      const { error: dbErr } = await supabase
        .from("ui_translations_cache")
        .upsert({
          source_locale: sourceLocale,
          target_locale: targetLocale,
          source_text: sourceText,
          translated_text: result.translatedText,
          translation_key: key,
          context: context,
          provider: result.provider,
          is_auto_generated: true,
          is_reviewed: false,
          updated_at: new Date().toISOString()
        }, { onConflict: "target_locale,source_text" });

      if (dbErr) {
        console.error(`[translate-ui-text] Cache write error:`, dbErr.message);
      }

      return json({ translatedText: result.translatedText, cached: false, provider: result.provider });
    } else {
      throw new Error("Translation provider returned empty string");
    }

  } catch (err) {
    console.error(`[translate-ui-text] Translation failed:`, String(err));
    // Fallback to English on translation failure
    return json({ translatedText: sourceText, error: String(err), fallback: true });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function shouldSkipTranslation(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed === "") return true;

  // 1. Numbers only (digits, spaces, percent, dots, commas, dashes, slashes, currency symbols)
  const numbersOnlyRegex = /^[0-9\s.,%+$£€¥៛\-()\/]+$/;
  if (numbersOnlyRegex.test(trimmed)) return true;

  // 2. URLs (starts with http/https or contains domain suffixes)
  const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[a-zA-Z0-9-._~:\/?#\[\]@!$&'()*+,;=]*)?$/;
  if (urlRegex.test(trimmed) || trimmed.includes(".com") || trimmed.includes(".net") || trimmed.includes(".org") || trimmed.includes("localhost") || trimmed.startsWith("http")) {
    return true;
  }

  // 3. Emails
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (emailRegex.test(trimmed)) return true;

  // 4. KiuQ brand name
  if (trimmed.toLowerCase() === "kiuq") return true;

  // 5. Code variables (snake_case, camelCase starting with lowercase)
  const isSnakeCase = /^[a-z]+_[a-z0-9_]+$/.test(trimmed);
  const isCamelCase = /^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(trimmed);
  if (isSnakeCase || isCamelCase) return true;

  return false;
}

async function performTranslation(text: string, sl: string, tl: string): Promise<{ translatedText: string; provider: string }> {
  // Option A: Paid Google Cloud Translation API
  if (GOOGLE_KEY) {
    try {
      const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source: sl,
          target: tl,
          format: "text"
        })
      });
      if (res.ok) {
        const raw = await res.json();
        const translated = raw?.data?.translations?.[0]?.translatedText;
        if (translated) {
          return { translatedText: translated, provider: "google-paid" };
        }
      } else {
        console.error(`Google Paid API error: ${res.statusText}`, await res.text());
      }
    } catch (e) {
      console.error("Google Paid Translation API request failed:", e);
    }
  }

  // Option B: Paid DeepL API
  if (DEEPL_KEY) {
    try {
      const isFree = DEEPL_KEY.endsWith(":fx");
      const url = isFree ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: [text],
          target_lang: tl.toUpperCase()
        })
      });
      if (res.ok) {
        const raw = await res.json();
        const translated = raw?.translations?.[0]?.text;
        if (translated) {
          return { translatedText: translated, provider: "deepl-paid" };
        }
      } else {
        console.error(`DeepL Paid API error: ${res.statusText}`, await res.text());
      }
    } catch (e) {
      console.error("DeepL Paid Translation API request failed:", e);
    }
  }

  // Option C: Free Google Translate API client fallback
  const freeUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(freeUrl);
  if (res.ok) {
    const raw = await res.json();
    if (raw && raw[0]) {
      const translated = raw[0].map((item: any) => item[0]).join("");
      if (translated) {
        return { translatedText: translated, provider: "google-free" };
      }
    }
  } else {
    throw new Error(`Free Google Translate API returned status ${res.statusText}`);
  }

  throw new Error("No translation succeeded across providers");
}
