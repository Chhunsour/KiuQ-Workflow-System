import fs from 'fs';
import path from 'path';

// Files to scan by priority
const priorityFiles = [
  'src/components/layout/Sidebar.vue',
  'src/components/layout/Topbar.vue',
  'src/components/performance/PerformanceSidebar.vue',
  'src/components/performance/PageIndexing.vue',
  'src/pages/PerformancePage.vue',
  'src/pages/SettingsPage.vue',
  'src/pages/TranslationReviewPage.vue',
  'src/pages/TodaysWorkPage.vue',
  'src/pages/QualityCheckPage.vue',
  'src/pages/QualityBoardPage.vue'
];

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Extract template block
  const templateStart = content.indexOf('<template>');
  const templateEnd = content.lastIndexOf('</template>');
  if (templateStart === -1 || templateEnd === -1) {
    return;
  }

  console.log(`\n======================================================================`);
  console.log(`SCANNING: ${filePath}`);
  console.log(`======================================================================`);

  let templateDepth = 0;
  let inComment = false;
  let count = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const openMatches = (line.match(/<template\b/g) || []).length;
    const closeMatches = (line.match(/<\/template>/g) || []).length;

    const wasInTemplate = templateDepth > 0;
    templateDepth += openMatches - closeMatches;
    if (templateDepth < 0) templateDepth = 0; // prevent negative index just in case
    const isInTemplate = templateDepth > 0;

    if (!wasInTemplate && !isInTemplate) continue;
    if (openMatches > 0 || closeMatches > 0) continue; // Skip lines that open/close a template block to avoid scanning template tags themselves

    // Skip comments
    let cleanLine = line;
    if (cleanLine.includes('<!--')) inComment = true;
    if (inComment) {
      if (cleanLine.includes('-->')) {
        inComment = false;
        cleanLine = cleanLine.substring(cleanLine.indexOf('-->') + 3);
      } else {
        continue;
      }
    }

    // 1. Scan for text between tags: e.g. >Average line< or >Current Period<
    // Match text that does not contain tag symbols < or > or vue interpolation {{ or }}
    const tagTextMatches = cleanLine.matchAll(/>([^<>{}\n\r\t]+)</g);
    for (const match of tagTextMatches) {
      const text = match[1].trim();
      if (isHardcodedEnglish(text)) {
        console.log(`[Line ${lineNum}] Text node: "${text}"`);
        console.log(`   Suggestion: Replace with {{ $t('${text}') }}`);
        count++;
      }
    }

    // 2. Scan for hardcoded attributes: placeholder="...", label="...", title="..."
    // e.g. placeholder="Search queries..." or label="Active members"
    const attrMatches = cleanLine.matchAll(/(placeholder|label|title)="([^"{}]+)"/g);
    for (const match of attrMatches) {
      const attr = match[1];
      const val = match[2].trim();
      if (isHardcodedEnglish(val)) {
        console.log(`[Line ${lineNum}] Attribute ${attr}: "${val}"`);
        console.log(`   Suggestion: Replace with :${attr}="$t('${val}')"`);
        count++;
      }
    }
  }

  console.log(`Found ${count} hardcoded English string(s) in ${filePath}`);
}

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

// Run scanner on priority files
const baseDir = path.resolve();
for (const file of priorityFiles) {
  scanFile(path.join(baseDir, file));
}
