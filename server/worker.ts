import * as Sentry from '@sentry/cloudflare';
import { handle } from './app';
import type { Env } from './env';

/**
 * Cloudflare entry point (server/wrangler.jsonc). Cloudflare serves the public files of the built site on
 * its own; this code runs for lesson content, the API and addresses that are not files.
 */
export default Sentry.withSentry(
  // One Sentry project serves the browser and the server; staging never reports.
  (env: Env) => ({
    dsn: env.APP_ENV === 'production' ? env.SENTRY_DSN : undefined,
    environment: 'production',
    release: env.COMMIT,
    initialScope: { tags: { runtime: 'server' } },
    tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend(event) {
      event.request = undefined;
      event.user = undefined;
      event.extra = undefined;
      event.breadcrumbs = undefined;
      return event;
    },
  }),
  {
    fetch(request: Request, env: Env): Promise<Response> {
      return handle(request, {
        env,
        report(error, operation) {
          try { Sentry.captureException(error, { tags: { operation } }); } catch { /* reporting never breaks a request */ }
        },
      });
    },
  },
);
