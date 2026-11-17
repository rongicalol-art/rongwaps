import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { LESSON_PAGE_LESSONS, lessonPageFromPathname, lessonPagePath } from '../../src/app/routes';
import { LESSON_PAGES } from '../../src/screens/lesson-page/lessonPageData';
import { lessonPageMeta, lessonPageTitle } from '../../src/screens/lesson-page/lessonPageMeta';

const lessons = Array.from({ length: LESSON_PAGE_LESSONS }, (_, index) => index + 1);

test('lesson page addresses resolve only for lessons that have a page', () => {
  for (const lessonId of lessons) assert.equal(lessonPageFromPathname(lessonPagePath(lessonId)), lessonId);
  assert.equal(lessonPageFromPathname('/books/1/lesson-4/'), 4);
  for (const path of ['/books', '/books/1', '/books/1/lesson-0', '/books/1/lesson-17', '/books/1/lesson-04', '/books/2/lesson-1', '/books/1/lesson-4/extra']) {
    assert.equal(lessonPageFromPathname(path), null, path);
  }
});

test('every lesson page has a title, a sample that leaves most of the lesson out, and search tags within length', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  for (const lessonId of lessons) {
    const page = LESSON_PAGES[lessonId];
    const { en, zh } = lessonPageTitle(lessonId);
    assert.ok(en && zh, `lesson ${lessonId} title`);
    assert.equal(page.lines.length, 4, `lesson ${lessonId} conversation`);
    assert.ok(page.lines.every((line) => line.some((token) => typeof token !== 'string')), `lesson ${lessonId} lines have tappable words`);
    assert.ok(page.words.length >= 6 && page.words.length <= 8 && page.words.length < page.wordCount / 3, `lesson ${lessonId} shows a sample, not the list`);
    assert.ok(page.grammar.length >= 3, `lesson ${lessonId} grammar`);
    for (const word of [...page.words, ...page.lines.flat().filter((token) => typeof token !== 'string')]) {
      assert.match(word[3], /^B1L\d{2}-\d-\d{2}-[a-f0-9]{12}\.mp3$/, `lesson ${lessonId} ${word[0]} recording`);
      assert.ok(Number(word[3].slice(3, 5)) <= lessonId, `lesson ${lessonId} uses ${word[0]} before it is taught`);
    }
    const meta = lessonPageMeta(lessonId);
    assert.ok(meta.title.length <= 65, `${meta.path} title too long (${meta.title.length})`);
    assert.ok(meta.description.length <= 155, `${meta.path} description too long (${meta.description.length})`);
    assert.ok((meta.socialDescription ?? '').length <= 125, `${meta.path} socialDescription too long`);
    assert.ok(sitemap.includes(`<loc>https://ronsmandarin.com${meta.path}</loc>`), `sitemap.xml is missing ${meta.path}`);
  }
});

test('built lesson pages ship their own tags, the conversation and the Study button', (t) => {
  if (!existsSync('dist/books/1/lesson-4.html')) {
    t.skip('dist not built yet');
    return;
  }
  const html = readFileSync('dist/books/1/lesson-4.html', 'utf8');
  assert.ok(html.includes('<link rel="canonical" href="https://ronsmandarin.com/books/1/lesson-4" />'));
  assert.ok(html.includes('"@type":"BreadcrumbList"') && html.includes('"@type":"LearningResource"'));
  assert.ok(!html.includes('"@type":"WebApplication"'));
  assert.ok(html.includes('Coffee or Tea?') && html.includes('咖啡') && html.includes('Study'));
  assert.ok(html.includes('data-path="/books/1/lesson-4"'));
});
