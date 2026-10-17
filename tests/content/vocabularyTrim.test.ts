import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { validateTrim } from '../../scripts/audio/publishTrimmedVocabulary';

test('trimmed vocabulary references have exact-source receipts and preserved speech', async () => {
  const audit = JSON.parse(await readFile('content/audio/vocabulary_trim.json', 'utf8'));
  assert.equal(audit.schemaVersion, 1);
  assert.equal(audit.method, 'MP3 frame copy; no synthesis or re-encoding');
  assert.equal(audit.thresholdDb, -55);
  assert.equal(audit.targetPaddingMs, 100);
  assert.equal(audit.selectionCount, audit.results.length);
  const entries = new Map<string, Record<string, unknown>>(audit.results.map((entry: { id: string }) => [entry.id, entry]));
  assert.equal(entries.size, audit.results.length);
  const visited = new Set<string>();
  for (const book of [1, 2, 3, 4]) {
    const pack = JSON.parse(await readFile(`public/data/vocabulary/book-${book}.json`, 'utf8'));
    for (const row of pack.items) {
      const entry = entries.get(row.id);
      if (!entry) {
        assert.ok(!row.audio?.startsWith('vocabulary-trimmed/'), 'Unreceipted trim');
        continue;
      }
      visited.add(row.id);
      assert.equal(entry.word, row.traditional || row.simplified);
      assert.equal(entry.pinyin, row.pinyin);
      assert.equal(entry.source, `modernchinese-${row.id}.mp3`);
      if (entry.status === 'trimmed') {
        validateTrim(entry as unknown as Parameters<typeof validateTrim>[0]);
        assert.equal(row.audio, entry.audio);
      } else {
        assert.ok(['unchanged', 'review'].includes(String(entry.status)));
        assert.equal(row.audio || `modernchinese-${row.id}.mp3`, entry.source);
      }
    }
  }
  assert.equal(visited.size, entries.size);
});
