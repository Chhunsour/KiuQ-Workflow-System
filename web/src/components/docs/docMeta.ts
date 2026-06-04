// Display metadata for the Docs Drive page.
// Keeps labels and icon SVG strings in one place so the page itself
// stays focused on layout.

import type {
  DocsAssignmentPriority,
  DocsAssignmentStatus,
  DocsFileType
} from '@/stores/data';

const svg = (path: string) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

export interface FileTypeMeta {
  value: DocsFileType;
  label: string;
  icon: string;
  swatch: string; // tailwind text/bg color hint
}

export const fileTypeOptions: FileTypeMeta[] = [
  {
    value: 'text_doc',
    label: 'Text Document',
    swatch: 'bg-violet-50 text-violet-700',
    icon: svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h4"/>'
    )
  },
  {
    value: 'google_doc',
    label: 'Google Doc',
    swatch: 'bg-blue-50 text-blue-700',
    icon: svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>'
    )
  },
  {
    value: 'google_sheet',
    label: 'Google Sheet',
    swatch: 'bg-green-50 text-green-700',
    icon: svg(
      '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/>'
    )
  },
  {
    value: 'google_drive',
    label: 'Drive Folder',
    swatch: 'bg-yellow-50 text-yellow-700',
    icon: svg(
      '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'
    )
  },
  {
    value: 'pdf',
    label: 'PDF',
    swatch: 'bg-red-50 text-red-700',
    icon: svg(
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><text x="8" y="18" font-size="6" stroke-width="0" fill="currentColor">PDF</text>'
    )
  },
  {
    value: 'image_folder',
    label: 'Image Folder',
    swatch: 'bg-purple-50 text-purple-700',
    icon: svg(
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'
    )
  },
  {
    value: 'website_link',
    label: 'Website Link',
    swatch: 'bg-sky-50 text-sky-700',
    icon: svg(
      '<path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/>'
    )
  },
  {
    value: 'other',
    label: 'Other',
    swatch: 'bg-gray-50 text-gray-700',
    icon: svg(
      '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/>'
    )
  }
];

export const fileTypeMeta = (type: DocsFileType): FileTypeMeta =>
  fileTypeOptions.find((o) => o.value === type) ?? fileTypeOptions[fileTypeOptions.length - 1];

export const fileTypeSelectOptions = fileTypeOptions.map((o) => ({
  value: o.value,
  label: o.label
}));

// External URL safety: ensure http/https prefix when opening.
export const safeOpenUrl = (raw: string): string | null => {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z]+:/i.test(trimmed)) return null; // reject mailto:, javascript:, etc.
  return `https://${trimmed}`;
};

// Whether the helper note about Drive sharing should be shown.
export const isGoogleDriveType = (type: DocsFileType): boolean =>
  type === 'google_doc' || type === 'google_sheet' || type === 'google_drive';

// ---------------- assignment status ----------------
export interface DocsStatusMeta {
  label: string;
  classes: string; // bg + text
}

export const docsStatusMeta = (status: DocsAssignmentStatus): DocsStatusMeta => {
  switch (status) {
    case 'viewed':
      return { label: 'Viewed', classes: 'bg-status-in-progress-bg text-status-in-progress-fg' };
    case 'used':
      return { label: 'Used', classes: 'bg-status-approved-bg text-status-approved-fg' };
    case 'archived':
      return { label: 'Archived', classes: 'bg-status-not-started-bg text-status-not-started-fg' };
    case 'sent':
    default:
      return { label: 'Sent', classes: 'bg-status-submitted-bg text-status-submitted-fg' };
  }
};

export interface DocsPriorityMeta {
  label: string;
  classes: string;
}

export const docsPriorityMeta = (priority: DocsAssignmentPriority): DocsPriorityMeta => {
  switch (priority) {
    case 'high':
      return { label: 'High', classes: 'bg-status-needs-fix-bg text-status-needs-fix-fg' };
    case 'low':
      return { label: 'Low', classes: 'bg-status-not-started-bg text-status-not-started-fg' };
    case 'normal':
    default:
      return { label: 'Normal', classes: 'bg-soft text-primary' };
  }
};

export const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' }
];

export const statusFilterOptions = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'used', label: 'Used' },
  { value: 'archived', label: 'Archived' }
];
