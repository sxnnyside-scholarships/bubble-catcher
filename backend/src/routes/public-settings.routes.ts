import { Elysia } from 'elysia';
import { success } from '../lib/response';
import { getRecentNotifications } from '../services/notification.service';
import { getPublicSettings } from '../services/settings.service';

export const publicSettingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/public', async () => {
    const settings = await getPublicSettings();
    return success(settings);
  })
  .get('/notifications', () => {
    const notifications = getRecentNotifications();
    return success(notifications);
  });
