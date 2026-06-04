import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY, loadConfig, getGroupId } from './config';
import { queueMessage, QueueEvent } from './queue';

// Initialize Supabase Client with service_role key to bypass RLS policies
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

let channels: RealtimeChannel[] = [];

// Cache structures to reduce redundant API calls
const cache = {
  websites: new Map<string, string>(),
  profiles: new Map<string, string>(),
  prompts: new Map<string, string>()
};

// ============================================================================
// 🔍 DB Helper Functions (Resolvers)
// ============================================================================

async function getWebsiteName(websiteId: string | null): Promise<string> {
  if (!websiteId) return 'KiuQ System';
  if (cache.websites.has(websiteId)) {
    return cache.websites.get(websiteId)!;
  }
  try {
    const { data, error } = await supabase
      .from('websites')
      .select('name')
      .eq('id', websiteId)
      .maybeSingle();

    if (error || !data) return 'KiuQ System';
    cache.websites.set(websiteId, data.name);
    return data.name;
  } catch (err) {
    return 'KiuQ System';
  }
}

async function getUserName(userId: string | null): Promise<string> {
  if (!userId) return 'Unassigned';
  if (cache.profiles.has(userId)) {
    return cache.profiles.get(userId)!;
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return 'Unknown User';
    cache.profiles.set(userId, data.full_name || 'Unknown User');
    return data.full_name || 'Unknown User';
  } catch (err) {
    return 'Unknown User';
  }
}

interface UserProfileInfo {
  fullName: string;
  phone: string;
}

const profileDetailCache = new Map<string, UserProfileInfo>();

async function getUserProfile(userId: string | null): Promise<UserProfileInfo | null> {
  if (!userId) return null;
  if (profileDetailCache.has(userId)) {
    return profileDetailCache.get(userId)!;
  }
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) return null;
    const info = {
      fullName: data.full_name || 'Unknown User',
      phone: data.phone || ''
    };
    profileDetailCache.set(userId, info);
    return info;
  } catch (err) {
    return null;
  }
}

function formatPhoneToJid(phone: string): string | null {
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) {
    digits = '855' + digits.slice(1);
  }
  return `${digits}@c.us`;
}

async function getPromptTitle(promptId: string | null): Promise<string> {
  if (!promptId) return 'Unnamed Task';
  if (cache.prompts.has(promptId)) {
    return cache.prompts.get(promptId)!;
  }
  try {
    const { data, error } = await supabase
      .from('prompt_templates')
      .select('title')
      .eq('id', promptId)
      .maybeSingle();

    if (error || !data) return 'Unnamed Task';
    cache.prompts.set(promptId, data.title);
    return data.title;
  } catch (err) {
    return 'Unnamed Task';
  }
}

// ============================================================================
// 📬 Realtime Payload Handlers
// ============================================================================

/**
 * Handle prompt assignments (Tasks) realtime inserts and updates
 */
async function handleTaskChange(payload: any): Promise<void> {
  const config = loadConfig();
  if (!config.events.tasks.enabled) return;

  const eventType = payload.eventType;
  const newRow = payload.new;
  const oldRow = payload.old;

  let triggerEvent: string | null = null;

  if (eventType === 'INSERT') {
    if (newRow.status === 'pending' || newRow.assigned_member_id) {
      triggerEvent = 'task_assigned';
    }
  } else if (eventType === 'UPDATE') {
    const statusChanged = oldRow ? newRow.status !== oldRow.status : true;
    const assigneeChanged = oldRow ? newRow.assigned_member_id !== oldRow.assigned_member_id : false;

    if (assigneeChanged && newRow.assigned_member_id) {
      triggerEvent = 'task_assigned';
    } else if (statusChanged) {
      switch (newRow.status) {
        case 'pending':
          triggerEvent = 'task_assigned';
          break;
        case 'in_progress':
          triggerEvent = 'task_in_progress';
          break;
        case 'submitted':
          triggerEvent = 'task_submitted';
          break;
        case 'needs_fix':
        case 'needs_resubmission':
          triggerEvent = 'task_needs_fix';
          break;
        case 'approved':
          triggerEvent = 'task_approved';
          break;
      }
    }
  }

  if (triggerEvent) {
    // Check config toggle
    const isEnabled = (config.events.tasks as any)[triggerEvent];
    if (!isEnabled) return;

    // Fetch related details
    const website = await getWebsiteName(newRow.website_id);
    const title = await getPromptTitle(newRow.prompt_id);
    let user = await getUserName(newRow.assigned_member_id);
    const priority = newRow.priority || 'normal';
    const taskUrl = `${config.webUrl}/work-board/my`;

    const mentions: string[] = [];
    if (newRow.assigned_member_id) {
      const profile = await getUserProfile(newRow.assigned_member_id);
      if (profile && profile.phone) {
        const jid = formatPhoneToJid(profile.phone);
        if (jid) {
          const phoneDigits = jid.split('@')[0];
          mentions.push(jid);
          user = `@${phoneDigits} (${profile.fullName})`;
        }
      }
    }

    const oldStatus = oldRow ? `${oldRow.status}:${oldRow.assigned_member_id || ''}` : null;
    const newStatus = `${newRow.status}:${newRow.assigned_member_id || ''}`;

    const event: QueueEvent = {
      id: newRow.id,
      category: 'tasks',
      website,
      actionType: triggerEvent,
      title,
      user,
      priority: priority.toUpperCase(),
      url: taskUrl,
      oldStatus,
      newStatus,
      mentions
    };

    const groupId = getGroupId(config, 'tasks');
    queueMessage(groupId, event);
  }
}

/**
 * Handle quality issues realtime inserts and updates
 */
async function handleQualityIssueChange(payload: any): Promise<void> {
  const config = loadConfig();
  if (!config.events.quality_checks.enabled) return;

  const eventType = payload.eventType;
  const newRow = payload.new;
  const oldRow = payload.old;

  let triggerEvent: string | null = null;

  if (eventType === 'INSERT') {
    triggerEvent = 'quality_reported';
  } else if (eventType === 'UPDATE') {
    const statusChanged = oldRow ? newRow.status !== oldRow.status : true;
    if (statusChanged) {
      switch (newRow.status) {
        case 'new_issue':
          triggerEvent = 'quality_reported';
          break;
        case 'fixed':
          triggerEvent = 'quality_fixed';
          break;
        case 'needs_review':
          triggerEvent = 'quality_needs_review';
          break;
        case 'approved':
          triggerEvent = 'quality_approved';
          break;
      }
    }
  }

  if (triggerEvent) {
    // Map trigger event to toggle in config
    const toggleMap: Record<string, string> = {
      quality_reported: 'issue_reported',
      quality_fixed: 'issue_fixed',
      quality_approved: 'issue_approved',
      quality_needs_review: 'review_requested'
    };
    
    const configToggle = toggleMap[triggerEvent];
    if (!configToggle || !(config.events.quality_checks as any)[configToggle]) return;

    // Fetch details
    const website = await getWebsiteName(newRow.website_id);
    const title = newRow.title || 'Untitled Issue';
    let user = await getUserName(newRow.assigned_to || newRow.created_by);
    const priority = newRow.priority || 'normal';
    const issueUrl = `${config.webUrl}/work-board/quality-check`;

    const mentions: string[] = [];
    const recipientId = newRow.assigned_to || newRow.created_by;
    if (recipientId) {
      const profile = await getUserProfile(recipientId);
      if (profile && profile.phone) {
        const jid = formatPhoneToJid(profile.phone);
        if (jid) {
          const phoneDigits = jid.split('@')[0];
          mentions.push(jid);
          user = `@${phoneDigits} (${profile.fullName})`;
        }
      }
    }

    const oldStatus = oldRow ? `${oldRow.status}:${oldRow.assigned_to || ''}` : null;
    const newStatus = `${newRow.status}:${newRow.assigned_to || ''}`;

    const event: QueueEvent = {
      id: newRow.id,
      category: 'quality_checks',
      website,
      actionType: triggerEvent,
      title,
      user,
      priority: priority.toUpperCase(),
      url: issueUrl,
      oldStatus,
      newStatus,
      mentions
    };

    const groupId = getGroupId(config, 'quality_checks');
    queueMessage(groupId, event);
  }
}

/**
 * Handle direct followup slot completions
 */
async function handleFollowupSlotChange(type: 'blog' | 'plugin' | 'speed', payload: any): Promise<void> {
  const config = loadConfig();
  if (!config.events.followups.enabled || !config.events.followups.followup_completed) return;

  const eventType = payload.eventType;
  const newRow = payload.new;
  const oldRow = payload.old;

  if (eventType === 'UPDATE') {
    const wasCompleted = oldRow?.status === 'done' || oldRow?.status === 'late';
    const isCompleted = newRow.status === 'done' || newRow.status === 'late';

    if ((isCompleted && !wasCompleted) || (!isCompleted && wasCompleted)) {
      const trigger = isCompleted ? 'followup_completed' : 'followup_reverted';
      const website = await getWebsiteName(newRow.website_id);
      let user = await getUserName(newRow.completed_by || newRow.assigned_to);
      const mentions: string[] = [];
      const recipientId = newRow.completed_by || newRow.assigned_to;
      if (recipientId) {
        const profile = await getUserProfile(recipientId);
        if (profile && profile.phone) {
          const jid = formatPhoneToJid(profile.phone);
          if (jid) {
            const phoneDigits = jid.split('@')[0];
            mentions.push(jid);
            user = `@${phoneDigits} (${profile.fullName})`;
          }
        }
      }
      
      let typeName = 'Followup';
      let urlPath = '/followup';
      if (type === 'blog') {
        typeName = 'Blog Followup';
        urlPath = '/followup/blog';
      } else if (type === 'plugin') {
        typeName = 'Plugin Update';
        urlPath = '/followup/plugins';
      } else if (type === 'speed') {
        typeName = 'Speed check';
        urlPath = '/followup/speed-optimization';
      }

      const followupUrl = `${config.webUrl}${urlPath}`;

      const event: QueueEvent = {
        id: newRow.id,
        category: 'followups',
        website,
        actionType: trigger,
        title: typeName,
        user,
        url: followupUrl,
        oldStatus: oldRow ? `${oldRow.status}:${oldRow.assigned_to || ''}` : null,
        newStatus: `${newRow.status}:${newRow.assigned_to || ''}`,
        mentions
      };

      const groupId = getGroupId(config, 'followups');
      queueMessage(groupId, event);
    }
  }
}

/**
 * Handle direct eBay followup completions
 */
async function handleEbayFollowupChange(payload: any): Promise<void> {
  const config = loadConfig();
  if (!config.events.followups.enabled || !config.events.followups.followup_completed) return;

  const eventType = payload.eventType;
  const newRow = payload.new;
  const oldRow = payload.old;

  const wasCompleted = oldRow?.status === 'done';
  const isCompleted = newRow.status === 'done';

  if ((eventType === 'INSERT' && isCompleted) || 
      (eventType === 'UPDATE' && isCompleted && !wasCompleted)) {
    
    let user = await getUserName(newRow.user_id);
    const mentions: string[] = [];
    if (newRow.user_id) {
      const profile = await getUserProfile(newRow.user_id);
      if (profile && profile.phone) {
        const jid = formatPhoneToJid(profile.phone);
        if (jid) {
          const phoneDigits = jid.split('@')[0];
          mentions.push(jid);
          user = `@${phoneDigits} (${profile.fullName})`;
        }
      }
    }
    
    const event: QueueEvent = {
      id: newRow.id,
      category: 'followups',
      website: 'eBay click system',
      actionType: 'followup_completed',
      title: 'eBay Click Check',
      user,
      url: `${config.webUrl}/followup/ebay-click`,
      oldStatus: oldRow ? `${oldRow.status}:${oldRow.user_id || ''}` : null,
      newStatus: `${newRow.status}:${newRow.user_id || ''}`,
      mentions
    };

    const groupId = getGroupId(config, 'followups');
    queueMessage(groupId, event);
  } else if (eventType === 'UPDATE' && !isCompleted && wasCompleted) {
    let user = await getUserName(newRow.user_id);
    const mentions: string[] = [];
    if (newRow.user_id) {
      const profile = await getUserProfile(newRow.user_id);
      if (profile && profile.phone) {
        const jid = formatPhoneToJid(profile.phone);
        if (jid) {
          const phoneDigits = jid.split('@')[0];
          mentions.push(jid);
          user = `@${phoneDigits} (${profile.fullName})`;
        }
      }
    }
    
    const event: QueueEvent = {
      id: newRow.id,
      category: 'followups',
      website: 'eBay click system',
      actionType: 'followup_reverted',
      title: 'eBay Click Check',
      user,
      url: `${config.webUrl}/followup/ebay-click`,
      oldStatus: oldRow ? `${oldRow.status}:${oldRow.user_id || ''}` : null,
      newStatus: `${newRow.status}:${newRow.user_id || ''}`,
      mentions
    };

    const groupId = getGroupId(config, 'followups');
    queueMessage(groupId, event);
  }
}

/**
 * Handle notification inserts (daily reminders and blockers/comments fallbacks)
 */
async function handleNotificationInsert(payload: any): Promise<void> {
  const config = loadConfig();
  const newRow = payload.new;
  const title = newRow.title || '';
  const message = newRow.message || '';
  const type = newRow.type || '';

  // 1. Check if this is a followup reminder generated by daily cron job
  const isFollowupType = ['blog_followup', 'plugin_update', 'speed_optimization_followup', 'ebay_click_followup'].includes(type);
  if (isFollowupType) {
    if (!config.events.followups.enabled) return;

    let triggerEvent: string | null = null;
    let typeName = 'Followup';
    let urlPath = '/followup';

    if (type === 'blog_followup') {
      typeName = 'Blog Followup';
      urlPath = '/followup/blog';
    } else if (type === 'plugin_update') {
      typeName = 'Plugin Update';
      urlPath = '/followup/plugins';
    } else if (type === 'speed_optimization_followup') {
      typeName = 'Speed Check';
      urlPath = '/followup/speed-optimization';
    } else if (type === 'ebay_click_followup') {
      typeName = 'eBay Click Check';
      urlPath = '/followup/ebay-click';
    }

    // Classify reminder status (due today vs overdue)
    if (title.toLowerCase().includes('due today')) {
      triggerEvent = 'followup_due_today';
    } else if (title.toLowerCase().includes('due this week') || 
               title.toLowerCase().includes('overdue') || 
               title.toLowerCase().includes('pending')) {
      triggerEvent = 'followup_overdue';
    }

    if (triggerEvent && (config.events.followups as any)[triggerEvent]) {
      let user = await getUserName(newRow.recipient_id);
      const mentions: string[] = [];
      if (newRow.recipient_id) {
        const profile = await getUserProfile(newRow.recipient_id);
        if (profile && profile.phone) {
          const jid = formatPhoneToJid(profile.phone);
          if (jid) {
            const phoneDigits = jid.split('@')[0];
            mentions.push(jid);
            user = `@${phoneDigits} (${profile.fullName})`;
          }
        }
      }
      
      // Try to determine website if linked
      let websiteName = 'KiuQ System';
      if (newRow.related_type === 'blog' || newRow.related_type === 'plugin' || newRow.related_type === 'speed') {
        const slotTable = newRow.related_type === 'blog' ? 'blog_upload_slots' : 
                         newRow.related_type === 'plugin' ? 'plugin_update_slots' : 
                         'speed_optimization_slots';
        const { data: slot } = await supabase
          .from(slotTable)
          .select('website_id')
          .eq('id', newRow.related_id)
          .maybeSingle();
        if (slot && slot.website_id) {
          websiteName = await getWebsiteName(slot.website_id);
        }
      }

      const followupUrl = `${config.webUrl}${urlPath}`;
      const event: QueueEvent = {
        category: 'followups',
        website: websiteName,
        actionType: triggerEvent,
        title: typeName,
        user,
        url: followupUrl,
        mentions
      };

      const groupId = getGroupId(config, 'followups');
      queueMessage(groupId, event);
      return; // Handled successfully as followup reminder
    }
  }

  // 2. Filter out task and quality notifications to prevent duplicates (since we listen directly to assignments/issues tables)
  const taskNotificationTypes = ['task_assigned', 'task_needs_fix', 'task_approved', 'task_completed', 'task_in_progress', 'task_submitted'];
  if (taskNotificationTypes.includes(type)) return;

  const qualityNotificationTypes = ['quality_issue_reported', 'quality_issue_fixed'];
  if (qualityNotificationTypes.includes(type)) return;

  // 3. Fallback for general notifications (e.g. blockers, comments, mentions)
  if (!config.events.notifications.enabled) return;

  const template = config.templates.general_notification;
  if (!template) return;

  let formattedMessage = template
    .replace(/{title}/g, title)
    .replace(/{message}/g, message);

  const mentions: string[] = [];
  let normalizedPhone = '';
  let mentionJid = '';
  let recipientProfile: UserProfileInfo | null = null;

  if (newRow.recipient_id) {
    recipientProfile = await getUserProfile(newRow.recipient_id);
    if (recipientProfile && recipientProfile.phone) {
      const jid = formatPhoneToJid(recipientProfile.phone);
      if (jid) {
        mentionJid = jid;
        normalizedPhone = jid.split('@')[0];
        mentions.push(mentionJid);
      }
    }
  }

  // Parse structured comment/mention notification to make it clean, easy-to-read, and professional
  const match = message.match(/^(.+?) (commented on|mentioned you on) "(.+?)": "(.+?)"$/s);
  if (match) {
    const author = match[1];
    const actionType = match[2];
    const taskName = match[3];
    const commentContent = match[4];
    
    const headerTitle = actionType.includes('mention') ? '💬 *Mention Alert*' : '💬 *New Task Comment*';
    const recipientName = recipientProfile ? recipientProfile.fullName : 'Teammate';
    const mentionStr = mentionJid ? `@${normalizedPhone} (${recipientName})` : recipientName;
    
    formattedMessage = `${headerTitle}
──────────────────────────
👤 *From:* ${author}
📋 *Task:* ${taskName}
🔔 *To:* ${mentionStr}

💬 *Message:*
"${commentContent}"
──────────────────────────
🔗 Open: ${config.webUrl}/work-board/my`;
  } else {
    // Fallback if formatting pattern doesn't match
    if (mentionJid) {
      formattedMessage = `@${normalizedPhone} ${formattedMessage}`;
    }
  }

  const groupId = getGroupId(config, 'notifications');
  queueMessage(groupId, formattedMessage, mentions);
}

// ============================================================================
// 🔌 Subscription Management
// ============================================================================

/**
 * Subscribes to realtime tables changes
 */
export function startSupabaseListeners(): void {
  console.log('[Supabase] Initializing realtime listeners...');

  // 1. Subscribe to Task assignments
  const taskChannel = supabase.channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'prompt_assignments' }, (payload) => {
      console.log('[Supabase] Received task change:', payload.eventType);
      handleTaskChange(payload).catch(err => console.error('[Supabase] Task handler error:', err));
    });
  channels.push(taskChannel);

  // 2. Subscribe to Quality Check Issues
  const qualityChannel = supabase.channel('quality-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'quality_issues' }, (payload) => {
      console.log('[Supabase] Received quality issue change:', payload.eventType);
      handleQualityIssueChange(payload).catch(err => console.error('[Supabase] Quality issue handler error:', err));
    });
  channels.push(qualityChannel);

  // 3. Subscribe to Blog upload slots
  const blogSlotChannel = supabase.channel('blog-slots-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'blog_upload_slots' }, (payload) => {
      console.log('[Supabase] Received blog slot update');
      handleFollowupSlotChange('blog', payload).catch(err => console.error('[Supabase] Blog slot handler error:', err));
    });
  channels.push(blogSlotChannel);

  // 4. Subscribe to Plugin slots
  const pluginSlotChannel = supabase.channel('plugin-slots-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'plugin_update_slots' }, (payload) => {
      console.log('[Supabase] Received plugin slot update');
      handleFollowupSlotChange('plugin', payload).catch(err => console.error('[Supabase] Plugin slot handler error:', err));
    });
  channels.push(pluginSlotChannel);

  // 5. Subscribe to Speed optimization slots
  const speedSlotChannel = supabase.channel('speed-slots-changes')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'speed_optimization_slots' }, (payload) => {
      console.log('[Supabase] Received speed slot update');
      handleFollowupSlotChange('speed', payload).catch(err => console.error('[Supabase] Speed slot handler error:', err));
    });
  channels.push(speedSlotChannel);

  // 6. Subscribe to eBay followups
  const ebayChannel = supabase.channel('ebay-followup-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ebay_click_followup' }, (payload) => {
      console.log('[Supabase] Received eBay followup change:', payload.eventType);
      handleEbayFollowupChange(payload).catch(err => console.error('[Supabase] eBay handler error:', err));
    });
  channels.push(ebayChannel);

  // 7. Subscribe to general Notifications table (for reminders/blockers/comments)
  const notificationChannel = supabase.channel('notification-changes')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
      console.log('[Supabase] Received new notification row');
      handleNotificationInsert(payload).catch(err => console.error('[Supabase] Notification handler error:', err));
    });
  channels.push(notificationChannel);

  // Subscribe all channels
  channels.forEach((channel) => {
    channel.subscribe((status) => {
      console.log(`[Supabase] Subscription status for channel "${channel.topic}": ${status}`);
    });
  });
}

/**
 * Unsubscribes and cleans up all active database listeners
 */
export async function stopSupabaseListeners(): Promise<void> {
  console.log('[Supabase] Stopping all realtime listeners...');
  await Promise.all(
    channels.map(async (channel) => {
      try {
        await supabase.removeChannel(channel);
      } catch (err) {
        console.error(`[Supabase] Error removing channel ${channel.topic}:`, err);
      }
    })
  );
  channels = [];
  console.log('[Supabase] Realtime listeners stopped.');
}
