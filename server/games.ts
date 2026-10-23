import type { Request, Response } from 'express';

/** Public origin of the games Worker (realtime lobby + quiz race rooms), or null when unset. */
export function gameConfiguration(_req: Request, res: Response) {
  res.setHeader('Cache-Control', 'no-store');
  const value = process.env.GAMES_SERVER_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8787' : undefined);
  try {
    const url = value ? new URL(value) : null;
    const allowed = url?.protocol === 'https:' || (process.env.NODE_ENV === 'development' && url?.protocol === 'http:');
    res.json({ url: allowed ? url!.origin : null });
  } catch { res.json({ url: null }); }
}
