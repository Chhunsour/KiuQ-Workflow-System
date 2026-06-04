import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env
dotenv.config();

export interface AppConfig {
  webUrl: string;
  batching: {
    enabled: boolean;
    windowMs: number;
  };
  groupIds: {
    default: string;
    tasks?: string;
    quality_checks?: string;
    followups?: string;
    notifications?: string;
  };
  events: {
    tasks: {
      enabled: boolean;
      task_assigned: boolean;
      task_in_progress: boolean;
      task_submitted: boolean;
      task_needs_fix: boolean;
      task_completed: boolean;
      task_approved: boolean;
    };
    quality_checks: {
      enabled: boolean;
      issue_reported: boolean;
      issue_fixed: boolean;
      issue_approved: boolean;
      review_requested: boolean;
    };
    followups: {
      enabled: boolean;
      followup_due_today: boolean;
      followup_overdue: boolean;
      followup_completed: boolean;
    };
    notifications: {
      enabled: boolean;
    };
  };
  templates: {
    task_assigned: string;
    task_in_progress: string;
    task_submitted: string;
    task_needs_fix: string;
    task_completed: string;
    task_approved: string;
    quality_reported: string;
    quality_fixed: string;
    quality_approved: string;
    quality_needs_review: string;
    followup_due_today: string;
    followup_overdue: string;
    followup_completed: string;
    general_notification: string;
  };
}

// Environment variables
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL is not set in environment variables.');
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_KEY is not set in environment variables.');
  process.exit(1);
}

const CONFIG_PATH = path.resolve(__dirname, '../config.json');

/**
 * Loads the config.json dynamically from disk.
 */
export function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`Config file not found at ${CONFIG_PATH}`);
    }
    const rawData = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(rawData) as AppConfig;
    return parsed;
  } catch (error) {
    console.error(`ERROR: Failed to load config from ${CONFIG_PATH}:`, error);
    process.exit(1);
  }
}

/**
 * Resolves the destination group ID for a given category.
 * Falls back to default if category specific override is not configured.
 */
export function getGroupId(config: AppConfig, category: 'tasks' | 'quality_checks' | 'followups' | 'notifications'): string {
  const specificId = config.groupIds[category];
  if (specificId && specificId.trim() !== '') {
    return specificId.trim();
  }
  return config.groupIds.default || '';
}
