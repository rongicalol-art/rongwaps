import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Vendors self-hosted Chinese fonts into `public/fonts/`:
 * 1. `huninn.woff2` (jf open 粉圓 / Huninn, OFL 1.1) - Traditional Chinese rounded face.
 * 2. `rounded-sc.woff2` (Resource Han Rounded / 思源圆体, OFL 1.1) - Simplified Chinese rounded face.
 * 3. `lxgw-wenkai.woff2` (LXGW WenKai Medium, OFL 1.1) - KaiTi calligraphy face covering TC & SC.
 */

const CACHE_DIR = join(process.cwd(), 'output', 'fonts');
const OUT_DIR = join(process.cwd(), 'public', 'fonts');
const UNICODES_FILE = join(CACHE_DIR, 'huninn-unicodes.txt');

const RHR_TW_7Z = join(CACHE_DIR, 'RHR-TW-0.990.7z');
const RHR_TW_URL = 'https://github.com/CyanoHao/Resource-Han-Rounded/releases/download/v0.990/RHR-TW-0.990.7z';
const RHR_TW_TTF = join(CACHE_DIR, 'ResourceHanRoundedTW-Regular.ttf');
const HUNINN_OUT = join(OUT_DIR, 'huninn.woff2');

const RHR_7Z = join(CACHE_DIR, 'RHR-CN-0.990.7z');
const RHR_URL = 'https://github.com/CyanoHao/Resource-Han-Rounded/releases/download/v0.990/RHR-CN-0.990.7z';
const RHR_TTF = join(CACHE_DIR, 'ResourceHanRoundedCN-Regular.ttf');
const RHR_OUT = join(OUT_DIR, 'rounded-sc.woff2');

const WENKAI_VERSION = 'v1.522';
const WENKAI_URL = `https://github.com/lxgw/LxgwWenKai/releases/download/${WENKAI_VERSION}/LXGWWenKai-Medium.ttf`;
const WENKAI_TTF = join(CACHE_DIR, 'LXGWWenKai-Medium.ttf');
const WENKAI_OUT = join(OUT_DIR, 'lxgw-wenkai.woff2');

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

function ensureSources(): void {
  mkdirSync(CACHE_DIR, { recursive: true });

  if (!existsSync(RHR_TW_TTF)) {
    if (!existsSync(RHR_TW_7Z)) {
      console.log('Downloading Resource Han Rounded TW…');
      execFileSync('curl', ['-sL', '-o', RHR_TW_7Z, RHR_TW_URL], { stdio: 'inherit' });
    }
    console.log('Extracting ResourceHanRoundedTW-Regular.ttf…');
    execFileSync(
      'python3',
      [
        '-c',
        `import py7zr; z = py7zr.SevenZipFile(${JSON.stringify(RHR_TW_7Z)}, mode='r'); z.extract(path=${JSON.stringify(CACHE_DIR)}, targets=['ResourceHanRoundedTW-Regular.ttf'])`,
      ],
      { stdio: 'inherit' },
    );
  }

  if (!existsSync(WENKAI_TTF)) {
    console.log(`Downloading LXGW WenKai Medium ${WENKAI_VERSION}…`);
    execFileSync('curl', ['-sL', '-o', WENKAI_TTF, WENKAI_URL], { stdio: 'inherit' });
  }

  if (!existsSync(RHR_TTF)) {
    if (!existsSync(RHR_7Z)) {
      console.log('Downloading Resource Han Rounded CN…');
      execFileSync('curl', ['-sL', '-o', RHR_7Z, RHR_URL], { stdio: 'inherit' });
    }
    console.log('Extracting ResourceHanRoundedCN-Regular.ttf…');
    execFileSync(
      'python3',
      [
        '-c',
        `import py7zr; z = py7zr.SevenZipFile(${JSON.stringify(RHR_7Z)}, mode='r'); z.extract(path=${JSON.stringify(CACHE_DIR)}, targets=['ResourceHanRoundedCN-Regular.ttf'])`,
      ],
      { stdio: 'inherit' },
    );
  }
}

function subsetFont(inputTtf: string, outputFile: string): void {
  console.log(`Subsetting ${inputTtf} -> ${outputFile}…`);
  execFileSync(
    'python3',
    [
      '-m',
      'fontTools.subset',
      inputTtf,
      `--unicodes-file=${UNICODES_FILE}`,
      '--flavor=woff2',
      '--layout-features=*',
      `--output-file=${outputFile}`,
    ],
    { stdio: 'inherit' },
  );
  const size = statSync(outputFile).size;
  console.log(`Wrote ${outputFile} (${(size / 1024).toFixed(0)} KB)`);
}

function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  ensureSources();

  const courseChars = collectCourseChars();
  const codepoints = [...courseChars].map((char) => char.codePointAt(0)!).sort((a, b) => a - b);
  writeFileSync(UNICODES_FILE, codepoints.map((cp) => cp.toString(16)).join('\n'));
  console.log(`Prepared ${codepoints.length} unicode codepoints.`);

  subsetFont(RHR_TW_TTF, HUNINN_OUT);
  subsetFont(RHR_TTF, RHR_OUT);
  subsetFont(WENKAI_TTF, WENKAI_OUT);
  console.log('All fonts vendored successfully.');
}

main();
