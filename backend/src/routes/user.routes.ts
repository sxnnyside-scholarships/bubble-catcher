import { Elysia, t } from 'elysia';
import { authMiddleware, ensureProfileMiddleware } from '../middleware';
import { userService } from '../services';
import { success } from '../lib/response';

export const userRoutes = new Elysia({ prefix: '/user' })
  .use(authMiddleware)
  .use(ensureProfileMiddleware)

  /* Get user profile */
  .get('/profile', async ({ auth }) => {
    const profile = await userService.getProfile(auth.userId);
    return success(profile);
  })

  /* Update user preferences */
  .patch('/preferences', async ({ auth, body }) => {
    const profile = await userService.updatePreferences(auth.userId, body, auth.accessToken);
    return success(profile);
  }, {
    body: t.Object({
      preferredTheme: t.Optional(t.Union([
        t.Literal('colorful'),
        t.Literal('light'),
        t.Literal('dark'),
      ])),
      preferredLocale: t.Optional(t.Union([
        t.Literal('en'),
        t.Literal('es'),
      ])),
    }),
  });
