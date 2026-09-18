import type { SystemNotificationDto } from '@shared/types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getJson } from '@/lib/api';

const STORAGE_READ_KEY = 'bubble_read_notifications';

export const useNotificationsStore = defineStore('notifications', () => {
  const notifications = ref<SystemNotificationDto[]>([]);
  const readIds = ref<Set<string>>(new Set());
  const loading = ref(false);

  // Load persisted read IDs
  try {
    const raw = localStorage.getItem(STORAGE_READ_KEY);
    if (raw) {
      readIds.value = new Set(JSON.parse(raw));
    }
  } catch {
    readIds.value = new Set();
  }

  function saveReadIds() {
    try {
      localStorage.setItem(STORAGE_READ_KEY, JSON.stringify([...readIds.value]));
    } catch {
      // ignore
    }
  }

  // Cross-tab broadcast channel
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('bubble_notifications');
    channel.onmessage = (event) => {
      if (event.data?.type === 'NEW_NOTIFICATION' && event.data.payload) {
        const exists = notifications.value.some((n) => n.id === event.data.payload.id);
        if (!exists) {
          notifications.value.unshift(event.data.payload);
        }
      } else if (event.data?.type === 'REFRESH') {
        fetchNotifications();
      }
    };
  }

  async function fetchNotifications() {
    loading.value = true;
    try {
      const res = await getJson<SystemNotificationDto[]>('/settings/notifications');
      if (res.success && Array.isArray(res.data)) {
        notifications.value = res.data;
      }
    } catch {
      // ignore
    } finally {
      loading.value = false;
    }
  }

  function markAsRead(id: string) {
    readIds.value.add(id);
    saveReadIds();
  }

  function markAllAsRead() {
    for (const n of notifications.value) {
      readIds.value.add(n.id);
    }
    saveReadIds();
  }

  function clearAll() {
    markAllAsRead();
    notifications.value = [];
  }

  function addLocalNotification(notif: SystemNotificationDto) {
    const exists = notifications.value.some((n) => n.id === notif.id);
    if (!exists) {
      notifications.value.unshift(notif);
    }
    channel?.postMessage({ type: 'NEW_NOTIFICATION', payload: notif });
  }

  function notifyEngineStatus(dialect: string, action: 'start' | 'stop') {
    const dialectName = dialect.charAt(0).toUpperCase() + dialect.slice(1);
    const notif: SystemNotificationDto = {
      id: `local-engine-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: action === 'start' ? 'engine_started' : 'engine_stopped',
      title: action === 'start' ? `Motor ${dialectName} en línea` : `Motor ${dialectName} detenido`,
      message:
        action === 'start'
          ? `El motor de sandbox ${dialectName} fue iniciado por el administrador y está listo para consultas.`
          : `El motor de sandbox ${dialectName} fue detenido por el administrador.`,
      target: dialect,
      timestamp: new Date().toISOString(),
    };
    addLocalNotification(notif);
  }

  function notifyModeChange(modeName: string, enabled: boolean) {
    const nameFormatted = modeName.charAt(0).toUpperCase() + modeName.slice(1);
    const notif: SystemNotificationDto = {
      id: `local-mode-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      type: enabled ? 'mode_enabled' : 'mode_disabled',
      title: enabled ? `Modo ${nameFormatted} activado` : `Modo ${nameFormatted} desactivado`,
      message: enabled
        ? `El administrador habilitó el modo ${nameFormatted} para toda la plataforma.`
        : `El modo ${nameFormatted} fue deshabilitado por el administrador.`,
      target: modeName,
      timestamp: new Date().toISOString(),
    };
    addLocalNotification(notif);
  }

  const unreadCount = computed(() => notifications.value.filter((n) => !readIds.value.has(n.id)).length);

  const items = computed(() =>
    notifications.value.map((n) => ({
      ...n,
      read: readIds.value.has(n.id),
    })),
  );

  return {
    notifications,
    items,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    addLocalNotification,
    notifyEngineStatus,
    notifyModeChange,
  };
});
