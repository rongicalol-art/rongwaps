import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { BETA_LAST_LESSON } from '../shared/courseAccess';
import type { GameWord } from '../shared/wordBomb';

/** Called only after the existing authenticated school-beta middleware. */
export async function gameSession(req: Request, res: Response) {
  res.setHeader('Cache-Control', 'private, no-store');
  const lesson = Number(req.query.lesson ?? 0);
  if (!Number.isInteger(lesson) || lesson < 0 || lesson > BETA_LAST_LESSON) {
    res.status(400).json({ error: 'Choose an available Book 1 lesson.' }); return;
  }
  try {
    const pack = JSON.parse(await readFile(path.resolve('public/data/vocabulary/book-1.json'), 'utf8')) as {
      items: Array<{ id: string; traditional: string; pinyin: string; simple?: string; meaning: string }>;
    };
    const prefix = `B1L${String(lesson).padStart(2, '0')}-`;
    const words: GameWord[] = pack.items.filter(word => word.id.startsWith(prefix)).map(word => ({
      id: word.id, hanzi: word.traditional, pinyin: word.pinyin, meaning: word.simple || word.meaning,
    }));
    res.json({ userId: String(res.locals.userId), lesson, words });
  } catch {
    res.status(503).json({ error: 'Game vocabulary is unavailable. Try again shortly.' });
  }
}

export function gameConfiguration(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const value = process.env.GAMES_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : undefined);
  try {
    const url = value ? new URL(value) : null;
    const allowed = url?.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url?.protocol === 'http:');
    res.json({ url: allowed ? url!.origin : null });
  } catch { res.json({ url: null }); }
}
