<template>
  <span class="sb-badge" :data-variant="map[props.status].variant">
    <span class="sb-dot" />
    {{ labelText }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type Status =
  | 'not_started'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'completed'
  | 'pending'
  | 'assigned'
  | 'pending_review'
  | 'submitted'
  | 'needs_fix'
  | 'needs_resubmission'
  | 'blocked'
  | 'rejected'
  | 'draft'
  | 'published'
  | 'open'
  | 'resolved'
  | 'reviewed'
  | 'active'
  | 'inactive'
  | 'deactivated'
  | 'deleted'
  | 'postponed'
  | 'in_development';

const props = defineProps<{ status: Status; label?: string }>();

const map: Record<Status, { label: string; variant: string }> = {
  not_started:      { label: 'Not Started',      variant: 'neutral'  },
  pending:          { label: 'Pending',           variant: 'neutral'  },
  draft:            { label: 'Draft',             variant: 'neutral'  },
  inactive:         { label: 'Inactive',          variant: 'neutral'  },
  in_progress:      { label: 'In Progress',       variant: 'blue'     },
  assigned:         { label: 'Assigned',          variant: 'blue'     },
  in_development:   { label: 'In Development',    variant: 'blue'     },
  review:           { label: 'Review',            variant: 'purple'   },
  pending_review:   { label: 'Pending Review',    variant: 'orange'   },
  submitted:        { label: 'Submitted',         variant: 'orange'   },
  open:             { label: 'Open',              variant: 'orange'   },
  needs_fix:        { label: 'Needs Fix',         variant: 'red'      },
  needs_resubmission: { label: 'Needs Resubmission', variant: 'red'  },
  blocked:          { label: 'Blocked',           variant: 'red'      },
  rejected:         { label: 'Rejected',          variant: 'red'      },
  deactivated:      { label: 'Deactivated',       variant: 'red'      },
  deleted:          { label: 'Deleted',           variant: 'red'      },
  approved:         { label: 'Approved',          variant: 'green'    },
  completed:        { label: 'Completed',         variant: 'teal'     },
  published:        { label: 'Published',         variant: 'green'    },
  resolved:         { label: 'Resolved',          variant: 'green'    },
  reviewed:         { label: 'Reviewed',          variant: 'green'    },
  active:           { label: 'Active',            variant: 'green'    },
  postponed:        { label: 'Postponed',         variant: 'purple'   },
};

const labelText = computed(() => props.label ?? map[props.status].label);
</script>

<style scoped>
.sb-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
  padding: 0.24rem 0.6rem;
  border-radius: 999px;
  border: 1px solid transparent;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.005em;
  white-space: nowrap;
  line-height: 1;
}

.sb-dot {
  width: 0.44rem;
  height: 0.44rem;
  border-radius: 999px;
  flex-shrink: 0;
}

/* ── Neutral ── */
.sb-badge[data-variant='neutral'] {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #4b5563;
}
.sb-badge[data-variant='neutral'] .sb-dot { background: #9ca3af; }

/* ── Blue (In Progress) ── */
.sb-badge[data-variant='blue'] {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}
.sb-badge[data-variant='blue'] .sb-dot { background: #3b82f6; }

/* ── Purple (Review) ── */
.sb-badge[data-variant='purple'] {
  background: #ede9fe;
  border-color: #c4b5fd;
  color: #6d28d9;
}
.sb-badge[data-variant='purple'] .sb-dot { background: #7c3aed; }

/* ── Orange (Submitted/Pending Review) ── */
.sb-badge[data-variant='orange'] {
  background: #ffedd5;
  border-color: #fdba74;
  color: #c2410c;
}
.sb-badge[data-variant='orange'] .sb-dot { background: #f97316; }

/* ── Red (Needs Fix / Blocked) ── */
.sb-badge[data-variant='red'] {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #b91c1c;
}
.sb-badge[data-variant='red'] .sb-dot { background: #ef4444; }

/* ── Green (Approved / Published) ── */
.sb-badge[data-variant='green'] {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}
.sb-badge[data-variant='green'] .sb-dot { background: #22c55e; }

/* ── Teal (Completed) ── */
.sb-badge[data-variant='teal'] {
  background: #ccfbf1;
  border-color: #5eead4;
  color: #0f766e;
}
.sb-badge[data-variant='teal'] .sb-dot { background: #14b8a6; }

/* ── Dark mode ── */
:root[data-theme='dark-gray'] .sb-badge[data-variant='neutral'] {
  background: rgba(156, 163, 175, 0.12);
  border-color: rgba(156, 163, 175, 0.28);
  color: #d1d5db;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='neutral'] .sb-dot { background: #9ca3af; }

:root[data-theme='dark-gray'] .sb-badge[data-variant='blue'] {
  background: rgba(59, 130, 246, 0.14);
  border-color: rgba(59, 130, 246, 0.38);
  color: #93c5fd;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='blue'] .sb-dot { background: #60a5fa; }

:root[data-theme='dark-gray'] .sb-badge[data-variant='purple'] {
  background: rgba(124, 58, 237, 0.14);
  border-color: rgba(124, 58, 237, 0.36);
  color: #c4b5fd;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='purple'] .sb-dot { background: #a78bfa; }

:root[data-theme='dark-gray'] .sb-badge[data-variant='orange'] {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.36);
  color: #fdba74;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='orange'] .sb-dot { background: #fb923c; }

:root[data-theme='dark-gray'] .sb-badge[data-variant='red'] {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.36);
  color: #fca5a5;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='red'] .sb-dot { background: #f87171; }

:root[data-theme='dark-gray'] .sb-badge[data-variant='green'] {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.32);
  color: #86efac;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='green'] .sb-dot { background: #4ade80; }

:root[data-theme='dark-gray'] .sb-badge[data-variant='teal'] {
  background: rgba(20, 184, 166, 0.12);
  border-color: rgba(20, 184, 166, 0.32);
  color: #5eead4;
}
:root[data-theme='dark-gray'] .sb-badge[data-variant='teal'] .sb-dot { background: #2dd4bf; }
</style>
