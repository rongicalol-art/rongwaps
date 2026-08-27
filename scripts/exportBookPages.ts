import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { INTERACTIVE_GRAMMAR_PARTS } from '../src/data/interactiveGrammarPages';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const SOURCE_DIRECTORY = join(PROJECT_ROOT, 'output/pdf/modern_chinese_1_lessons');
const OUTPUT_DIRECTORY = join(PROJECT_ROOT, 'public/data/book-pages/modern-chinese-1');
const PRINTED_PAGE_OFFSET = 32;

const LESSON_PDFS: Record<number, string> = {
  1: '01_the_new_classmate.pdf',
  2: '02_what_time_do_you_go_to_school.pdf',
  3: '03_buying_birthday_gifts.pdf',
  4: '04_would_you_like_to_have_coffee_or_tea.pdf',
  5: '05_where_is_my_wallet.pdf',
  6: '06_lets_play_tennis_this_weekend.pdf',
  7: '07_how_do_we_get_to_the_hotel.pdf',
  8: '08_this_skirt_is_very_beautiful.pdf',
  9: '09_my_chinese_class.pdf',
  10: '10_many_people_got_colds_recently.pdf',
  11: '11_how_did_you_meet_each_other.pdf',
  12: '12_what_job_do_you_want_to_do.pdf',
  13: '13_get_on_the_internet_with_a_cell_phone.pdf',
  14: '14_new_years_eve_celebration.pdf',
};

function sourceStartPage(pdfPath: string) {
  const info = execFileSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
  const match = info.match(/Subject:\s+Original PDF pages (\d+)-(\d+)/);
  if (!match) throw new Error(`Could not read source page range from ${basename(pdfPath)}`);
  return Number(match[1]);
}

function pageFilename(page: number) {
  return `page-${String(page).padStart(3, '0')}.webp`;
}

const pagesByLesson = new Map<number, Set<number>>();
for (const part of INTERACTIVE_GRAMMAR_PARTS) {
  if (part.bookId !== 1) continue;
  const lessonPages = pagesByLesson.get(part.lessonId) ?? new Set<number>();
  for (const grammarPage of part.grammarPages) {
    grammarPage.printedPages.forEach((page) => lessonPages.add(page));
  }
  pagesByLesson.set(part.lessonId, lessonPages);
}

mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'rongwaps-book-pages-'));
const exportedPages: number[] = [];

try {
  for (const [lessonId, pages] of [...pagesByLesson.entries()].sort(([a], [b]) => a - b)) {
    if (pages.size === 0) continue; // lesson has grammar but no digitized printed pages yet
    const pdfName = LESSON_PDFS[lessonId];
    if (!pdfName) throw new Error(`No source PDF configured for Lesson ${lessonId}`);
    const pdfPath = join(SOURCE_DIRECTORY, pdfName);
    const firstSourcePage = sourceStartPage(pdfPath);

    for (const printedPage of [...pages].sort((a, b) => a - b)) {
      const pdfPage = printedPage - (firstSourcePage + PRINTED_PAGE_OFFSET) + 1;
      if (pdfPage < 1) {
        throw new Error(`Printed page ${printedPage} does not map into ${pdfName}`);
      }

      const temporaryPrefix = join(temporaryDirectory, `page-${printedPage}`);
      const temporaryPng = `${temporaryPrefix}.png`;
      const outputPath = join(OUTPUT_DIRECTORY, pageFilename(printedPage));

      execFileSync('pdftoppm', [
        '-png',
        '-f', String(pdfPage),
        '-l', String(pdfPage),
        '-singlefile',
        '-scale-to', '1800',
        pdfPath,
        temporaryPrefix,
      ]);
      execFileSync('cwebp', [
        '-quiet',
        '-preset', 'text',
        '-q', '86',
        '-m', '6',
        temporaryPng,
        '-o', outputPath,
      ]);
      exportedPages.push(printedPage);
    }
  }

  writeFileSync(
    join(OUTPUT_DIRECTORY, 'manifest.json'),
    `${JSON.stringify({
      bookId: 1,
      source: 'Modern Chinese 1 lesson PDFs',
      pages: exportedPages.sort((a, b) => a - b),
    }, null, 2)}\n`,
  );
  console.log(`Exported ${exportedPages.length} referenced book pages to ${OUTPUT_DIRECTORY}`);
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
