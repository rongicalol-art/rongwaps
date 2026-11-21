/**
 * Exports the public TOCFL word lists (src/screens/word-list/data/level-N.ts): every word of a
 * level with its pinyin and a short meaning.
 *
 * The words, levels and pinyin are the official list (TBCL, NAER) from output/levels/tbcl.csv, the
 * same file `npm run levels:build` reads. Its meanings and examples are NAER's and are not copied:
 * a meaning comes from our own vocabulary cards, or from content/word-lists/glosses.json for the
 * words the books do not teach (keys: `word`, `word pinyin`, or `word@level`). Fails when a word has neither.
 * Run: npm run word-lists:export
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { WORD_LIST_LEVELS } from '../../src/app/routes';

interface VocabItem { id: string; traditional: string; pinyin: string; meaning: string; simple?: string }

const read = <T,>(file: string) => JSON.parse(readFileSync(file, 'utf8')) as T;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; } else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** `想（要）` answers to 想 and 想要; `捷運/地鐵` to either. */
const spellings = (traditional: string) =>
  traditional.split('/').flatMap((form) => [form.replace(/[（(][^）)]*[）)]/g, ''), form.replace(/[（()）]/g, '')]);
/** Tones and spacing aside, so `xīngqí` meets `xīngqī` and `bù kèqì` meets `búkèqì`. */
const plain = (pinyin: string) => pinyin.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zü]/gi, '').toLowerCase();
/** The measure-word note (`(M: 張 zhāng)`) belongs to the full card, not a one-line gloss. */
const cardGloss = (item: VocabItem) => (item.simple || item.meaning).replace(/\s*\(M: [^)]*\)/, '').trim();

const vocab = [1, 2, 3, 4].flatMap((book) => read<{ items: VocabItem[] }>(`public/data/vocabulary/book-${book}.json`).items);
const cards = new Map<string, VocabItem[]>();
for (const item of vocab) {
  for (const form of spellings(item.traditional)) cards.set(form, [...(cards.get(form) ?? []), item]);
}
const glosses = read<Record<string, string>>('content/word-lists/glosses.json');

const [header, ...rows] = parseCsv(readFileSync('output/levels/tbcl.csv', 'utf8'));
const column = (name: string) => header.indexOf(name);
const [TRADITIONAL, SIMPLIFIED, LEVEL, PINYIN] = [column('Traditional'), column('Simplified'), column('Level'), column('Pinyin')];

const missing: string[] = [];
const counts: Record<number, number> = {};
mkdirSync('src/screens/word-list/data', { recursive: true });

for (const { level } of WORD_LIST_LEVELS) {
  // The top levels have their own file (content/word-lists/level-N.json), keyed `word pinyin` as the official
  // list spells them: nearly every word there needs a written meaning, and a key can then never reach another level.
  const levelFile = `content/word-lists/level-${level}.json`;
  const ofLevel = existsSync(levelFile) ? read<Record<string, string>>(levelFile) : {};
  const words = rows.filter((row) => Number(row[LEVEL]?.replace('*', '')) === level).map((row) => {
    const forms = row[TRADITIONAL].split('/');
    const readings = row[PINYIN].split('/');
    // One spelling with two readings (和 hàn/hé) keeps both; several spellings show the first.
    const spoken = forms.length === 1 ? readings.join(' / ') : readings[0];
    const listed = forms[0];
    // The official list brackets an optional part: 一邊(兒) is 一邊 in Taiwan, 沒(有)用 is 沒有用.
    const whole = (text: string) => text.replace(/[(（][兒儿r][)）]/g, '').replace(/[()（）]/g, '');
    const word = whole(listed);
    const key = `${listed} ${spoken}`;
    const pinyin = whole(spoken);
    const sameWord = forms.flatMap((form) => cards.get(form) ?? []);
    // The card read the same way; a word taught twice keeps its first meaning.
    const card = sameWord.find((item) => readings.some((reading) => plain(reading) === plain(item.pinyin)));
    // `道@5` is the meaning of 道 at level 5 only, where a lower level lists the same word and reading in another sense.
    const gloss = ofLevel[key] ?? glosses[`${listed}@${level}`] ?? glosses[key] ?? glosses[listed] ?? glosses[word] ?? (card ? cardGloss(card) : undefined);
    if (!gloss) missing.push(key);
    // The simplified spelling rides along only where it differs: a saved card needs it.
    const simplified = whole(row[SIMPLIFIED].split('/')[0]);
    return simplified && simplified !== word ? [word, pinyin, gloss ?? '', simplified] : [word, pinyin, gloss ?? ''];
  }).sort((a, b) => plain(a[1]).localeCompare(plain(b[1])) || a[1].localeCompare(b[1], 'zh-u-co-pinyin'))
    // The official list repeats a word now and then (來往 at level 6): once is enough.
    .filter((word, index, all) => all.findIndex((other) => other[0] === word[0] && other[1] === word[1]) === index);
  const body = words.map((word) => `  ${JSON.stringify(word)},`).join('\n');
  writeFileSync(`src/screens/word-list/data/level-${level}.ts`, `/**
 * GENERATED by scripts/content/exportWordLists.ts (npm run word-lists:export). Do not edit by hand.
 * The official TBCL level ${level} word list in pinyin order: word, pinyin, our own short meaning,
 * and the simplified spelling where it differs.
 */
import type { ListWord } from '../wordListTypes';

export const WORDS: readonly ListWord[] = [
${body}
];
`);
  counts[level] = words.length;
  console.log(`level ${level}: ${words.length} words`);
}

writeFileSync('src/screens/word-list/data/counts.ts', `/**
 * GENERATED by scripts/content/exportWordLists.ts (npm run word-lists:export). Do not edit by hand.
 * Words per TBCL level, so one list's page can name the others without downloading them.
 */
export const WORD_COUNTS: Readonly<Record<number, number>> = ${JSON.stringify(counts)};
`);

if (missing.length) {
  console.error(`\n${missing.length} words have no meaning. Add them to content/word-lists/glosses.json:\n${missing.join('\n')}`);
  process.exit(1);
}
