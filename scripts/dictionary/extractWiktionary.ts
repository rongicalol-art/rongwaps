import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { readCourseCards, readDictionaryRows, readLevelWords } from './learnerData';

/**
 * `npx tsx scripts/dictionary/extractWiktionary.ts` — dev-only evidence for word-type tags.
 *
 * Input (gitignored, downloaded once with the owner's OK): output/wiktionary/kaikki.org-dictionary-Chinese.jsonl.gz,
 * English Wiktionary's Chinese entries via kaikki.org (Wiktextract, Ylonen 2022), CC BY-SA 4.0.
 * Output: output/wiktionary/learner.json — for every learner word (book + TBCL/HSK levels) its
 * standard-Mandarin entries: word type, readings and non-dialect glosses. Never shipped.
 */
const INPUT = resolve(process.cwd(), 'output/wiktionary/kaikki.org-dictionary-Chinese.jsonl.gz');
const OUTPUT = resolve(process.cwd(), 'output/wiktionary/learner.json');

/** Pinyin tags of standard Mandarin (Taiwan or Mainland); any place or dialect tag rules a reading out. */
const STANDARD_SOUND_TAGS = new Set(['Mandarin', 'Pinyin', 'Standard', 'Standard-Chinese', 'Taiwan', 'Mainland-China', 'variant', 'standard', 'Hanyu-Pinyin', 'erhua-ed']);
/** Senses tagged only for another Chinese variety. */
const OTHER_VARIETIES = new Set(['Cantonese', 'Hokkien', 'Min', 'Min-Nan', 'Min-Dong', 'Min-Bei', 'Teochew', 'Hakka', 'Wu', 'Northern-Wu', 'Gan', 'Xiang', 'Jin', 'Puxian-Min', 'Shanghainese', 'Taishanese', 'Leizhou-Min', 'Hainanese', 'Southern-Pinghua', 'Eastern-Min', 'Northern-Min']);

interface KaikkiSense { glosses?: string[]; tags?: string[] }
interface KaikkiEntry { word?: string; pos?: string; senses?: KaikkiSense[]; sounds?: Array<{ zh_pron?: string; tags?: string[] }> }
export interface WiktionaryEvidence { pos: string; readings: string[]; senses: Array<{ gloss: string; tags?: string[] }> }

async function main() {
  const { byWord } = await readDictionaryRows();
  const learner = new Set([...(await readCourseCards()).keys(), ...(await readLevelWords()).keys()].filter((word) => byWord.has(word)));
  const out: Record<string, WiktionaryEvidence[]> = {};
  let lines = 0;
  let kept = 0;
  const input = createInterface({ input: createReadStream(INPUT).pipe(createGunzip()), crlfDelay: Infinity });
  for await (const line of input) {
    lines += 1;
    // Cheap prefilter before parsing: the headword appears near the line start.
    const wordMatch = /"word":\s*"([^"]+)"/.exec(line);
    if (!wordMatch || !learner.has(wordMatch[1])) continue;
    const entry = JSON.parse(line) as KaikkiEntry;
    if (!entry.word || !entry.pos || entry.pos === 'soft-redirect' || entry.pos === 'romanization') continue;
    const readings = [...new Set((entry.sounds ?? [])
      .filter((sound) => sound.zh_pron && sound.tags?.includes('Mandarin') && sound.tags.includes('Pinyin') && sound.tags.every((tag) => STANDARD_SOUND_TAGS.has(tag)))
      .map((sound) => sound.zh_pron!.trim()))];
    const senses = (entry.senses ?? [])
      .filter((sense) => sense.glosses?.length && !(sense.tags?.some((tag) => OTHER_VARIETIES.has(tag)) && !sense.tags.includes('Mandarin')))
      .map((sense) => ({ gloss: sense.glosses![sense.glosses!.length - 1], ...(sense.tags?.length ? { tags: sense.tags } : {}) }));
    if (readings.length === 0 || senses.length === 0) continue;
    (out[entry.word] ??= []).push({ pos: entry.pos, readings, senses });
    kept += 1;
  }
  await mkdir(resolve(OUTPUT, '..'), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(out)}\n`, 'utf8');
  console.log(`Wiktionary: ${lines} lines read, ${kept} Mandarin entries for ${Object.keys(out).length} of ${learner.size} learner words.`);
}

main().catch((error) => {
  console.error('Wiktionary extraction failed:', error);
  process.exit(1);
});
