/**
 * Shared plumbing for Jev content-review scripts: JSON IO, a small worker
 * pool, and resume helpers. Judgments stay in each reviewer; this file has no
 * model logic.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function runPool<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

export function readRawItems<T>(path: string, key = 'items'): T[] {
  if (!existsSync(path)) return [];
  const payload = readJson<Record<string, T[]>>(path);
  return payload[key] ?? [];
}
