import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { LESSON_PAGE_BOOKS, LESSON_PAGE_LESSONS, lessonPageFromPathname, lessonPagePath } from '../../src/app/routes';
import { loadLessonPageBook, lessonPageData } from '../../src/screens/lesson-page/lessonPageData';
import { lessonPageMeta, lessonPageTitle } from '../../src/screens/lesson-page/lessonPageMeta';

test.before(() => Promise.all(LESSON_PAGE_BOOKS.map(loadLessonPageBook)));

const refs = LESSON_PAGE_BOOKS.flatMap((bookId) => Array.from({ length: LESSON_PAGE_LESSONS }, (_, index) => ({ bookId, lessonId: index + 1 })));
/** Book and lesson as one sortable number, read from a recording name (B2L05-...). */
const placeOf = (file: string) => Number(file[1]) * 100 + Number(file.slice(3, 5));

test('lesson page addresses resolve only for lessons that have a page', () => {
  for (const ref of refs) assert.deepEqual(lessonPageFromPathname(lessonPagePath(ref.bookId, ref.lessonId)), ref);
  assert.deepEqual(lessonPageFromPathname('/books/2/lesson-4/'), { bookId: 2, lessonId: 4 });
  for (const path of ['/books', '/books/1', '/books/1/lesson-0', '/books/1/lesson-17', '/books/1/lesson-04', '/books/4/lesson-1', '/books/0/lesson-1', '/books/1/lesson-4/extra']) {
    assert.equal(lessonPageFromPathname(path), null, path);
  }
});

test('every lesson page has a title, a sample that leaves most of the lesson out, and search tags within length', () => {
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  for (const ref of refs) {
    const page = lessonPageData(ref);
    const label = `book ${ref.bookId} lesson ${ref.lessonId}`;
    const { en, zh } = lessonPageTitle(ref);
    assert.ok(en && /[一-鿿]/.test(zh), `${label} title`);
    assert.equal(page.lines.length, 4, `${label} conversation`);
    assert.ok(page.lines.every((line) => line.some((token) => typeof token !== 'string')), `${label} lines have tappable words`);
    assert.ok(page.words.length >= 6 && page.words.length <= 8 && page.words.length < page.wordCount / 3, `${label} shows a sample, not the list`);
    assert.ok(page.grammar.length >= 3, `${label} grammar`);
    const place = ref.bookId * 100 + ref.lessonId;
    for (const word of [...page.words, ...page.lines.flat().filter((token) => typeof token !== 'string')]) {
      assert.match(word[3], /^B\dL\d{2}-\d-\d{2}-[a-f0-9]{12}\.mp3$/, `${label} ${word[0]} recording`);
      assert.ok(placeOf(word[3]) <= place, `${label} uses ${word[0]} before it is taught`);
    }
    for (const word of page.words) assert.equal(placeOf(word[3]), place, `${label} lists ${word[0]} from another lesson`);
    const meta = lessonPageMeta(ref);
    assert.ok(meta.title.length <= 65, `${meta.path} title too long (${meta.title.length})`);
    assert.ok(meta.description.length <= 155, `${meta.path} description too long (${meta.description.length})`);
    assert.ok((meta.socialDescription ?? '').length <= 125, `${meta.path} socialDescription too long`);
    assert.ok(sitemap.includes(`<loc>https://ronsmandarin.com${meta.path}</loc>`), `sitemap.xml is missing ${meta.path}`);
  }
});

test('built lesson pages ship their own tags, the conversation and the Study button', (t) => {
  // Only right after a build (`npm run test:built`): a leftover dist/ from an older build proves nothing.
  if (process.env.BUILT_PAGES !== '1') {
    t.skip('checked after the build: npm run test:built');
    return;
  }
  const html = readFileSync('dist/books/1/lesson-4.html', 'utf8');
  assert.ok(html.includes('<link rel="canonical" href="https://ronsmandarin.com/books/1/lesson-4" />'));
  assert.ok(html.includes('"@type":"BreadcrumbList"') && html.includes('"@type":"LearningResource"'));
  assert.ok(!html.includes('"@type":"WebApplication"'));
  assert.ok(html.includes('Coffee or Tea?') && html.includes('咖啡') && html.includes('Study'));
  assert.ok(html.includes('data-path="/books/1/lesson-4"'));
  const later = readFileSync('dist/books/3/lesson-5.html', 'utf8');
  assert.ok(later.includes('<link rel="canonical" href="https://ronsmandarin.com/books/3/lesson-5" />'));
  assert.ok(later.includes('Earthquakes and Typhoons') && later.includes('颱風') && later.includes('TOCFL B1'));
});
