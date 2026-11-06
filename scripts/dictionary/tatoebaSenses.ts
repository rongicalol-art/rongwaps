import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { alignSentenceSyllables } from '../../src/utils/pinyin/pinyinTones';
import { stripTones } from '../../src/data/pinyinTables';
import { readingKey } from '../../src/utils/vocabulary/wordEntry';
import { askCodex, eachLimited, replyArray } from './codexRun';
import { readDictionaryRows, readTaiwanReadings } from './learnerData';
import type { TatoebaBatchEntry } from './tatoebaCandidates';

/**
 * `npx tsx scripts/dictionary/tatoebaSenses.ts [--concurrency N]` — dev-only, resumable.
 * Codex picks the meaning each Tatoeba sentence shows (0 = drop it), says whether it reads
 * naturally in Taiwan, and writes book-style pinyin. A sentence is kept only when every syllable
 * is a real reading of its character (一/不 tone changes and neutral tones allowed): no invented readings.
 * Writes output/dictionary-examples/tatoeba-senses/<batch>.json.
 */
const OUT = resolve(process.cwd(), 'output/dictionary-examples');

const PROMPT = `You choose example sentences for a learner dictionary used by Taiwanese university students learning Mandarin (traditional characters, Taiwan usage).
Each entry is one word: its readings, its numbered meanings (each labelled with reading and word type), "needed" (the reading and word types that still have no example: the reason we are looking), and some human-written sentences (already converted to traditional characters) that contain it, with English.
Keep at most two good sentences per needed word type and drop the rest (n = 0), so you only write pinyin for sentences worth showing.
For every sentence:
- "n": the number of the meaning the word has in that sentence, or 0 to drop the sentence: when the word's use is unclear, the sentence is unnatural or mainland-only in Taiwan, the characters or English are wrong, or it is not suitable for students.
- "pinyin": for kept sentences, the whole sentence in tone-marked pinyin the way Taiwanese textbooks write it: Taiwan readings, words written together (lǎoshī), 一 and 不 with their tone changes (yí ge, bú shì), neutral tones unmarked, the same punctuation as the Chinese. Empty for dropped sentences.
Do not change the Chinese or the English.
Answer with JSON only: [{"key":"<key>","picks":[{"s":<sentence s>,"n":<meaning number or 0>,"pinyin":"…"},…]},…], one object per entry, every sentence once, in input order.`;

interface Answer { key: string; picks: Array<{ s: number; n: number; pinyin?: string }> }

async function charReadings(): Promise<Map<string, Set<string>>> {
  const { byWord } = await readDictionaryRows();
  const taiwan = await readTaiwanReadings();
  const readings = new Map<string, Set<string>>();
  const add = (char: string, pinyin: string) => {
    const key = readingKey(pinyin);
    if (key && !key.includes(' ')) readings.set(char, (readings.get(char) ?? new Set()).add(key));
  };
  for (const [word, rows] of byWord) if (Array.from(word).length === 1) for (const row of rows) add(word, row.pinyin_accented);
  for (const [char, list] of taiwan) for (const pinyin of list) add(char, pinyin);
  return readings;
}

/** Problems with a sentence's pinyin: a syllable that is no reading of its character. */
function pinyinProblems(chinese: string, pinyin: string, readings: Map<string, Set<string>>): string[] {
  const syllables = alignSentenceSyllables(chinese, pinyin);
  if (!syllables) return ['pinyin does not line up with the characters'];
  const chars = Array.from(chinese);
  const problems: string[] = [];
  syllables.forEach((syllable, index) => {
    if (!syllable) return;
    const char = chars[index];
    const allowed = readings.get(char);
    if (!allowed) return;
    const base = stripTones(syllable.text).toLowerCase();
    const key = `${base}${syllable.tone}`;
    const toneChange = (char === '一' && base === 'yi') || (char === '不' && base === 'bu');
    const neutral = syllable.tone === 5 && [...allowed].some((option) => option.replace(/[1-5]$/, '') === base);
    if (!allowed.has(key) && !toneChange && !neutral) problems.push(`${char} is not read ${syllable.text}`);
  });
  return problems;
}

async function main() {
  const args = process.argv.slice(2);
  const concurrency = Number(args[args.indexOf('--concurrency') + 1] || 4);
  const readings = await charReadings();
  await mkdir(resolve(OUT, 'tatoeba-senses'), { recursive: true });
  const names = (await readdir(resolve(OUT, 'tatoeba-batches'))).map((file) => file.replace(/\.json$/, '')).sort()
    .filter((name) => !existsSync(resolve(OUT, 'tatoeba-senses', `${name}.json`)));
  console.log(`Tatoeba matching: ${names.length} batches, ${concurrency} at a time.`);
  let failed = 0;
  let rejectedPinyin = 0;
  await eachLimited(names, concurrency, async (name) => {
    const entries = JSON.parse(await readFile(resolve(OUT, 'tatoeba-batches', `${name}.json`), 'utf8')) as TatoebaBatchEntry[];
    let feedback = '';
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const answer = replyArray(await askCodex(OUT, name, 'gpt-6.1-sol', 'medium', `${PROMPT}${feedback}\n\nEntries:\n${JSON.stringify(entries)}`)) as Answer[] | null;
      const problems: string[] = [];
      if (!Array.isArray(answer)) problems.push('answer is not a JSON array');
      for (const entry of answer ? entries : []) {
        const picks = answer!.find((item) => item?.key === entry.key)?.picks;
        if (!Array.isArray(picks)) { problems.push(`${entry.key}: missing`); continue; }
        for (const sentence of entry.sentences) {
          const pick = picks.find((item) => item?.s === sentence.s);
          if (!pick || !Number.isInteger(pick.n) || pick.n < 0 || pick.n > entry.senses.length) problems.push(`${entry.key}: sentence ${sentence.s} has no valid meaning number`);
          else if (pick.n > 0 && !pick.pinyin?.trim()) problems.push(`${entry.key}: sentence ${sentence.s} has no pinyin`);
        }
      }
      if (problems.length === 0) {
        // Wrong readings drop the sentence (never "fixed" by guessing).
        for (const entry of entries) for (const pick of answer!.find((item) => item.key === entry.key)!.picks) {
          if (pick.n === 0) continue;
          const sentence = entry.sentences.find((item) => item.s === pick.s)!;
          const issues = pinyinProblems(sentence.chinese, pick.pinyin!, readings);
          if (issues.length) { rejectedPinyin += 1; Object.assign(pick, { n: 0, rejected: issues[0] }); }
        }
        await writeFile(resolve(OUT, 'tatoeba-senses', `${name}.json`), JSON.stringify(answer), 'utf8');
        console.log(`[${name}] done`);
        return;
      }
      feedback = `\n\nYour previous answer had these problems; fix them: ${problems.slice(0, 12).join('; ')}`;
    }
    failed += 1;
    console.log(`[${name}] failed`);
  });
  console.log(`Finished: ${names.length - failed} done, ${failed} failed; ${rejectedPinyin} sentences dropped for a reading the dictionary does not have.`);
}

main().catch((error) => {
  console.error('Tatoeba matching failed:', error);
  process.exit(1);
});
