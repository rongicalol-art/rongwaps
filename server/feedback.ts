import type { Context, Env } from './env';
import { json, PRIVATE, readJson } from './respond';
import { rpc } from './supabase';
import { sendOwnerEmail } from './ownerEmail';

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
export function notifyFeedback(env: Env, input: FeedbackInput, userId: string): Promise<boolean> {
  return sendOwnerEmail(env, "Ron's Mandarin feedback",
    `${input.message}\n\nScreen: ${input.path}\nAccount: ${userId}\nFeedback: ${input.id}`, `feedback/${input.id}`);
}

export async function submitFeedback({ env }: Context, request: Request, user: { userId: string; token: string }): Promise<Response> {
  const failed = (status: number) => json({ error: 'Could not send feedback.' }, status, PRIVATE);
  const input = parseFeedback(await readJson(request));
  if (!input) return json({ error: 'Invalid feedback.' }, 400, PRIVATE);
  try {
    const { data: created, error } = await rpc<boolean>(env, user.token, 'submit_feedback', {
      p_id: input.id, p_message: input.message, p_path: input.path,
      p_browser: (request.headers.get('user-agent') ?? '').slice(0, 512),
      p_app_version: (env.COMMIT || 'development').slice(0, 64),
    });
    if (error) return failed(error.code === 'P0001' ? 429 : 503);
    if (typeof created !== 'boolean') return failed(503);
    // Also retry notifications on a duplicate save; the provider deduplicates by id.
    if (!await notifyFeedback(env, input, user.userId)) {
      // Log only the id; feedback text and account details stay out of server logs.
      console.warn('Feedback saved; email notification unavailable:', input.id);
    }
    return json({ ok: true }, 200, PRIVATE);
  } catch {
    return failed(503);
  }
}
