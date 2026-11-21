import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { grammarPagePath, grammarPageSlugFromPathname } from '../../src/app/routes';
import { GRAMMAR_PAGES } from '../../src/screens/grammar-page/data';
import { grammarPageLink, loadGrammarPageBook } from '../../src/screens/grammar-page/grammarPageData';
import { grammarPageMeta } from '../../src/screens/grammar-page/grammarPageMeta';
import type { GrammarSentence } from '../../src/screens/grammar-page/grammarPageTypes';

const words = (sentence: GrammarSentence) => sentence.tokens.filter((token) => typeof token !== 'string');
const text = (sentence: GrammarSentence) => sentence.tokens.map((token) => (typeof token === 'string' ? token : token[0])).join('');

test('grammar page addresses have one shape, and only listed pages have a link', () => {
  assert.equal(grammarPageSlugFromPathname('/grammar/ne-and-you'), 'ne-and-you');
  assert.equal(grammarPageSlugFromPathname('/grammar/ne-and-you/'), 'ne-and-you');
  for (const path of ['/grammar', '/grammar/', '/grammar/Ne', '/grammar/ne_and', '/grammar/ne/extra', '/books/ne-and-you']) {
    assert.equal(grammarPageSlugFromPathname(path), null, path);
  }
  assert.ok(grammarPageLink('ne-and-you'));
  assert.equal(grammarPageLink('not-a-real-page'), undefined);
  assert.equal(new Set(GRAMMAR_PAGES.map((link) => link[0])).size, GRAMMAR_PAGES.length, 'two pages share an address');
});

test('every grammar page has a rule, two examples, a different sentence to build, and search tags within length', async () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  assert.ok(GRAMMAR_PAGES.length >= 5);
  for (const link of GRAMMAR_PAGES) {
    const [slug, bookId, lessonId, title] = link;
    const page = (await loadGrammarPageBook(bookId))[slug];
    assert.ok(page, `${slug} has no page`);
    assert.deepEqual([page.slug, page.bookId, page.lessonId, page.title], [slug, bookId, lessonId, title]);
    assert.ok(page.rule.length >= 40 && page.pattern.length >= 2, `${slug} rule and pattern`);
    assert.equal(page.examples.length, 2, `${slug} examples`);
    for (const sentence of [...page.examples, page.exercise]) {
      assert.ok(/[。？！]$/.test(text(sentence)), `${slug}: "${text(sentence)}" needs its end mark`);
      assert.match(sentence.pinyin, /^\p{Lu}.*[.?!]$/u, `${slug} pinyin "${sentence.pinyin}"`);
      assert.ok(sentence.english.length >= 5, `${slug} English`);
      for (const word of words(sentence)) assert.ok(word[0] && word[1] && word[2], `${slug} ${String(word[0])} needs pinyin and a meaning`);
    }
    const tiles = words(page.exercise).length;
    assert.ok(tiles >= 3 && tiles <= 6, `${slug} exercise has ${tiles} words`);
    assert.ok(page.examples.every((example) => text(example) !== text(page.exercise)), `${slug} exercise repeats an example`);
    // A page about one word (呢) shows that word in what the visitor reads.
    if (page.focus) assert.ok(page.examples.some((example) => words(example).some((word) => word[3] === 1)), `${slug} examples never use the pattern's own word`);
    const meta = grammarPageMeta(link);
    assert.equal(meta.path, grammarPagePath(slug));
    assert.ok(meta.title.length <= 65, `${meta.path} title too long (${meta.title.length})`);
    assert.ok(meta.description.length <= 160, `${meta.path} description too long (${meta.description.length})`);
    assert.ok((meta.socialDescription ?? '').length <= 125, `${meta.path} socialDescription too long (${(meta.socialDescription ?? '').length})`);
    assert.ok(sitemap.includes(`<loc>https://ronsmandarin.com${meta.path}</loc>`), `sitemap.xml is missing ${meta.path}`);
  }
});

test('built grammar pages ship the rule, the examples, the exercise and their own tags', (t) => {
  if (!existsSync('dist/grammar/ne-and-you.html')) {
    t.skip('dist not built yet');
    return;
  }
  const html = readFileSync('dist/grammar/ne-and-you.html', 'utf8');
  assert.ok(html.includes('<link rel="canonical" href="https://ronsmandarin.com/grammar/ne-and-you" />'));
  assert.ok(html.includes('"@type":"BreadcrumbList"') && html.includes('"@type":"LearningResource"'));
  assert.ok(html.includes('data-path="/grammar/ne-and-you"'));
  assert.ok(html.includes('When a question is already in the air') && html.includes('Wǒ hē chá, nǐ ne?') && html.includes('Your turn') && html.includes('Try it'));
  assert.ok(readFileSync('dist/grammar.html', 'utf8').includes('href="/grammar/ne-and-you"'), 'the grammar guide links to the pages');
});
