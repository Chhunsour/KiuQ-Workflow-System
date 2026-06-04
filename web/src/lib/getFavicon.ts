/**
 * Favicon detection for WordPress / Hostinger / custom-theme sites.
 *
 * Strategy (in order):
 *  1. /favicon.ico              — direct image probe (no CORS)
 *  2. /apple-touch-icon.png     — iOS/PWA high-res icon
 *  3. /favicon.png / /icon.png  — common alternatives
 *  4. WP REST API site_icon_url — works when REST is open (no auth required)
 *  5. Google Favicon API        — cross-origin safe, reliable last resort
 *
 * All probes are non-blocking: save never waits for favicon.
 */

/** Probe whether an image URL actually loads (avoids CORS restriction on <img>). */
const probeImage = (url: string, timeoutMs = 3500): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(null); }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      // Reject 1×1 placeholder images servers return for missing assets
      if (img.naturalWidth <= 1 && img.naturalHeight <= 1) { resolve(null); return; }
      resolve(url);
    };
    img.onerror = () => { clearTimeout(timer); resolve(null); };
    img.src = url;
  });

/** Normalize raw user input to an origin string like "https://example.com". */
export const normalizeDomain = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return '';
  }
};

/** Try WordPress REST API to get the site icon URL. */
const probeWpSiteIcon = async (origin: string, timeoutMs = 4000): Promise<string | null> => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${origin}/wp-json/v2/settings`, {
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json: any = await res.json();
    const iconUrl: string | undefined = json?.site_icon_url;
    if (iconUrl && iconUrl.startsWith('http')) {
      return await probeImage(iconUrl, 3000);
    }
    return null;
  } catch {
    return null;
  }
};

/** Google Favicon API — always returns something, probe ensures it loaded. */
const googleFaviconUrl = (origin: string, size = 32) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=${size}`;

export const getFaviconUrl = async (domain: string): Promise<string | null> => {
  const origin = normalizeDomain(domain);
  if (!origin) return null;

  // Phase 1: fast direct-path probes (run in parallel)
  const directCandidates = [
    `${origin}/favicon.ico`,
    `${origin}/apple-touch-icon.png`,
    `${origin}/favicon.png`,
    `${origin}/icon.png`,
  ];

  // Run all direct probes simultaneously, take first winner
  const directResult = await Promise.all(directCandidates.map((u) => probeImage(u)));
  const directWinner = directResult.find((r) => r !== null) ?? null;
  if (directWinner) return directWinner;

  // Phase 2: WordPress REST API site_icon_url
  const wpResult = await probeWpSiteIcon(origin);
  if (wpResult) return wpResult;

  // Phase 3: Google Favicon API (reliable cross-origin fallback)
  const googleUrl = googleFaviconUrl(origin);
  const googleResult = await probeImage(googleUrl, 4000);
  if (googleResult) return googleResult;

  return null;
};
