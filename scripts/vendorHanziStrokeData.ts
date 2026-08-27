import { mkdirSync, existsSync, copyFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { FLASHCARDS_DATA } from '../src/data/flashcards';

const HANZI_RE = /[\u4E00-\u9FFF\u3400-\u4DBF\u{20000}-\u{2A6DF}]/u;
const VOCAB_DIR = join(process.cwd(), 'public', 'data', 'vocabulary');
const OUT_DIR = join(process.cwd(), 'public', 'hanzi-data');
const PACKAGE_DIR = join(process.cwd(), 'node_modules', 'hanzi-writer-data');

function collectVocabularyChars(): Set<string> {
  const chars = new Set<string>();
  const files = readdirSync(VOCAB_DIR).filter((f) => f.startsWith('book-') && f.endsWith('.json'));
  for (const file of files) {
    const pack = JSON.parse(readFileSync(join(VOCAB_DIR, file), 'utf8')) as {
      items?: Array<{ traditional?: string; simplified?: string }>;
    };
    for (const item of pack.items ?? []) {
      for (const field of [item.traditional, item.simplified]) {
        for (const char of field ?? '') {
          if (HANZI_RE.test(char)) chars.add(char);
        }
      }
    }
  }
  return chars;
}

function collectFlashcardChars(): Set<string> {
  const chars = new Set<string>();
  for (const card of FLASHCARDS_DATA) {
    for (const char of card.front) {
      if (HANZI_RE.test(char)) chars.add(char);
    }
  }
  return chars;
}

function main() {
  if (!existsSync(PACKAGE_DIR)) {
    console.error('hanzi-writer-data is not installed. Run: npm i -D hanzi-writer-data');
    process.exit(1);
  }

  const chars = new Set<string>([...collectVocabularyChars(), ...collectFlashcardChars()]);
  mkdirSync(OUT_DIR, { recursive: true });

  let vendored = 0;
  const missing: string[] = [];
  for (const char of chars) {
    const source = join(PACKAGE_DIR, `${char}.json`);
    if (existsSync(source)) {
      copyFileSync(source, join(OUT_DIR, `${char}.json`));
      vendored += 1;
    } else {
      missing.push(char);
    }
  }

  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), chars: chars.size, vendored, missingCount: missing.length }),
  );

  console.log(`Unique characters: ${chars.size}`);
  console.log(`Vendored: ${vendored} -> public/hanzi-data/`);
  console.log(`Missing from hanzi-writer-data: ${missing.length}${missing.length ? ` (e.g. ${missing.slice(0, 12).join(' ')})` : ''}`);
}

main();
