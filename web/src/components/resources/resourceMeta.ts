// Display metadata for the Resources feature.
// Keeps icons + labels + helpers in one place so cards/forms stay focused.

import type { Resource, ResourceStatus, ResourceType, ResourceVisibility } from '@/stores/data';

const svg = (path: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

export interface ResourceTypeMeta {
  value: ResourceType;
  label: string;
  icon: string;
  swatch: string; // tailwind classes
  inputMode: 'file' | 'link' | 'text';
}

export const resourceTypeOptions: ResourceTypeMeta[] = [
  {
    value: 'file',
    label: 'File Upload',
    swatch: 'bg-blue-50 text-blue-700',
    inputMode: 'file',
    icon: svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>'
    )
  },
  {
    value: 'link',
    label: 'External Link',
    swatch: 'bg-sky-50 text-sky-700',
    inputMode: 'link',
    icon: svg(
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/>'
    )
  },
  {
    value: 'note',
    label: 'Text Note',
    swatch: 'bg-yellow-50 text-yellow-700',
    inputMode: 'text',
    icon: svg(
      '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 14h6M9 18h4"/>'
    )
  },
  {
    value: 'document',
    label: 'Document / Instruction',
    swatch: 'bg-indigo-50 text-indigo-700',
    inputMode: 'text',
    icon: svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>'
    )
  },
  {
    value: 'website_ref',
    label: 'Website Reference',
    swatch: 'bg-emerald-50 text-emerald-700',
    inputMode: 'link',
    icon: svg(
      '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>'
    )
  },
  {
    value: 'screenshot',
    label: 'Screenshot / Image',
    swatch: 'bg-purple-50 text-purple-700',
    inputMode: 'file',
    icon: svg(
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
    )
  }
];

export const resourceTypeMeta = (type: ResourceType): ResourceTypeMeta =>
  resourceTypeOptions.find((o) => o.value === type) ?? resourceTypeOptions[0];

export const resourceTypeSelectOptions = resourceTypeOptions.map((o) => ({
  value: o.value,
  label: o.label
}));

// Visibility / status badge styling
export interface BadgeMeta {
  label: string;
  classes: string;
}

export const visibilityMeta = (v: ResourceVisibility): BadgeMeta => {
  switch (v) {
    case 'team':
      return { label: 'Team Visible', classes: 'bg-soft text-primary' };
    case 'admin_only':
      return { label: 'Admin Only', classes: 'bg-status-needs-fix-bg text-status-needs-fix-fg' };
    case 'private':
    default:
      return { label: 'Private', classes: 'bg-status-not-started-bg text-status-not-started-fg' };
  }
};

export const statusMeta = (s: ResourceStatus): BadgeMeta =>
  s === 'published'
    ? { label: 'Published', classes: 'bg-status-approved-bg text-status-approved-fg' }
    : { label: 'Draft', classes: 'bg-status-not-started-bg text-status-not-started-fg' };

// File-size formatter (bytes → human-readable).
export const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
};

// Shorthand for the friendly "kind" label on a card (Type + sub-info).
export const resourceTypeLabel = (type: ResourceType) => resourceTypeMeta(type).label;

// Light URL validation. Accepts bare domains and prefixes them with https://.
export const normalizeExternalUrl = (raw: string): string | null => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null; // mailto:, javascript:, etc — refuse
  return `https://${trimmed}`;
};

export const visibilitySelectOptions = (isAdmin: boolean) => {
  const base = [
    { value: 'private', label: 'Private (only me)' },
    { value: 'team', label: 'Team Visible (whole team)' }
  ];
  if (isAdmin) base.push({ value: 'admin_only', label: 'Admin Only' });
  return base;
};

export const statusSelectOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' }
];

export const isFileType = (t: ResourceType) =>
  resourceTypeMeta(t).inputMode === 'file';
export const isLinkType = (t: ResourceType) =>
  resourceTypeMeta(t).inputMode === 'link';
export const isTextType = (t: ResourceType) =>
  resourceTypeMeta(t).inputMode === 'text';

// Shared title fallback when the resource title is empty.
export const resourceDisplayTitle = (r: Resource) => r.title || r.fileName || 'Untitled';
