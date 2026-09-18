import type { SystemNotificationDto } from '@shared/types';

/**
 * System event notifications store for engines and platform modes.
 * Provides seeded events and appends newly triggered events when administrators
 * change platform modes or start/stop sandbox engines.
 */
const systemNotifications: SystemNotificationDto[] = [
  {
    id: 'seed-notif-1',
    type: 'engine_started',
    title: 'PostgreSQL 16 Engine Online',
    message: 'Sandbox container for PostgreSQL 16 is running and ready for transactions and EXPLAIN ANALYZE queries.',
    target: 'postgresql',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'seed-notif-2',
    type: 'mode_enabled',
    title: 'Classroom Mode Active',
    message: 'Administrator enabled interactive classroom assignments and automated tuple grading for all students.',
    target: 'classroom',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'seed-notif-3',
    type: 'mode_enabled',
    title: 'Query Golf Optimization Competitions Live',
    message: 'Peer leaderboards and buffer hit ratio challenges are now active in the Competitions tab.',
    target: 'competition',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'seed-notif-4',
    type: 'engine_started',
    title: 'MariaDB 11 Engine Online',
    message: 'MariaDB 11 sandbox container was started by administrator.',
    target: 'mariadb',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
];

export function getRecentNotifications(): SystemNotificationDto[] {
  return [...systemNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function recordNotification(
  type: SystemNotificationDto['type'],
  title: string,
  message: string,
  target?: string,
): SystemNotificationDto {
  const notif: SystemNotificationDto = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    message,
    target,
    timestamp: new Date().toISOString(),
  };
  systemNotifications.unshift(notif);
  if (systemNotifications.length > 50) {
    systemNotifications.length = 50;
  }
  return notif;
}
