import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Vendors the rounded Traditional Chinese face (jf open 粉圓 / Huninn, OFL 1.1)
 * as `public/fonts/huninn.woff2`.
 *
 * The subset is built from every CJK character the app actually ships (content
 * packs, lesson data, and UI copy), so the offline bundle stays around ~1.7 MB
 * instead of the 4.7 MB upstream TTF. Huninn is a Traditional face: traditional
 * course characters must all be covered (the script fails otherwise), while
 * simplified-only forms and rare component glyphs fall back to the system CJK
 * stack and are reported as a warning.
 */

const HUNINN_VERSION = '2.1';
const HUNINN_URL = `https://github.com/justfont/open-huninn-font/releases/download/v${HUNINN_VERSION}/jf-openhuninn-${HUNINN_VERSION}.ttf`;
const CACHE_DIR = join(process.cwd(), 'output', 'fonts');
const CACHE_TTF = join(CACHE_DIR, `jf-openhuninn-${HUNINN_VERSION}.ttf`);
const OUT_DIR = join(process.cwd(), 'public', 'fonts');
const OUT_FILE = join(OUT_DIR, 'huninn.woff2');
const UNICODES_FILE = join(CACHE_DIR, 'huninn-unicodes.txt');

const CONTENT_SOURCES = [
  join(process.cwd(), 'public', 'data'),
  join(process.cwd(), 'content'),
  join(process.cwd(), 'src', 'data'),
  join(process.cwd(), 'src'),
];

const CJK_RE = /[\p{Script=Han}\p{Script=Bopomofo}]/u;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const path = join(dir, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) walk(path, out);
    else if (['.json', '.ts', '.tsx'].includes(path.slice(path.lastIndexOf('.')))) out.push(path);
  }
  return out;
}

function collectCourseChars(): Set<string> {
  const chars = new Set<string>();
  for (const source of CONTENT_SOURCES) {
    if (!existsSync(source)) continue;
    for (const file of walk(source)) {
      const text = readFileSync(file, 'utf8');
      for (const char of text) {
        if (CJK_RE.test(char)) chars.add(char);
      }
    }
  }
  return chars;
}

/** Traditional course vocabulary — every one of these must render in Huninn. */
function collectMustCoverChars(): Set<string> {
  const chars = new Set<string>();
  const vocabDir = join(process.cwd(), 'public', 'data', 'vocabulary');
  if (!existsSync(vocabDir)) return chars;
  for (const file of readdirSync(vocabDir).filter((f) => f.endsWith('.json'))) {
    const pack = JSON.parse(readFileSync(join(vocabDir, file), 'utf8')) as {
      items?: Array<{ traditional?: string }>;
    };
    for (const item of pack.items ?? []) {
      for (const char of item.traditional ?? '') {
        if (CJK_RE.test(char)) chars.add(char);
      }
    }
  }
  return chars;
}

function downloadSource(): void {
  if (existsSync(CACHE_TTF)) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log(`Downloading jf open-huninn ${HUNINN_VERSION}…`);
  execFileSync('curl', ['-sL', '-o', CACHE_TTF, HUNINN_URL], { stdio: 'inherit' });
}

function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  downloadSource();

  const courseChars = collectCourseChars();
  const codepoints = [...courseChars].map((char) => char.codePointAt(0)!).sort((a, b) => a - b);
  writeFileSync(UNICODES_FILE, codepoints.map((cp) => cp.toString(16)).join('\n'));

  console.log(`Subsetting ${codepoints.length} course characters from ${CACHE_TTF}…`);
  execFileSync(
    'python3',
    [
      '-m',
      'fontTools.subset',
      CACHE_TTF,
      `--unicodes-file=${UNICODES_FILE}`,
      '--flavor=woff2',
      '--layout-features=*',
      `--output-file=${OUT_FILE}`,
    ],
    { stdio: 'inherit' },
  );

  const missing = execFileSync(
    'python3',
    [
      '-c',
      [
        'import sys',
        'from fontTools.ttLib import TTFont',
        `source = TTFont(${JSON.stringify(CACHE_TTF)})`,
        'cmap = source.getBestCmap()',
        `requested = [int(line, 16) for line in open(${JSON.stringify(UNICODES_FILE)}) if line.strip()]`,
        'missing = [cp for cp in requested if cp not in cmap]',
        'print(" ".join(chr(cp) for cp in missing))',
      ].join('\n'),
    ],
    { encoding: 'utf8' },
  ).trim();

  const size = statSync(OUT_FILE).size;
  console.log(`Wrote ${OUT_FILE} (${(size / 1024).toFixed(0)} KB)`);

  const missingChars = new Set([...missing]);
  const mustCover = collectMustCoverChars();
  const missingCourse = [...mustCover].filter((char) => missingChars.has(char));

  if (missingCourse.length > 0) {
    console.error(`\n${missingCourse.length} traditional course characters are not covered by Huninn:`);
    console.error(missingCourse.join(''));
    console.error('Pick a face that covers the traditional vocabulary before shipping.');
    process.exit(1);
  }

  const fallbacks = [...missingChars].filter((char) => !mustCover.has(char));
  console.log(`All ${mustCover.size} traditional course characters are covered.`);
  console.log(
    `${fallbacks.length} other characters (simplified-only forms, rare components) fall back to the system CJK stack.`,
  );
}

main();
