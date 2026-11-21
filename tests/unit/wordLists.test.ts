import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { WORD_LIST_LEVELS, wordListFromPathname, wordListPath } from '../../src/app/routes';
import { WORD_COUNTS } from '../../src/screens/word-list/data/counts';
import { loadWordList } from '../../src/screens/word-list/wordListData';
import { wordListInfo, wordListMeta } from '../../src/screens/word-list/wordListMeta';
import { hasWordListReturn, readKnownWords, rememberWordListReturn, saveKnownWords, takeWordListReturn, wordKey } from '../../src/utils/browser/wordListReturn';

function fakeStorage(): Storage {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
    key: () => null,
    get length() { return values.size; },
  };
}

test('word list addresses resolve only for levels that have a list', () => {
  for (const entry of WORD_LIST_LEVELS) assert.deepEqual(wordListFromPathname(wordListPath(entry.slug)), entry);
  assert.equal(wordListFromPathname('/tocfl/vocabulary/a1/')?.slug, 'a1');
  for (const path of ['/tocfl', '/tocfl/vocabulary', '/tocfl/vocabulary/b1', '/tocfl/vocabulary/A1', '/tocfl/vocabulary/a1/extra', '/books/vocabulary/a1']) {
    assert.equal(wordListFromPathname(path), null, path);
  }
});

test('every word list is a whole level with short meanings of our own and search tags within length', async () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  for (const entry of WORD_LIST_LEVELS) {
    const words = await loadWordList(entry.level);
    const info = wordListInfo(entry);
    assert.equal(words.length, WORD_COUNTS[entry.level], `${entry.slug} count`);
    assert.ok(words.length >= 350, `${entry.slug} is a whole level, not a sample`);
    const keys = new Set(words.map(([hanzi, pinyin]) => wordKey(hanzi, pinyin)));
    assert.equal(keys.size, words.length, `${entry.slug} lists a word twice`);
    for (const [hanzi, pinyin, meaning, simplified] of words) {
      assert.match(hanzi, /^[\p{Script=Han}]+$/u, `${entry.slug} ${hanzi}`);
      assert.ok(pinyin && !pinyin.includes('|'), `${entry.slug} ${hanzi} pinyin`);
      assert.ok(meaning.length >= 1 && meaning.length <= 40, `${entry.slug} ${hanzi} meaning "${meaning}"`);
      // A CC-CEDICT or NAER gloss pasted in by mistake carries these marks.
      assert.ok(!/[/[\]]|\bsth\b|\bsb\b|CL:/.test(meaning.replace(/\(bus\/train\)|\(used\/things\)|\(hat\/etc\)/, '')), `${entry.slug} ${hanzi} meaning "${meaning}" looks like a raw dictionary gloss`);
      assert.ok(simplified === undefined || (simplified !== hanzi && simplified.length > 0), `${entry.slug} ${hanzi} simplified`);
    }
    const meta = wordListMeta(entry);
    assert.ok(meta.title.length <= 65, `${meta.path} title too long (${meta.title.length})`);
    assert.ok(meta.description.length <= 155, `${meta.path} description too long (${meta.description.length})`);
    assert.ok((meta.socialDescription ?? '').length <= 125, `${meta.path} socialDescription too long`);
    assert.ok(meta.title.includes(String(info.count)) && meta.title.includes(info.label));
    assert.ok(sitemap.includes(`<loc>https://ronsmandarin.com${meta.path}</loc>`), `sitemap.xml is missing ${meta.path}`);
    assert.ok(existsSync(`public${info.pdfPath}`), `${info.pdfPath} is missing: npm run word-lists:pdf`);
  }
});

test('a Study tap is remembered for the trip through sign-in, once, and not for long', (t) => {
  const session = fakeStorage();
  const local = fakeStorage();
  Object.assign(globalThis, { sessionStorage: session, localStorage: local });
  t.after(() => { Object.assign(globalThis, { sessionStorage: undefined, localStorage: undefined }); });

  assert.equal(hasWordListReturn(), false);
  rememberWordListReturn('a1', ['白天 báitiān']);
  assert.equal(hasWordListReturn(), true);
  assert.deepEqual(takeWordListReturn(), { slug: 'a1', known: ['白天 báitiān'] });
  assert.equal(takeWordListReturn(), null, 'taken once');

  rememberWordListReturn('a2', []);
  const stored = JSON.parse(session.getItem('pendingWordList')!) as { at: number };
  session.setItem('pendingWordList', JSON.stringify({ ...stored, at: stored.at - 31 * 60 * 1000 }));
  assert.equal(takeWordListReturn(), null, 'an abandoned tap expires');
  session.setItem('pendingWordList', '{"slug":5}');
  assert.equal(hasWordListReturn(), false, 'bad data is ignored');

  saveKnownWords('a1', ['幫 bāng', '棒 bàng']);
  assert.deepEqual(readKnownWords('a1'), ['幫 bāng', '棒 bàng']);
  assert.deepEqual(readKnownWords('a2'), []);
});

test('built word list pages ship every word, their own tags and the Study button', (t) => {
  if (!existsSync('dist/tocfl/vocabulary/a1.html')) {
    t.skip('dist not built yet');
    return;
  }
  const html = readFileSync('dist/tocfl/vocabulary/a1.html', 'utf8');
  assert.ok(html.includes('<link rel="canonical" href="https://ronsmandarin.com/tocfl/vocabulary/a1" />'));
  assert.ok(html.includes('"@type":"BreadcrumbList"') && html.includes('"@type":"LearningResource"'));
  assert.ok(html.includes('data-path="/tocfl/vocabulary/a1"'));
  assert.ok(html.includes('TOCFL A1 Word List') && html.includes('百貨公司') && html.includes('department store') && html.includes('Study all 402 free'));
  assert.ok(html.includes('href="/downloads/tocfl-a1-word-list.pdf"'));
  assert.ok(existsSync('dist/downloads/tocfl-a1-word-list.pdf'));
});
