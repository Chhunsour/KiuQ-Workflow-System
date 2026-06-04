const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Safely converts plain text with URLs into HTML with clickable links. */
export function linkifyText(text: string): string {
  if (!text) return '';
  const escaped = escapeHtml(text);
  const withLinks = escaped.replace(URL_RE, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="linkified">${url}</a>`;
  });
  return withLinks.replace(/\n/g, '<br>');
}

const MENTION_RE = /@([A-Za-z0-9_.]+)/g;

/** Extract the set of known handles mentioned in a piece of text. */
export function extractMentions(text: string, knownHandles: Set<string>): string[] {
  if (!text) return [];
  const found = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) {
    const h = m[1].toLowerCase();
    if (knownHandles.has(h)) found.add(h);
  }
  return [...found];
}

/**
 * Like linkifyText, but also highlights @mentions that resolve to a known
 * teammate handle. The whitelist (`handles`) keeps random "@x" inside URLs or
 * prose from being styled — only real teammate handles light up.
 */
export function renderComment(text: string, handles?: Set<string>): string {
  if (!text) return '';
  let html = escapeHtml(text);
  if (handles && handles.size) {
    html = html.replace(MENTION_RE, (full, handle: string) =>
      handles.has(handle.toLowerCase())
        ? `<span class="mention-chip">@${handle}</span>`
        : full
    );
  }
  html = html.replace(URL_RE, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="linkified">${url}</a>`
  );
  return html.replace(/\n/g, '<br>');
}
