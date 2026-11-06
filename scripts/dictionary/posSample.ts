import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildWordEntry } from '../../src/utils/vocabulary/wordEntry';
import { formatPosLabel } from '../../src/utils/vocabulary/posLabels';
import { readCourseCards, readDictionaryRows, readLevelWords, readTaiwanReadings } from './learnerData';

/**
 * `npx tsx scripts/dictionary/posSample.ts` — dev-only. Writes output/dictionary-pos/sample.json:
 * the owner's spot check, as the word page will group it: 50 common characters (TBCL level 1) and
 * 60 random learner words, each reading with its groups (label, senses, lesson).
 */
const OUT = resolve(process.cwd(), 'output/dictionary-pos/sample.json');
const SOURCE = resolve(process.cwd(), 'content/dictionary/posTags.json');

const pick = <T>(items: readonly T[], count: number, seed: number) => {
  let state = seed;
  const random = () => { state = Math.imul(state ^ (state >>> 15), 2246822507) >>> 0; state = Math.imul(state ^ (state >>> 13), 3266489909) >>> 0; return (state ^= state >>> 16) / 2 ** 32; };
  return [...items].map((item) => ({ item, key: random() })).sort((a, b) => a.key - b.key).slice(0, count).map(({ item }) => item);
};

async function main() {
  const tags = (JSON.parse(await readFile(SOURCE, 'utf8')) as { entries: Record<string, string> }).entries;
  const { byWord } = await readDictionaryRows();
  const cards = await readCourseCards();
  const levels = await readLevelWords();
  const taiwan = await readTaiwanReadings();
  const tagged = [...new Set(Object.keys(tags).map((key) => key.slice(0, key.indexOf('|'))))];
  const common = tagged.filter((word) => Array.from(word).length === 1 && levels.get(word) === 1);
  const words = [...pick(common, 50, 7), ...pick(tagged.filter((word) => !common.includes(word)), 60, 11)];
  const sample = words.map((word) => {
    const entry = buildWordEntry(word, byWord.get(word) ?? [], cards.get(word) ?? [], taiwan.get(word) ?? [], { posTags: (key) => tags[key] });
    return {
      word,
      readings: (entry?.readings ?? []).filter((reading) => !reading.reference).map((reading) => ({
        pinyin: reading.pinyin,
        groups: reading.groups.map((group) => ({
          label: formatPosLabel(group.pos) ?? 'Other meanings',
          senses: group.senses.map((sense) => ({ text: sense.text, ...(sense.course ? { lesson: `Bk${sense.course.bookId} · L${sense.course.lessonId}` } : {}) })),
        })),
      })),
    };
  });
  await writeFile(OUT, JSON.stringify(sample, null, 1), 'utf8');
  console.log(`Spot-check sample: ${sample.length} words (${common.length} common characters available).`);
}

main().catch((error) => {
  console.error('Spot-check sample failed:', error);
  process.exit(1);
});
