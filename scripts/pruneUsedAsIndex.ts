import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PROJECT_ROOT = resolve(import.meta.dirname, '..');
const USED_AS_PATH = resolve(PROJECT_ROOT, 'public/data/breakdowns/used-as.json');
const FREQ_MAP_PATH = resolve(PROJECT_ROOT, 'output/dictionary-frequency-map.json');
const VOCAB_DIR = resolve(PROJECT_ROOT, 'public/data/vocabulary');
const DICTIONARY_DIR = resolve(PROJECT_ROOT, 'public/data/dictionary');

const MANIFEST_PATH = resolve(PROJECT_ROOT, 'public/data/breakdowns/manifest.json');

const MAX_PARENTS_PER_COMPONENT = 15;

/** Standard CJK Unified Ideographs block. */
function isStandardHanzi(char: string): boolean {
  if (!char || Array.from(char).length !== 1) return false;
  const code = char.codePointAt(0);
  return code !== undefined && code >= 0x4e00 && code <= 0x9fff;
}

async function main(): Promise<void> {
  console.log('Loading used-as dataset...');
  const usedAsRaw = JSON.parse(await readFile(USED_AS_PATH, 'utf8')) as {
    schemaVersion: number;
    entries: Record<string, string[]>;
  };

  console.log('Loading frequency map...');
  const freqMap = JSON.parse(await readFile(FREQ_MAP_PATH, 'utf8')) as Record<string, number>;

  console.log('Loading course characters from vocabulary packs...');
  const courseChars = new Set<string>();
  for (let bookId = 1; bookId <= 6; bookId += 1) {
    try {
      const vocab = JSON.parse(
        await readFile(resolve(VOCAB_DIR, `book-${bookId}.json`), 'utf8'),
      ) as { items?: Array<{ traditional?: string; simplified?: string }> };
      for (const item of vocab.items || []) {
        for (const char of item.traditional || '') courseChars.add(char);
        for (const char of item.simplified || '') courseChars.add(char);
      }
    } catch {
      // Missing books (e.g. 5, 6) are expected.
    }
  }
  console.log(`Loaded ${courseChars.size} unique course characters.`);

  console.log('Scanning dictionary shards for meaningful definitions and pure variants...');
  const meaningfulChars = new Set<string>();
  const pureVariantChars = new Set<string>();

  for (let shard = 0; shard < 64; shard += 1) {
    try {
      const shardFile = resolve(DICTIONARY_DIR, `shard-${String(shard).padStart(2, '0')}.json`);
      const pack = JSON.parse(await readFile(shardFile, 'utf8')) as {
        items?: Array<{ traditional?: string; simplified?: string; definitions?: string[] }>;
      };
      for (const item of pack.items || []) {
        const defs = (item.definitions || []).join(' ').toLowerCase().trim();
        const isPureVariant = /^(?:old |archaic |popular )?variant of /i.test(defs);
        const chars = [item.traditional, item.simplified].filter(
          (c): c is string => typeof c === 'string' && Array.from(c).length === 1,
        );

        for (const c of chars) {
          if (isPureVariant) {
            pureVariantChars.add(c);
          } else if (defs.length > 0) {
            meaningfulChars.add(c);
          }
        }
      }
    } catch {
      // Ignore missing shard
    }
  }
  console.log(`Identified ${meaningfulChars.size} characters with meaningful definitions in dictionary.`);
  console.log(`Identified ${pureVariantChars.size} pure variant characters in dictionary.`);

  let totalBefore = 0;
  let totalAfter = 0;
  let prunedRare = 0;
  let prunedVariants = 0;
  let prunedNoDef = 0;
  let prunedZeroFreq = 0;
  let prunedExcess = 0;

  const newEntries: Record<string, string[]> = {};

  for (const [component, list] of Object.entries(usedAsRaw.entries)) {
    totalBefore += list.length;

    // Filter: course characters always kept. Non-course characters must:
    // 1. Be standard Hanzi (CJK Unified Ideographs)
    // 2. Not be pure variants
    // 3. Have an actual meaning/definition in the dictionary
    // 4. Have a frequency score > 0 (common/practical characters only)
    const cleanList = list.filter((char) => {
      if (courseChars.has(char)) return true;
      if (!isStandardHanzi(char)) {
        prunedRare += 1;
        return false;
      }
      if (pureVariantChars.has(char) && !meaningfulChars.has(char)) {
        prunedVariants += 1;
        return false;
      }
      if (!meaningfulChars.has(char)) {
        prunedNoDef += 1;
        return false;
      }
      const freq = freqMap[char] || 0;
      if (freq <= 0) {
        prunedZeroFreq += 1;
        return false;
      }
      return true;
    });

    // Sort: course characters first, then frequency score descending, then character code
    cleanList.sort((a, b) => {
      const aCourse = courseChars.has(a);
      const bCourse = courseChars.has(b);
      if (aCourse && !bCourse) return -1;
      if (!aCourse && bCourse) return 1;
      const aFreq = freqMap[a] || 0;
      const bFreq = freqMap[b] || 0;
      if (aFreq !== bFreq) return bFreq - aFreq;
      return a.localeCompare(b);
    });

    // Cap per component
    if (cleanList.length > MAX_PARENTS_PER_COMPONENT) {
      prunedExcess += cleanList.length - MAX_PARENTS_PER_COMPONENT;
    }
    const capped = cleanList.slice(0, MAX_PARENTS_PER_COMPONENT);

    if (capped.length > 0) {
      newEntries[component] = capped;
      totalAfter += capped.length;
    }
  }

  console.log('--- Pruning Summary ---');
  console.log(`Components: ${Object.keys(newEntries).length}`);
  console.log(`Total references before: ${totalBefore}`);
  console.log(`Pruned rare extension characters: ${prunedRare}`);
  console.log(`Pruned pure variant characters: ${prunedVariants}`);
  console.log(`Pruned characters with no definition: ${prunedNoDef}`);
  console.log(`Pruned zero-frequency characters: ${prunedZeroFreq}`);
  console.log(`Pruned low-priority excess (> ${MAX_PARENTS_PER_COMPONENT}): ${prunedExcess}`);
  console.log(`Total references after: ${totalAfter}`);

  await writeFile(
    USED_AS_PATH,
    JSON.stringify({ schemaVersion: 1, entries: newEntries }),
    'utf8',
  );
  console.log(`Successfully updated ${USED_AS_PATH}!`);

  // Update manifest version so client-side IndexedDB persistent cache is invalidated
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8')) as {
    version: string;
    [key: string]: unknown;
  };
  const newVersion = `v${Date.now().toString(16)}`;
  manifest.version = newVersion;
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Updated manifest version to ${newVersion} to invalidate client caches.`);
}

main().catch((err) => {
  console.error('Error pruning used-as index:', err);
  process.exit(1);
});
