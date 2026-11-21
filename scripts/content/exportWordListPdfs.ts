/**
 * Prints each public TOCFL word list as an A4 PDF (public/downloads/tocfl-<level>-word-list.pdf):
 * every word with a tick box, pinyin and meaning, in the app's own fonts.
 * Reads the lists `npm run word-lists:export` wrote, so run that first.
 * Run: npm run word-lists:pdf
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { chromium } from 'playwright';
import { WORD_LIST_LEVELS, wordListPath } from '../../src/app/routes';
import { wordListInfo } from '../../src/screens/word-list/wordListMeta';
import type { ListWord } from '../../src/screens/word-list/wordListTypes';

const ROOT = process.cwd();
const SITE = 'ronsmandarin.com';
const fonts = pathToFileURL(path.join(ROOT, 'public/fonts')).href;
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** The app's Chinese font slices, read from disk instead of the site. */
const chineseFonts = readFileSync('src/styles/fonts.generated.css', 'utf8').replace(/url\((['"]?)\/fonts\//g, `url($1${fonts}/`);

// Print colours: the app's light-theme ink and accent, fixed here because paper has no theme.
const STYLE = `
${chineseFonts}
@font-face { font-family: "Nunito"; src: url("${fonts}/nunito.woff2") format("woff2"); font-weight: 200 1000; }
@font-face { font-family: "RW-Pinyin"; src: url("${fonts}/pinyin-400.woff2") format("woff2"); font-weight: 400 600; }
@font-face { font-family: "RW-Pinyin"; src: url("${fonts}/pinyin-700.woff2") format("woff2"); font-weight: 700 900; }
@page { size: A4; margin: 14mm 13mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "Nunito", "RW-Pinyin", sans-serif; color: #34312d; font-size: 9.5pt; }
header { display: flex; align-items: flex-end; justify-content: space-between; gap: 8mm; border-bottom: 1.2pt solid #3a7ca5; padding-bottom: 3mm; }
h1 { margin: 0; font-size: 21pt; font-weight: 900; letter-spacing: -0.01em; }
.place { margin: 0 0 1mm; font-size: 9pt; font-weight: 800; color: #6e6e6e; }
.brand { text-align: right; font-size: 11pt; font-weight: 900; }
.brand span { color: #b8862a; }
.brand small { display: block; font-size: 8pt; font-weight: 700; color: #6e6e6e; }
.how { margin: 3mm 0 4mm; font-weight: 700; color: #4a4743; }
ol { margin: 0; padding: 0; list-style: none; columns: 2; column-gap: 9mm; }
li { display: grid; grid-template-columns: 3.4mm 21mm 27mm 1fr; align-items: baseline; gap: 2.5mm; padding: 1.25mm 0; border-bottom: 0.4pt solid #dedbd6; break-inside: avoid; }
.box { width: 3.2mm; height: 3.2mm; border: 0.8pt solid #8f8b86; border-radius: 0.7mm; align-self: center; }
.zh { font-family: "TW-EduKai", "Huninn", serif; font-size: 13pt; line-height: 1.1; }
.py { font-weight: 800; }
.en { color: #4a4743; font-weight: 600; }
footer { margin-top: 5mm; font-size: 8pt; font-weight: 600; color: #6e6e6e; }
`;

function pageHtml(entry: (typeof WORD_LIST_LEVELS)[number], words: readonly ListWord[]): string {
  const info = wordListInfo(entry);
  const rows = words.map(([hanzi, pinyin, meaning]) =>
    `<li><span class="box"></span><span class="zh" lang="zh-Hant">${escape(hanzi)}</span><span class="py">${escape(pinyin)}</span><span class="en">${escape(meaning)}</span></li>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TOCFL ${info.label} Word List · Ron's Mandarin</title><style>${STYLE}</style></head><body>
<header>
  <div><p class="place">${info.place} · ${info.count} words</p><h1>TOCFL ${info.label} Word List</h1></div>
  <p class="brand">Ron's <span>Mandarin</span><small>${SITE}${wordListPath(entry.slug)}</small></p>
</header>
<p class="how">Tick the words you know. Study the rest free at ${SITE}.</p>
<ol>${rows}</ol>
<footer>Words, levels and pinyin follow TBCL Level ${entry.level} (National Academy for Educational Research, Taiwan), the official list behind TOCFL ${info.label} (${info.examName}). English meanings by Ron's Mandarin.</footer>
</body></html>`;
}

async function main() {
  mkdirSync('public/downloads', { recursive: true });
  // A page opened from disk may load the font files from disk; one set from a string may not.
  mkdirSync('output/word-lists', { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const entry of WORD_LIST_LEVELS) {
      const { WORDS } = await import(`../../src/screens/word-list/data/level-${entry.level}.ts`) as { WORDS: readonly ListWord[] };
      const file = `public${wordListInfo(entry).pdfPath}`;
      const source = path.join(ROOT, `output/word-lists/${entry.slug}.html`);
      writeFileSync(source, pageHtml(entry, WORDS));
      await page.goto(pathToFileURL(source).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.pdf({
        path: file,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="width:100%;font-size:7pt;color:#6e6e6e;text-align:center;font-family:sans-serif">${SITE} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
      });
      console.log(`${file}: ${WORDS.length} words`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
