<template>
  <span class="cf-container" :style="{ width: size + 'px', height: Math.round(size * 0.75) + 'px' }">
    <img
      v-if="code === 'th'"
      src="/thailand-flag.png"
      class="cf-flag-icon"
      :title="countryName || 'Thailand'"
    />
    <span
      v-else-if="code"
      :class="['fi', 'fi-' + code, 'cf-flag-icon']"
      :title="countryName || code"
    />
    <svg
      v-else
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="cf-fallback-globe"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import 'flag-icons/css/flag-icons.min.css';

const props = withDefaults(
  defineProps<{
    countryName?: string | null;
    countryCode?: string | null;
    size?: number;
  }>(),
  {
    countryName: '',
    countryCode: null,
    size: 20
  }
);

// Alpha-3 to Alpha-2 code mapping (Google Search Console format uses ISO 3166-1 alpha-3 in lowercase)
const alpha3ToAlpha2: Record<string, string> = {
  usa: 'us', khm: 'kh', tha: 'th', vnm: 'vn', ind: 'in', chn: 'cn', jpn: 'jp',
  kor: 'kr', gbr: 'gb', aus: 'au', can: 'ca', fra: 'fr', deu: 'de', ita: 'it',
  esp: 'es', bra: 'br', rus: 'ru', mex: 'mx', sgp: 'sg', mys: 'my', phl: 'ph',
  idn: 'id', nld: 'nl', che: 'ch', swe: 'se', nor: 'no', fin: 'fi', dnk: 'dk',
  nzl: 'nz', zaf: 'za', tur: 'tr', ukr: 'ua', pol: 'pl', sau: 'sa', are: 'ae',
  twn: 'tw', hkg: 'hk', lao: 'la', mmr: 'mm', brn: 'bn', bel: 'be', aut: 'at',
  prt: 'pt', grc: 'gr', irl: 'ie', cze: 'cz', hun: 'hu', rou: 'ro', bgr: 'bg',
  hrv: 'hr', svk: 'sk', svn: 'si', est: 'ee', lva: 'lv', ltu: 'lt', lux: 'lu',
  isl: 'is', cyp: 'cy', mlt: 'mt', col: 'co', ven: 've', per: 'pe', arg: 'ar',
  chl: 'cl', ecu: 'ec', bol: 'bo', ury: 'uy', pry: 'py', pan: 'pa', cri: 'cr',
  slv: 'sv', gtm: 'gt', hnd: 'hn', nic: 'ni', cub: 'cu', dom: 'do', pri: 'pr',
  jam: 'jm', tto: 'tt', blz: 'bz', egy: 'eg', mar: 'ma', dza: 'dz', tun: 'tn',
  lby: 'ly', sdn: 'sd', nga: 'ng', ken: 'ke', eth: 'et', gha: 'gh', tza: 'tz',
  uga: 'ug', ago: 'ao', cod: 'cd', civ: 'ci', sen: 'sn', cmr: 'cm', isr: 'il',
  jor: 'jo', lbn: 'lb', syr: 'sy', irq: 'iq', irn: 'ir', kwt: 'kw', qat: 'qa',
  omn: 'om', yem: 'ye', bhr: 'bh'
};

const nameToAlpha2: Record<string, string> = {
  'united states': 'us',
  'united states of america': 'us',
  'cambodia': 'kh',
  'thailand': 'th',
  'vietnam': 'vn',
  'viet nam': 'vn',
  'india': 'in',
  'china': 'cn',
  'japan': 'jp',
  'south korea': 'kr',
  'korea, republic of': 'kr',
  'korea': 'kr',
  'united kingdom': 'gb',
  'great britain': 'gb',
  'uk': 'gb',
  'australia': 'au',
  'canada': 'ca',
  'france': 'fr',
  'germany': 'de',
  'italy': 'it',
  'spain': 'es',
  'brazil': 'br',
  'russia': 'ru',
  'russian federation': 'ru',
  'mexico': 'mx',
  'singapore': 'sg',
  'malaysia': 'my',
  'philippines': 'ph',
  'indonesia': 'id',
  'netherlands': 'nl',
  'switzerland': 'ch',
  'sweden': 'se',
  'norway': 'no',
  'finland': 'fi',
  'denmark': 'dk',
  'new zealand': 'nz',
  'south africa': 'za',
  'turkey': 'tr',
  'ukraine': 'ua',
  'poland': 'pl',
  'saudi arabia': 'sa',
  'united arab emirates': 'ae',
  'taiwan': 'tw',
  'hong kong': 'hk',
  'laos': 'la',
  'myanmar': 'mm',
  'burma': 'mm',
  'brunei': 'bn',
  'belgium': 'be',
  'austria': 'at',
  'portugal': 'pt',
  'greece': 'gr',
  'ireland': 'ie',
  'colombia': 'co',
  'venezuela': 've',
  'peru': 'pe',
  'argentina': 'ar',
  'chile': 'cl',
  'ecuador': 'ec',
  'bolivia': 'bo',
  'uruguay': 'uy',
  'paraguay': 'py',
  'panama': 'pa',
  'costa rica': 'cr',
  'el salvador': 'sv',
  'guatemala': 'gt',
  'honduras': 'hn',
  'nicaragua': 'ni',
  'cuba': 'cu',
  'dominican republic': 'do',
  'puerto rico': 'pr',
  'jamaica': 'jm',
  'trinidad and tobago': 'tt',
  'belize': 'bz',
  'egypt': 'eg',
  'morocco': 'ma',
  'algeria': 'dz',
  'tunisia': 'tn',
  'libya': 'ly',
  'sudan': 'sd',
  'nigeria': 'ng',
  'kenya': 'ke',
  'ethiopia': 'et',
  'ghana': 'gh',
  'tanzania': 'tz',
  'uganda': 'ug',
  'angola': 'ao',
  'congo': 'cd',
  'ivory coast': 'ci',
  'cote d\'ivoire': 'ci',
  'côte d\'ivoire': 'ci',
  'senegal': 'sn',
  'cameroon': 'cm',
  'israel': 'il',
  'jordan': 'jo',
  'lebanon': 'lb',
  'syria': 'sy',
  'iraq': 'iq',
  'iran': 'ir',
  'kuwait': 'kw',
  'qatar': 'qa',
  'oman': 'om',
  'yemen': 'ye',
  'bahrain': 'bh'
};

const code = computed(() => {
  if (props.countryCode) {
    const cc = props.countryCode.trim().toLowerCase();
    if (cc.length === 2 && /^[a-z]{2}$/.test(cc)) return cc;
    if (cc.length === 3 && /^[a-z]{3}$/.test(cc)) return alpha3ToAlpha2[cc] || null;
  }
  if (!props.countryName) return null;
  
  const name = props.countryName.trim().toLowerCase();
  
  // 1. Check if name itself is a 2-letter ISO code
  if (name.length === 2 && /^[a-z]{2}$/.test(name)) {
    return name;
  }
  
  // 2. Check if name itself is a 3-letter ISO code
  if (name.length === 3 && /^[a-z]{3}$/.test(name)) {
    return alpha3ToAlpha2[name] || null;
  }
  
  // 3. Match full name
  if (nameToAlpha2[name]) {
    return nameToAlpha2[name];
  }
  
  // 4. Try regex cleanups
  const cleanParentheses = name.replace(/\s*\(.*\)\s*/g, '').trim();
  if (nameToAlpha2[cleanParentheses]) {
    return nameToAlpha2[cleanParentheses];
  }
  
  const cleanComma = name.split(',')[0].trim();
  if (nameToAlpha2[cleanComma]) {
    return nameToAlpha2[cleanComma];
  }
  
  // 5. Substring match
  for (const [key, value] of Object.entries(nameToAlpha2)) {
    if (name.includes(key)) {
      return value;
    }
  }
  
  return null;
});
</script>

<style scoped>
.cf-container {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
}

.cf-flag-icon {
  width: 100%;
  height: 100%;
  display: block;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  object-fit: cover;
}

.cf-fallback-globe {
  width: 65%;
  height: 65%;
  color: var(--text-muted);
  opacity: 0.8;
}

/* Light mode specific border to make sure flags do not blend into background */
:root[data-theme='light'] .cf-container {
  border-color: rgba(0, 0, 0, 0.15);
}
</style>
