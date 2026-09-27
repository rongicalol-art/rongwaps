import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import type { InteractiveGrammarPart, ReadingRecord } from '../src/types/models';

const ROOT = process.cwd();

test('Authored Content Round-Trip: readings pack deeply equals content/readings/book-1.json', () => {
  const packRaw = readFileSync(resolve(ROOT, 'public/data/readings/book-1.json'), 'utf8');
  const pack = JSON.parse(packRaw) as { schemaVersion: number; bookId: number; count: number; items: ReadingRecord[] };

  const sourceRaw = readFileSync(resolve(ROOT, 'content/readings/book-1.json'), 'utf8');
  const source = JSON.parse(sourceRaw) as ReadingRecord[];

  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.bookId, 1);
  assert.equal(pack.count, 48);
  assert.deepEqual(pack.items, source);
});

test('Authored Content Round-Trip: grammar pack deeply equals content/grammar/*.json parts', () => {
  const packRaw = readFileSync(resolve(ROOT, 'public/data/grammar/book-1.json'), 'utf8');
  const pack = JSON.parse(packRaw) as { schemaVersion: number; bookId: number; count: number; items: InteractiveGrammarPart[] };

  const grammarDir = resolve(ROOT, 'content/grammar');
  const fileNames = readdirSync(grammarDir);
  const sourceParts: InteractiveGrammarPart[] = [];
  for (const file of fileNames) {
    if (!file.endsWith('.json')) continue;
    const content = JSON.parse(readFileSync(resolve(grammarDir, file), 'utf8')) as Record<string, unknown>;
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
  const packRaw = readFileSync(resolve(ROOT, 'public/data/dialogue-alignment/book-1.json'), 'utf8');
  const pack = JSON.parse(packRaw) as { schemaVersion: number; bookId: number; count: number; items: Record<string, unknown> };

  const sourceRaw = readFileSync(resolve(ROOT, 'content/dialogueAlignment.json'), 'utf8');
  const source = JSON.parse(sourceRaw) as Record<string, unknown>;

  assert.equal(pack.schemaVersion, 1);
  assert.equal(pack.bookId, 1);
  assert.equal(pack.count, 48);
  assert.deepEqual(pack.items, source);
});
