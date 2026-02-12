/**
 * Request context middleware — attaches requestId and clientIp to every request.
 *
 * Uses .as('global') so these derived properties are available in ALL
 * routes, error handlers, and after-handle hooks across the entire app.
 */
import { Elysia } from 'elysia';
import { extractClientIp } from './rate-limit';

export const requestContext = new Elysia({ name: 'request-context' })
  .derive(({ request, set }) => {
    const requestId = crypto.randomUUID();
    const clientIp = extractClientIp(request);

    /* Propagate requestId in response for client-side tracing */
    set.headers['x-request-id'] = requestId;

    return { requestId, clientIp };
  })
  .as('global');
