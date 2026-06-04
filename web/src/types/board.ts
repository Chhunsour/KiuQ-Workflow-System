import type { BoardColumnKey, Priority, PromptAssignment } from '@/stores/data';

export type AssignmentMode = 'duplicate' | 'shared';

export type LinkType =
  | 'website_url'
  | 'wordpress_admin'
  | 'product_page'
  | 'google_doc'
  | 'reference'
  | 'image_reference'
  | 'other';

export type TaskType =
  | 'create_website'
  | 'fix_section'
  | 'change_text_title'
  | 'update_design'
  | 'add_product'
  | 'add_blog'
  | 'seo_task'
  | 'mobile_fix'
  | 'bug_fix'
  | 'final_review'
  | 'other';

export type ChecklistTemplateKey =
  | 'website_build'
  | 'section_fix'
  | 'mobile_fix'
  | 'seo_check'
  | 'final_review';

export interface BoardColumn {
  key: BoardColumnKey;
  title: string;
  helper: string;
  color: string;
}

export interface BoardLink {
  id: string;
  title: string;
  url: string;
  type: LinkType;
  addedBy: string;
  createdAt: string;
}

export interface BoardAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  caption: string;
  uploadedBy: string;
  createdAt: string;
  originalSize?: number;
  optimizedSize?: number;
  compressionRatio?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy: string;
  completedAt: string;
  createdAt: string;
}

export interface BoardComment {
  id: string;
  userId: string;
  message: string;
  attachmentUrl: string;
  createdAt: string;
}

export interface BoardExtra {
  columnKey: BoardColumnKey | '';
  taskType: TaskType | '';
  assignmentMode: AssignmentMode;
  pageSection: string;
  title: string;
  shortDescription: string;
  instructions: string;
  description: string;
  coverImageUrl: string;
  labels: string[];
  links: BoardLink[];
  attachments: BoardAttachment[];
  checklist: ChecklistItem[];
  comments: BoardComment[];
  collaborators: string[];
  reviewerId: string;
  dueTime: string;
}

export interface BoardCard extends BoardExtra {
  id: string;
  assignment: PromptAssignment;
  columnKey: BoardColumnKey;
  promptTitle: string;
  promptId: string;
  projectName: string;
  websiteName: string;
  websiteDomain: string;
  pageSection: string;
  assignedMemberId: string;
  priority: Priority;
  dueDate: string;
  startDate: string;
  status: PromptAssignment['status'];
  adminNote: string;
  updatedAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
  checklistDone: number;
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { key: 'to_do', title: 'To Do', helper: 'Assigned but not started.', color: '#9ca3af' },
  { key: 'in_progress', title: 'In Progress', helper: 'Work currently active.', color: '#2563eb' },
  { key: 'waiting_review', title: 'Waiting Review', helper: 'Submitted to admin.', color: '#f97316' },
  { key: 'needs_fix', title: 'Needs Fix', helper: 'Admin requested changes.', color: '#ef4444' },
  { key: 'completed', title: 'Completed', helper: 'Approved or done.', color: '#16a34a' }
];

export const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: 'website_url', label: 'Website URL' },
  { value: 'wordpress_admin', label: 'WordPress Admin' },
  { value: 'product_page', label: 'Product Page' },
  { value: 'google_doc', label: 'Google Doc' },
  { value: 'reference', label: 'Reference' },
  { value: 'image_reference', label: 'Image Reference' },
  { value: 'other', label: 'Other' }
];

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: 'create_website', label: 'Create Website' },
  { value: 'fix_section', label: 'Fix Section' },
  { value: 'change_text_title', label: 'Change Text / Title' },
  { value: 'update_design', label: 'Update Design' },
  { value: 'add_product', label: 'Add Product' },
  { value: 'add_blog', label: 'Add Blog' },
  { value: 'seo_task', label: 'SEO Task' },
  { value: 'mobile_fix', label: 'Mobile Fix' },
  { value: 'bug_fix', label: 'Bug Fix' },
  { value: 'final_review', label: 'Final Review' },
  { value: 'other', label: 'Other' }
];
