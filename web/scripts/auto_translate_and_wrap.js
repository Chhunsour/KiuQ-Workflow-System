import fs from 'fs';
import path from 'path';

// Parse command line arguments
const isRun = process.argv.includes('--run');
console.log(`======================================================================`);
console.log(`KIUQ AUTO-TRANSLATE & WRAPPER SCRIPT`);
console.log(`Mode: ${isRun ? 'RUN (Modifying files & database)' : 'DRY RUN (Previewing changes only - pass --run to execute)'}`);
console.log(`======================================================================\n`);

// 1. Load environment variables from .env
const envPath = path.resolve('.env');
if (!fs.existsSync(envPath)) {
  console.error(`Error: .env file not found at ${envPath}`);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY not found in .env');
  process.exit(1);
}

// 2. Helper to check if a string is hardcoded English to translate
function isHardcodedEnglish(text) {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed === '') return false;

  // Skip if it contains Vue tags, bindings, or standard logic variables
  if (trimmed.includes('{{') || trimmed.includes('}}') || trimmed.includes('$t(')) return false;

  // Skip numbers-only, punctuation, icons, or stats
  if (/^[0-9\s.,%+$£€¥៛\-()\/▲▼:|—]+$/.test(trimmed)) return false;

  // Skip URLs, domains, email, code
  if (trimmed.includes('.com') || trimmed.includes('.net') || trimmed.includes('.org') || trimmed.includes('http') || trimmed.includes('@')) return false;

  // Skip technical camelCase or snake_case variables (e.g. formatTotals, isManagement)
  if (/^[a-z]+_[a-z0-9_]+$/.test(trimmed) || /^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(trimmed)) return false;

  // Skip FontAwesome or other classes if matched accidentally
  if (trimmed.startsWith('fa-') || trimmed.startsWith('icon-')) return false;

  // If it's single character or punctuation, skip
  if (trimmed.length <= 1) return false;

  return true;
}

// 3. State machine template rewriter & text-node extractor
function processTemplate(templateContent) {
  let inTag = false;
  let quoteChar = null; // null, '"', "'", or '`'
  let currentText = '';
  let currentTag = '';
  let output = '';
  const stringsToTranslate = new Set();

  // Track double curly braces for Vue interpolations inside text nodes
  let braceDepth = 0;

  for (let i = 0; i < templateContent.length; i++) {
    const char = templateContent[i];
    const nextChar = templateContent[i + 1] || '';

    if (!inTag) {
      if (char === '<') {
        // Tag starts
        if (currentText) {
          const trimmed = currentText.trim();
          if (isHardcodedEnglish(trimmed)) {
            stringsToTranslate.add(trimmed);
            const leadingWhitespace = currentText.match(/^\s*/)[0];
            const trailingWhitespace = currentText.match(/\s*$/)[0];
            const escaped = trimmed.replace(/'/g, "\\'");
            output += `${leadingWhitespace}{{ $t('${escaped}') }}${trailingWhitespace}`;
          } else {
            output += currentText;
          }
        }
        currentText = '';
        inTag = true;
        currentTag = '';
      } else {
        // Text node character
        if (char === '{' && nextChar === '{') {
          braceDepth++;
          currentText += char + nextChar;
          i++; // skip next char
        } else if (char === '}' && nextChar === '}') {
          braceDepth--;
          currentText += char + nextChar;
          i++; // skip next char
        } else {
          currentText += char;
        }
      }
    } else {
      // Inside tag
      currentTag += char;
      if (quoteChar) {
        if (char === quoteChar) {
          quoteChar = null; // exit quote
        }
      } else {
        if (char === '"' || char === "'" || char === '`') {
          quoteChar = char; // enter quote
        } else if (char === '>') {
          inTag = false; // exit tag
          
          // Process attributes inside completed tag
          let processedTag = currentTag;
          const attrRegex = /(?<![:\w])(placeholder|label|title)="([^"]+)"/g;
          processedTag = processedTag.replace(attrRegex, (match, attrName, attrValue) => {
            const val = attrValue.trim();
            if (isHardcodedEnglish(val)) {
              stringsToTranslate.add(val);
              const escaped = val.replace(/'/g, "\\'");
              return `:${attrName}="$t('${escaped}')"`;
            }
            return match;
          });

          output += '<' + processedTag;
          currentTag = '';
        }
      }
    }
  }

  // Flush remaining text
  if (currentText) {
    const trimmed = currentText.trim();
    if (isHardcodedEnglish(trimmed)) {
      stringsToTranslate.add(trimmed);
      const leadingWhitespace = currentText.match(/^\s*/)[0];
      const trailingWhitespace = currentText.match(/\s*$/)[0];
      const escaped = trimmed.replace(/'/g, "\\'");
      output += `${leadingWhitespace}{{ $t('${escaped}') }}${trailingWhitespace}`;
    } else {
      output += currentText;
    }
  }

  return { rewritten: output, strings: Array.from(stringsToTranslate) };
}

// 4. Find all .vue files recursively in key directories
function getVueFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getVueFiles(filePath));
    } else if (filePath.endsWith('.vue')) {
      results.push(filePath);
    }
  });
  return results;
}

// 5. Fetch free translation from Google
async function translateText(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=km&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const raw = await res.json();
    if (raw && raw[0]) {
      return raw[0].map(item => item[0]).join('');
    }
  } catch (err) {
    console.error(`[Translate Error] "${text}":`, err.message);
  }
  return null;
}

// 6. Direct PostgREST database upsert using fetch
async function fetchCachedTranslations() {
  const url = `${SUPABASE_URL}/rest/v1/ui_translations_cache?select=source_text,translated_text&target_locale=eq.km`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      const cache = new Map();
      data.forEach(item => {
        cache.set(item.source_text, item.translated_text);
      });
      return cache;
    } else {
      console.warn('[Database] Failed to fetch cache:', res.status, await res.text());
    }
  } catch (err) {
    console.warn('[Database] Failed to fetch cached translations:', err.message);
  }
  return new Map();
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function upsertTranslations(payload) {
  if (payload.length === 0) return;
  const url = `${SUPABASE_URL}/rest/v1/ui_translations_cache?on_conflict=target_locale,source_text`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
      const errMsg = await res.text();
      throw new Error(`Database upsert returned status ${res.status}: ${errMsg}`);
    }
    const inserted = await res.json();
    console.log(`[Database] Upserted ${inserted.length} translation record(s) successfully.`);
  } catch (err) {
    console.error(`[Database Error]`, err.message);
  }
}

// Main execution block
async function main() {
  const srcPages = path.resolve('src/pages');
  const srcComponents = path.resolve('src/components');
  const srcLayouts = path.resolve('src/layouts');

  const files = [
    ...getVueFiles(srcPages),
    ...getVueFiles(srcComponents),
    ...getVueFiles(srcLayouts)
  ];

  console.log(`Discovered ${files.length} Vue file(s) under src/pages, src/components, and src/layouts.`);
  
  const allHardcodedStrings = new Set();
  const fileUpdates = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const templateStart = content.indexOf('<template>');
    const templateEnd = content.lastIndexOf('</template>');
    if (templateStart === -1 || templateEnd === -1) continue;

    const beforeTemplate = content.substring(0, templateStart + 10);
    const templateContent = content.substring(templateStart + 10, templateEnd);
    const afterTemplate = content.substring(templateEnd);

    // Clean HTML comments to avoid translation scanner matching comment strings
    const cleanTemplate = templateContent.replace(/<!--[\s\S]*?-->/g, (match) => {
      // Return space placeholders of same length to maintain index alignment
      return ' '.repeat(match.length);
    });

    const { rewritten, strings } = processTemplate(cleanTemplate);

    // Reconstruct rewritten file with comments restored
    // (We parse cleanTemplate to keep index mapping correct, but we must reconstruct the original file)
    // To restore comments, we just perform state machine on templateContent
    const { rewritten: finalRewrittenTemplate } = processTemplate(templateContent);

    if (strings.length > 0) {
      strings.forEach(s => allHardcodedStrings.add(s));
      fileUpdates.push({
        path: file,
        before: content,
        after: beforeTemplate + finalRewrittenTemplate + afterTemplate,
        strings: strings
      });
    }
  }

  console.log(`\nFound ${fileUpdates.length} file(s) containing a total of ${allHardcodedStrings.size} unique hardcoded English string(s).\n`);

  if (allHardcodedStrings.size === 0) {
    console.log('No hardcoded strings found. Nothing to translate!');
    return;
  }

  // Preview all hardcoded strings
  console.log('--- UNIQUE STRINGS FOUND ---');
  Array.from(allHardcodedStrings).sort().forEach(s => console.log(` - "${s}"`));
  console.log('----------------------------\n');

  // Load existing translations
  console.log('Fetching existing translations from cache...');
  const cache = await fetchCachedTranslations();
  console.log(`Loaded ${cache.size} cached translation(s) from database.`);

  // Translate all strings
  console.log('Translating unique strings to Khmer...');
  const translationMap = new Map();
  const dbPayload = [];

  for (const str of allHardcodedStrings) {
    if (cache.has(str)) {
      const cachedVal = cache.get(str);
      translationMap.set(str, cachedVal);
      continue;
    }

    console.log(`Translating: "${str}"...`);
    const translation = await translateText(str);
    if (translation) {
      console.log(` -> "${translation}"`);
      translationMap.set(str, translation);
      dbPayload.push({
        source_locale: 'en',
        target_locale: 'km',
        source_text: str,
        translated_text: translation,
        translation_key: str,
        provider: 'google-free-preseeded',
        is_auto_generated: true,
        is_reviewed: false
      });
      await sleep(200); // 200ms delay to respect Google limits
    } else {
      console.log(` -> FAILED (Will fallback to English)`);
    }
  }

  if (isRun) {
    // 1. Seed database
    console.log('\nSeeding translation cache in Supabase...');
    await upsertTranslations(dbPayload);

    // 2. Rewrite files
    console.log('\nRewriting Vue components on disk...');
    for (const update of fileUpdates) {
      const relPath = path.relative(path.resolve(), update.path);
      fs.writeFileSync(update.path, update.after, 'utf-8');
      console.log(`[Rewritten] ${relPath} (${update.strings.length} string(s) wrapped)`);
    }
    console.log('\nAll files successfully rewritten and database cache pre-seeded!');
  } else {
    console.log('\nDry run complete. No files were written to disk and no database writes were made.');
    console.log('To apply these changes, run the script with the --run flag:');
    console.log('  node scripts/auto_translate_and_wrap.js --run');
  }
}

main().catch(err => {
  console.error('Fatal error during execution:', err);
});
