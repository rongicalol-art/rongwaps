import type { Context, Env } from './env';
import { json, PRIVATE, readJson } from './respond';
import { rpc } from './supabase';
import { sendOwnerEmail } from './ownerEmail';

export const REPORT_REASONS = ['spam', 'rude', 'unsafe', 'other'] as const;
export const REPORT_PLACES = ['profile', 'chat', 'party'] as const;
type ReportInput = {
  target: string; reason: typeof REPORT_REASONS[number]; place: typeof REPORT_PLACES[number];
  message?: string; messageId?: number; name?: string; photo?: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const optionalText = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined);

/** A report as the reporter's app sends it; the database keeps the same bounds (20261106120000). */
export function parseReport(body: unknown): ReportInput | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  const reason = REPORT_REASONS.find(value => value === data.reason);
  const place = REPORT_PLACES.find(value => value === data.place);
  if (typeof data.target !== 'string' || !UUID.test(data.target) || !reason || !place) return null;
  const messageId = Number.isSafeInteger(data.messageId) && Number(data.messageId) > 0 ? Number(data.messageId) : undefined;
  // A photo is only ever a reference: never a signed link's query string (that is a password for the file).
  const photo = optionalText(data.photo, 2048)?.split('?')[0].slice(0, 500);
  return {
    target: data.target, reason, place,
    ...(optionalText(data.message, 300) ? { message: optionalText(data.message, 300) } : {}),
    ...(messageId ? { messageId } : {}),
    ...(optionalText(data.name, 30) ? { name: optionalText(data.name, 30) } : {}),
    ...(photo?.startsWith('https://') ? { photo } : {}),
  };
}

/** "Not safe" reports reach the owner at once (Privacy §4); the rest wait for the daily Health note. */
export function notifyUrgentReport(env: Env, id: number, input: ReportInput, reporter: string): Promise<boolean> {
  return sendOwnerEmail(env, "Ron's Mandarin: urgent report", [
    `Report ${id}: "Not safe", in ${input.place}.`,
    input.message ? `Reported line: ${input.message}` : 'No message (a profile or photo report).',
    `Reported learner: ${input.name ?? '(no name)'} · ${input.target}`,
    input.photo ? `Photo: ${input.photo}` : '',
    `Reporter: ${reporter}`,
    '',
    'The line is what the reporter\'s app sent. Before banning, check the server\'s copy (docs/RELEASING.md → Reports, blocks and limits).',
  ].filter(line => line !== '').join('\n'), `report/${id}`);
}

export async function submitReport({ env }: Context, request: Request, user: { userId: string; token: string }): Promise<Response> {
  const failed = (status: number, message = 'Could not send the report.') => json({ error: message }, status, PRIVATE);
  const input = parseReport(await readJson(request));
  if (!input) return json({ error: 'Invalid report.' }, 400, PRIVATE);
  try {
    const { data: id, error } = await rpc<number>(env, user.token, 'submit_report', {
      p_target: input.target, p_reason: input.reason, p_place: input.place, p_message: input.message ?? null,
      p_message_id: input.messageId ?? null, p_name: input.name ?? null, p_photo: input.photo ?? null,
    });
    if (error) {
      const limited = error.code === '54000';
      return failed(limited ? 429 : error.code === '22023' ? 400 : 503, limited && error.message ? error.message : undefined);
    }
    if (typeof id !== 'number') return failed(503);
    if (input.reason === 'unsafe' && !await notifyUrgentReport(env, id, input, user.userId)) {
      // Only the id: report text and account details stay out of server logs.
      console.warn('Report saved; urgent email unavailable:', id);
    }
    return json({ ok: true }, 200, PRIVATE);
  } catch {
    return failed(503);
  }
}
