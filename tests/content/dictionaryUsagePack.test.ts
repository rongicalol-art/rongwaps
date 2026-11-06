import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { readJson, readSource } from '../acceptance_helpers';
import { PACK_CONFIGS } from '../../src/services/contentPackConfigs';
import type { GenericContentManifest } from '../../src/services/contentPacks';
import type { DictionaryUsagePack, SplitRow, WordUsage } from '../../src/utils/packValidators';
import { alignSentenceSyllables } from '../../src/utils/pinyin/pinyinTones';

function shippedUsage(): Map<string, WordUsage> {
  const manifest = readJson<GenericContentManifest>('public/data/dictionary-usage/manifest.json');
  const config = PACK_CONFIGS['dictionary-usage'];
  assert.equal(config.validateManifest(manifest), true);
  const shipped = new Map<string, WordUsage>();
  for (const part of config.getParts(manifest)) {
    const text = readSource(`public${part.path}`);
    assert.equal(createHash('sha256').update(text).digest('hex'), part.sha256, `${part.path} hash`);
    const pack = JSON.parse(text) as DictionaryUsagePack;
    assert.equal(config.validatePack(pack, part, manifest), true, `${part.path} shape`);
    for (const [word, usage] of Object.entries(pack.items)) shipped.set(word, usage);
  }
  return shipped;
}

test('dictionary usage pack: goes-with and splits mirror their reviewed sources', () => {
  const usage = shippedUsage();
  const goesWith = readJson<{ entries: Record<string, Array<[string, string]>> }>('content/dictionary/goesWith.json').entries;
  const splits = readJson<{ entries: Record<string, SplitRow[]> }>('content/dictionary/splitExamples.json').entries;
  const rebuild = 'run npm run dictionary:usage:build';
  assert.deepEqual(Object.fromEntries([...usage].filter(([, item]) => item.w).map(([word, item]) => [word, item.w])), goesWith, rebuild);
  assert.deepEqual(Object.fromEntries([...usage].filter(([, item]) => item.s).map(([word, item]) => [word, item.s])), splits, rebuild);

  for (const [word, pairs] of Object.entries(goesWith)) {
    for (const [partner, phrase] of pairs) assert.ok(phrase.includes(word) && phrase.includes(partner) && phrase !== word, `${word}: ${phrase} must hold both words`);
  }
  for (const [word, rows] of Object.entries(splits)) {
    const [first, second] = Array.from(word);
    for (const [chinese, pinyin, english] of rows) {
      assert.ok(english.trim(), `${word}: split example without English`);
      assert.ok(alignSentenceSyllables(chinese, pinyin), `${word}: pinyin does not line up for ${chinese}`);
      assert.match(chinese, new RegExp(`${first}[\\u3400-\\u9fff]{1,6}${second}`), `${word}: ${chinese} must show the verb split`);
    }
  }
});

test('dictionary usage pack: every grammar link opens a real grammar point', () => {
  const pages = new Map<string, { partId: string; title: string; bookId: number; lessonId: number }>();
  for (const book of [1, 2, 3]) {
    const pack = readJson<{ items: Array<{ id: string; grammarPages: Array<{ id: string; titleTraditional: string; bookId: number; lessonId: number }> }> }>(`public/data/grammar/book-${book}.json`);
    for (const part of pack.items) for (const page of part.grammarPages) pages.set(page.id, { partId: part.id, title: page.titleTraditional, bookId: page.bookId, lessonId: page.lessonId });
  }
  let links = 0;
  for (const [word, item] of shippedUsage()) {
    for (const [partId, pageId, bookId, lessonId, title] of item.g ?? []) {
      const page = pages.get(pageId);
      assert.ok(page, `${word}: grammar page ${pageId} does not exist`);
      assert.deepEqual([page.partId, page.bookId, page.lessonId, page.title], [partId, bookId, lessonId, title], `${word}: ${pageId} is stale`);
      links += 1;
    }
  }
  assert.ok(links > 300, `expected the grammar points to link their words, got ${links} links`);
});
