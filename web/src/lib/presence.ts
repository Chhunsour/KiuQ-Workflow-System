import type { Member } from '@/stores/data';

export type PresenceStatus = 'online' | 'away' | 'offline';

const minute = 60 * 1000;

const parseTime = (value: string | null | undefined): number => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const presenceStatusFor = (member: Pick<Member, 'currentStatus' | 'lastActiveAt' | 'lastLogoutAt'>): PresenceStatus => {
  const lastActive = parseTime(member.lastActiveAt);
  const lastLogout = parseTime(member.lastLogoutAt);

  if (!lastActive) return 'offline';
  if (member.currentStatus === 'offline' && lastLogout >= lastActive) return 'offline';

  const age = Date.now() - lastActive;
  if (age <= 2 * minute) return 'online';
  if (age <= 10 * minute) return 'away';
  return 'offline';
};

export const presenceLabel = (status: PresenceStatus) =>
  status === 'online' ? 'Online' : status === 'away' ? 'Away' : 'Offline';

export const relativeTime = (value: string | null | undefined): string => {
  const time = parseTime(value);
  if (!time) return 'Never';
  const diff = Date.now() - time;
  if (diff < minute) return 'Just now';
  if (diff < 60 * minute) {
    const count = Math.max(1, Math.floor(diff / minute));
    return `${count} minute${count === 1 ? '' : 's'} ago`;
  }
  if (diff < 24 * 60 * minute) {
    const count = Math.floor(diff / (60 * minute));
    return `${count} hour${count === 1 ? '' : 's'} ago`;
  }
  const date = new Date(time);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeText = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (isYesterday) return `Yesterday at ${timeText}`;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

export const presenceSummaryFor = (member: Pick<Member, 'currentStatus' | 'lastActiveAt' | 'lastLogoutAt'>) => {
  const status = presenceStatusFor(member);
  if (status === 'online') return 'Online now';
  return `${presenceLabel(status)} · Last active ${relativeTime(member.lastActiveAt).toLowerCase()}`;
};

export const isToday = (value: string | null | undefined): boolean => {
  const time = parseTime(value);
  if (!time) return false;
  return new Date(time).toDateString() === new Date().toDateString();
};
