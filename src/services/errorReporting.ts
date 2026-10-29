import type { ErrorInfo } from 'react';

const dsn = import.meta.env?.VITE_SENTRY_DSN;
let sentryClient: Promise<typeof import('@sentry/react') | null> | null = null;

export function initializeErrorReporting() {
  if (!import.meta.env?.PROD || !dsn) return;

  sentryClient = import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: 'production',
      tracesSampleRate: 0,
      beforeBreadcrumb: () => null,
      beforeSend(event) {
        // Keep reports useful without sending session, request, or account data.
        event.request = undefined;
        event.user = undefined;
        event.extra = undefined;
        event.breadcrumbs = undefined;
        return event;
      },
    });
    return Sentry;
  }).catch(() => null);
}

export function reportReactError(error: unknown, errorInfo: ErrorInfo) {
  if (!sentryClient) return;
  void sentryClient.then((Sentry) => Sentry?.reactErrorHandler()(error, errorInfo));
}

/** One anonymous note per session when real-device performance was poor (no user, request or URL data). */
export function reportPoorPerformance(summary: string, tags: Record<string, string>) {
  if (!sentryClient) return;
  void sentryClient.then((Sentry) => Sentry?.captureMessage(`Poor performance: ${summary}`, { level: 'info', tags }));
}

const reportedAudioFailures = new Set<string>();

/** One anonymous note per failure kind per session when a recording will not play (no user, request or URL data). */
export function reportAudioFailure(error: unknown, tags: Record<string, string>) {
  if (!sentryClient) return;
  const name = error instanceof Error ? error.name : 'Unknown';
  const key = `${tags.stage}:${name}`;
  if (reportedAudioFailures.has(key)) return;
  reportedAudioFailures.add(key);
  const message = error instanceof Error ? error.message.slice(0, 160) : '';
  void sentryClient.then((Sentry) => Sentry?.captureMessage(`Audio failed: ${key}`, { level: 'warning', tags: { ...tags, errorName: name }, contexts: { audio: { message } } }));
}
