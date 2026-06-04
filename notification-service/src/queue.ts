import { loadConfig } from './config';
import { sendWhatsAppMessage } from './whatsapp';

export interface QueueEvent {
  id?: string;
  category: 'tasks' | 'quality_checks' | 'followups' | 'notifications';
  website: string;
  actionType: string; // e.g. 'task_assigned', 'task_in_progress', etc.
  title: string; // task title, issue description, etc.
  user: string; // full name of actor/assignee
  priority?: string;
  url: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  mentions?: string[]; // array of JIDs to mention
}

interface PendingBatch {
  events: QueueEvent[];
  messages: string[]; // fallback for raw text messages
  timeout: NodeJS.Timeout | null;
  mentions: Set<string>; // set of JIDs to mention
}

// Memory storage for pending batches grouped by JID (groupId)
const pendingBatches: Map<string, PendingBatch> = new Map();

/**
 * Queues a structured event or raw message to be sent to a WhatsApp group.
 * Debounces and groups messages going to the same group if batching is enabled in config.
 * @param groupId Destination WhatsApp JID (group ID)
 * @param item QueueEvent object or raw string message
 * @param mentions Optional array of JIDs to mention (for raw string messages)
 */
export function queueMessage(groupId: string, item: QueueEvent | string, mentions?: string[]): void {
  const config = loadConfig();
  
  if (!groupId || groupId.trim() === '' || groupId === 'default-group-id@g.us') {
    console.warn(`[Queue] Ignored message for unconfigured group: ${groupId}`);
    return;
  }

  // If batching is disabled, send the formatted message immediately
  if (!config.batching?.enabled) {
    const formatted = typeof item === 'string' ? item : formatSingleEvent(item);
    const itemMentions = typeof item === 'string' ? mentions : item.mentions;
    console.log(`[Queue] Batching disabled. Sending message immediately to: ${groupId}`);
    sendWhatsAppMessage(groupId, formatted, itemMentions).catch(err => {
      console.error(`[Queue] Direct send failed for group ${groupId}:`, err);
    });
    return;
  }

  const windowMs = config.batching.windowMs || 30000;

  let batch = pendingBatches.get(groupId);
  if (!batch) {
    batch = {
      events: [],
      messages: [],
      timeout: null,
      mentions: new Set<string>()
    };
    pendingBatches.set(groupId, batch);
  }

  if (typeof item === 'string') {
    batch.messages.push(item);
    if (mentions) {
      mentions.forEach(m => batch!.mentions.add(m));
    }
  } else {
    if (item.id) {
      const existingIdx = batch.events.findIndex(e => e.id === item.id);
      if (existingIdx !== -1) {
        const firstEvent = batch.events[existingIdx];
        
        // If the new status goes back to the initial status before the batch started
        if (item.newStatus === firstEvent.oldStatus) {
          console.log(`[Queue] Item ${item.id} returned to original state (${firstEvent.oldStatus}). Cancelling notification.`);
          // Remove the existing event
          batch.events.splice(existingIdx, 1);
        } else {
          // Update the existing event to the latest one, but preserve the original 'oldStatus'
          console.log(`[Queue] Updating item ${item.id} status from ${firstEvent.newStatus} to ${item.newStatus}.`);
          batch.events[existingIdx] = {
            ...item,
            oldStatus: firstEvent.oldStatus, // keep the original status from the start of the batch
            mentions: item.mentions // keep latest mentions
          };
        }
      } else {
        batch.events.push(item);
      }
    } else {
      batch.events.push(item);
    }

    if (item.mentions) {
      item.mentions.forEach(m => batch!.mentions.add(m));
    }
  }

  // If no timer is running for this group, start one
  if (batch.timeout === null) {
    batch.timeout = setTimeout(() => {
      sendBatch(groupId);
    }, windowMs);
    console.log(`[Queue] Started new batch timer for group: ${groupId} (window: ${windowMs}ms)`);
  }
}

/**
 * Formats a single QueueEvent when batching is disabled.
 */
function formatSingleEvent(ev: QueueEvent): string {
  return formatEventBatch([ev]);
}

/**
 * Group events and construct a clean, premium WhatsApp message.
 */
function formatEventBatch(events: QueueEvent[]): string {
  if (events.length === 1) {
    const ev = events[0];
    const cleanWebName = ev.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    let icon = '🔔';
    let catTitle = 'Update';
    let statusLabel = '';
    
    let priorityIndicator = '';
    if (ev.priority && ev.priority !== 'NORMAL') {
      priorityIndicator = ` [🚨 ${ev.priority}]`;
    }

    if (ev.category === 'tasks') {
      icon = '📋';
      catTitle = 'Task Update';
      switch (ev.actionType) {
        case 'task_assigned': statusLabel = 'New Assignment'; break;
        case 'task_in_progress': statusLabel = 'Task Started'; break;
        case 'task_submitted': statusLabel = 'Submitted for Review'; break;
        case 'task_needs_fix': statusLabel = 'Fix Requested'; break;
        case 'task_approved': statusLabel = 'Approved'; break;
        default: statusLabel = ev.actionType;
      }
    } else if (ev.category === 'quality_checks') {
      icon = '🔍';
      catTitle = 'Quality Issue Update';
      switch (ev.actionType) {
        case 'quality_reported': statusLabel = 'Issue Reported'; break;
        case 'quality_fixed': statusLabel = 'Fixed'; break;
        case 'quality_approved': statusLabel = 'Approved'; break;
        case 'quality_needs_review': statusLabel = 'Review Requested'; break;
        default: statusLabel = ev.actionType;
      }
    } else if (ev.category === 'followups') {
      icon = '📅';
      catTitle = 'Followup Reminder';
      switch (ev.actionType) {
        case 'followup_completed': statusLabel = 'Completed'; break;
        case 'followup_due_today': statusLabel = 'Due Today'; break;
        case 'followup_overdue': statusLabel = 'Overdue'; break;
        default: statusLabel = ev.actionType;
      }
    }

    return `${icon} *${catTitle}*
──────────────────────────
🌐 *Website:* ${cleanWebName}
👤 *Assignee:* ${ev.user}
🔔 *Status:* ${statusLabel}${priorityIndicator}

📋 *Details:*
"${ev.title}"
──────────────────────────
🔗 Open: ${ev.url}`;
  }

  // Group events by category (tasks, quality_checks, followups, notifications)
  const categories: Record<string, QueueEvent[]> = {};
  for (const ev of events) {
    if (!categories[ev.category]) {
      categories[ev.category] = [];
    }
    categories[ev.category].push(ev);
  }

  const sections: string[] = [];

  for (const [catName, catEvents] of Object.entries(categories)) {
    // Group events within each category by website name
    const websites: Record<string, QueueEvent[]> = {};
    for (const ev of catEvents) {
      if (!websites[ev.website]) {
        websites[ev.website] = [];
      }
      websites[ev.website].push(ev);
    }

    for (const [webName, webEvents] of Object.entries(websites)) {
      let icon = '🔔';
      let catTitle = 'Updates';
      const url = webEvents[0].url;

      if (catName === 'tasks') {
        icon = '📋';
        catTitle = 'Tasks';
      } else if (catName === 'quality_checks') {
        icon = '🔍';
        catTitle = 'Quality Issues';
      } else if (catName === 'followups') {
        icon = '📅';
        catTitle = 'Followups';
      }

      // Clean website URL to look neat (remove http/https and trailing slash)
      const cleanWebName = webName.replace(/^https?:\/\//, '').replace(/\/$/, '');

      let listItems = '';

      for (const ev of webEvents) {
        let actionStr = '';
        
        let priorityIndicator = '';
        if (ev.priority && ev.priority !== 'NORMAL') {
          if (ev.priority === 'HIGH' || ev.priority === 'URGENT') {
            priorityIndicator = ` *[🚨 ${ev.priority}]*`;
          } else {
            priorityIndicator = ` *[⚠️ ${ev.priority}]*`;
          }
        }

        // Map action type to a cleaner, compact bullet point
        switch (ev.actionType) {
          case 'task_assigned':
            actionStr = `New Assignment for ${ev.user}\n  📋 *Task:* ${ev.title}${priorityIndicator}`;
            break;
          case 'task_in_progress':
            actionStr = `🚀 Started by ${ev.user}\n  📋 *Task:* ${ev.title}${priorityIndicator}`;
            break;
          case 'task_submitted':
            actionStr = `👀 Submitted for Review by ${ev.user}\n  📋 *Task:* ${ev.title}${priorityIndicator}`;
            break;
          case 'task_needs_fix':
            actionStr = `⚠️ Fix Requested for ${ev.user}\n  📋 *Task:* ${ev.title}${priorityIndicator}`;
            break;
          case 'task_approved':
            actionStr = `✅ Approved for ${ev.user}\n  📋 *Task:* ${ev.title}${priorityIndicator}`;
            break;
          case 'quality_reported':
            actionStr = `📥 Quality Issue reported by ${ev.user}\n  📋 *Issue:* ${ev.title}${priorityIndicator}`;
            break;
          case 'quality_fixed':
            actionStr = `🛠️ Fixed by ${ev.user}\n  📋 *Issue:* ${ev.title}`;
            break;
          case 'quality_approved':
            actionStr = `✅ Approved by ${ev.user}\n  📋 *Issue:* ${ev.title}`;
            break;
          case 'quality_needs_review':
            actionStr = `👀 Review Requested by ${ev.user}\n  📋 *Issue:* ${ev.title}`;
            break;
          case 'followup_completed':
            actionStr = `✅ Followup Completed by ${ev.user}\n  📋 *Followup:* ${ev.title}`;
            break;
          case 'followup_due_today':
            actionStr = `📅 Followup Due Today for ${ev.user}\n  📋 *Followup:* ${ev.title}`;
            break;
          case 'followup_overdue':
            actionStr = `🚨 Followup Overdue for ${ev.user}\n  📋 *Followup:* ${ev.title}`;
            break;
          case 'followup_reverted':
            actionStr = '';
            break;
          default:
            actionStr = `*${ev.actionType}* by ${ev.user}\n  📋 *Details:* ${ev.title}`;
        }

        if (actionStr) {
          listItems += `• ${actionStr}\n`;
        }
      }

      if (listItems) {
        const section = `${icon} *${catTitle}*\n🌐 \`${cleanWebName}\`\n──────────────────────────\n${listItems}──────────────────────────\n🔗 ${url}`;
        sections.push(section);
      }
    }
  }

  return sections.join('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n');
}

/**
 * Sends and flushes the accumulated batch of messages for a group.
 * @param groupId The target WhatsApp JID
 */
function sendBatch(groupId: string): void {
  const batch = pendingBatches.get(groupId);
  if (!batch || (batch.events.length === 0 && batch.messages.length === 0)) {
    pendingBatches.delete(groupId);
    return;
  }

  // Clear timeout reference
  if (batch.timeout) {
    clearTimeout(batch.timeout);
  }

  const eventsToSend = [...batch.events];
  const messagesToSend = [...batch.messages];
  const mentionsToSend = Array.from(batch.mentions);
  
  // Clear the batch memory immediately to prevent race conditions
  pendingBatches.delete(groupId);

  console.log(`[Queue] Flushing batch of ${eventsToSend.length} event(s) and ${messagesToSend.length} text message(s) to: ${groupId}`);

  const formattedEvents = eventsToSend.length > 0 ? formatEventBatch(eventsToSend) : '';
  const formattedMessages = messagesToSend.length > 0 ? messagesToSend.join('\n\n*─────────────────────────*\n\n') : '';

  let finalMessage = '';
  if (formattedEvents && formattedMessages) {
    finalMessage = `${formattedEvents}\n\n*─────────────────────────*\n\n${formattedMessages}`;
  } else {
    finalMessage = formattedEvents || formattedMessages;
  }

  sendWhatsAppMessage(groupId, finalMessage, mentionsToSend).then((success) => {
    if (success) {
      console.log(`[Queue] Successfully sent batch of ${eventsToSend.length + messagesToSend.length} items.`);
    } else {
      console.error(`[Queue] Failed to send batch of ${eventsToSend.length + messagesToSend.length} items.`);
    }
  }).catch((err) => {
    console.error(`[Queue] Error sending batch to group ${groupId}:`, err);
  });
}

/**
 * Instantly flushes all pending queues (e.g. during shutdown).
 */
export function flushAllQueues(): void {
  console.log('[Queue] Flushing all pending batches before exit...');
  for (const groupId of pendingBatches.keys()) {
    sendBatch(groupId);
  }
}
