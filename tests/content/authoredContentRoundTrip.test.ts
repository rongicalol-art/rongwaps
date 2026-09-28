import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { PROJECT_ROOT, readJson } from '../acceptance_helpers';
import type { InteractiveGrammarPart, ReadingRecord } from '../../src/types/models';

test('Authored Content Round-Trip: readings pack deeply equals content/readings/book-1.json', () => {
  const pack = readJson<{ schemaVersion: number; bookId: number; count: number; items: ReadingRecord[] }>('public/data/readings/book-1.json');

  const source = readJson<ReadingRecord[]>('content/readings/book-1.json');

  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.bookId, 1);
  assert.equal(pack.count, 48);
  assert.deepEqual(pack.items, source);
});

test('Authored Content Round-Trip: grammar pack deeply equals content/grammar/*.json parts', () => {
  const pack = readJson<{ schemaVersion: number; bookId: number; count: number; items: InteractiveGrammarPart[] }>('public/data/grammar/book-1.json');

  const grammarDir = resolve(PROJECT_ROOT, 'content/grammar');
  const fileNames = readdirSync(grammarDir);
  const sourceParts: InteractiveGrammarPart[] = [];
  for (const file of fileNames) {
    if (!file.endsWith('.json')) continue;
    const content = readJson<Record<string, unknown>>(`content/grammar/${file}`);
    for (const key of Object.keys(content)) {
      if (key.includes('_PART_')) {
        const part = content[key] as InteractiveGrammarPart;
        if (part.bookId === 1) {
          sourceParts.push(part);
        }
      }
    }
  }
  sourceParts.sort((a, b) => (a.lessonId - b.lessonId) || (a.partId - b.partId));

  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.bookId, 1);
  assert.equal(pack.count, 33);
  assert.deepEqual(pack.items, sourceParts);
});

test('Authored Content Round-Trip: dialogue alignment pack deeply equals content/dialogueAlignment.json', () => {
  const pack = readJson<{ schemaVersion: number; bookId: number; count: number; items: Record<string, unknown> }>('public/data/dialogue-alignment/book-1.json');

  const source = readJson<Record<string, unknown>>('content/dialogueAlignment.json');

  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.bookId, 1);
  assert.equal(pack.count, 48);
  assert.deepEqual(pack.items, source);
});
