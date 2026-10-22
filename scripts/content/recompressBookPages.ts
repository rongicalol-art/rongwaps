/**
 * Re-encodes exported book pages to the phone-friendly size (1100px wide, q72).
 * Idempotent: pages already at or under the target width are skipped, so the
 * source PDFs (gitignored `output/`) are not needed. Needs `cwebp`/`dwebp`.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BOOK_PAGE_QUALITY, BOOK_PAGE_WIDTH } from './bookPageSettings';

const ROOT = resolve(import.meta.dirname, '..', '..', 'public/data/book-pages');
const temporary = mkdtempSync(join(tmpdir(), 'rongwaps-book-recompress-'));
let before = 0;
let after = 0;
let changed = 0;
try {
  for (const book of readdirSync(ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    for (const file of readdirSync(join(ROOT, book.name)).filter((name) => name.endsWith('.webp'))) {
      const target = join(ROOT, book.name, file);
      const width = Number(/(\d+)x\d+/.exec(execFileSync('webpinfo', [target], { encoding: 'utf8' }))?.[1]);
      before += statSync(target).size;
      if (width <= BOOK_PAGE_WIDTH) { after += statSync(target).size; continue; }
      const png = join(temporary, 'page.png');
      const out = join(temporary, 'page.webp');
      execFileSync('dwebp', ['-quiet', target, '-o', png]);
      execFileSync('cwebp', ['-quiet', '-preset', 'text', '-q', String(BOOK_PAGE_QUALITY), '-m', '6', '-sharp_yuv', '-resize', String(BOOK_PAGE_WIDTH), '0', png, '-o', out]);
      renameSync(out, target);
      after += statSync(target).size;
      changed++;
    }
  }
  console.log(`Recompressed ${changed} pages: ${(before / 1048576).toFixed(1)} MB -> ${(after / 1048576).toFixed(1)} MB`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
