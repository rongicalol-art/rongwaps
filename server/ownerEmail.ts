import type { Env } from './env';

/**
 * One email to the owner through Resend (RESEND_API_KEY, FEEDBACK_EMAIL_FROM, FEEDBACK_EMAIL_TO as Worker
 * secrets). False when it isn't configured or fails: callers never turn a saved submission into a failure.
 * `key` makes retries send at most one email.
 */
export async function sendOwnerEmail(env: Env, subject: string, text: string, key: string): Promise<boolean> {
  const { RESEND_API_KEY: apiKey, FEEDBACK_EMAIL_FROM: from, FEEDBACK_EMAIL_TO: to } = env;
  if (!apiKey || !from || !to) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch { return false; }
}
