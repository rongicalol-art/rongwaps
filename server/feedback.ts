import type { Request, Response } from 'express';
import { createUserSupabaseClient } from './supabase.js';

type FeedbackInput = { id: string; message: string; path: string };

export function parseFeedback(body: unknown): FeedbackInput | null {
  if (!body || typeof body !== 'object') return null;
  const { id, message, path } = body as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || typeof message !== 'string' || !message.trim() || message.trim().length > 2000
    || typeof path !== 'string' || path.length > 256 || !/^\/(?!\/)[^?#\s]*$/.test(path)) return null;
  return { id, message: message.trim(), path };
}

/** Notification failure never turns a saved submission into a user-facing failure. */
export async function notifyFeedback(input: FeedbackInput, userId: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_EMAIL_FROM;
  const to = process.env.FEEDBACK_EMAIL_TO;
  if (!key || !from || !to) return false;
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `feedback/${input.id}` },
      body: JSON.stringify({ from, to: [to], subject: "Ron's Mandarin feedback",
        text: `${input.message}\n\nScreen: ${input.path}\nAccount: ${userId}\nFeedback: ${input.id}` }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch { return false; }
}

export async function submitFeedback(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.vary('Authorization');
  const input = parseFeedback(req.body);
  if (!input) { res.status(400).json({ error: 'Invalid feedback.' }); return; }
  try {
    const { data: created, error } = await createUserSupabaseClient(req.headers.authorization!.slice(7)).rpc('submit_feedback', {
      p_id: input.id, p_message: input.message, p_path: input.path,
      p_browser: (req.headers['user-agent'] ?? '').slice(0, 512),
      p_app_version: (process.env.RENDER_GIT_COMMIT || process.env.npm_package_version || 'development').slice(0, 64),
    });
    if (error) {
      res.status(error.code === 'P0001' ? 429 : 503).json({ error: 'Could not send feedback.' });
      return;
    }
    if (typeof created !== 'boolean') { res.status(503).json({ error: 'Could not send feedback.' }); return; }
    // Also retry notifications on a duplicate save; the provider deduplicates by id.
    if (!await notifyFeedback(input, String(res.locals.userId))) {
      // Log only the id; feedback text and account details stay out of server logs.
      console.warn('Feedback saved; email notification unavailable:', input.id);
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ error: 'Could not send feedback.' });
  }
}
