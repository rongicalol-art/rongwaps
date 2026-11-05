import type { Request, Response } from 'express';
import { createUserSupabaseClient } from './supabase.js';
import { sendOwnerEmail } from './ownerEmail.js';

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
export function notifyUrgentReport(id: number, input: ReportInput, reporter: string): Promise<boolean> {
  return sendOwnerEmail("Ron's Mandarin: urgent report", [
    `Report ${id}: "Not safe", in ${input.place}.`,
    input.message ? `Reported line: ${input.message}` : 'No message (a profile or photo report).',
    `Reported learner: ${input.name ?? '(no name)'} · ${input.target}`,
    input.photo ? `Photo: ${input.photo}` : '',
    `Reporter: ${reporter}`,
    '',
    'The line is what the reporter\'s app sent. Before banning, check the server\'s copy (docs/RELEASING.md → Reports, blocks and limits).',
  ].filter(line => line !== '').join('\n'), `report/${id}`);
}

export async function submitReport(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.vary('Authorization');
  const input = parseReport(req.body);
  if (!input) { res.status(400).json({ error: 'Invalid report.' }); return; }
  try {
    const { data: id, error } = await createUserSupabaseClient(req.headers.authorization!.slice(7)).rpc('submit_report', {
      p_target: input.target, p_reason: input.reason, p_place: input.place, p_message: input.message ?? null,
      p_message_id: input.messageId ?? null, p_name: input.name ?? null, p_photo: input.photo ?? null,
    });
    if (error) {
      const limited = error.code === '54000';
      res.status(limited ? 429 : error.code === '22023' ? 400 : 503).json({ error: limited ? error.message : 'Could not send the report.' });
      return;
    }
    if (typeof id !== 'number') { res.status(503).json({ error: 'Could not send the report.' }); return; }
    if (input.reason === 'unsafe' && !await notifyUrgentReport(id, input, String(res.locals.userId))) {
      // Only the id: report text and account details stay out of server logs.
      console.warn('Report saved; urgent email unavailable:', id);
    }
    res.status(200).json({ ok: true });
  } catch {
    res.status(503).json({ error: 'Could not send the report.' });
  }
}
