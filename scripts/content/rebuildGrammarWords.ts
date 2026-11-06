/**
 * Rebuilds the word blocks (`words`) of a book's grammar examples and pattern-table rows so they match
 * what the app's own word lookup treats as words, with each word's pinyin taken from the course word
 * lists (the book's Taiwan readings).
 *
 *   npx tsx scripts/content/rebuildGrammarWords.ts --book 3 [--lesson 6] [--write] [--report <file.json>]
 *   --readings        the same pinyin and simplified rules for content/readings/book-N.json
 *   --vocab-examples  the same pinyin rules for the word cards' example sentences (content/vocabulary/book-N-examples.json)
 *
 * - Words: the lookup's own segmentation (sentenceSegments + validation against the dictionary packs
 *   and course vocabulary), with the page's focus terms and the sentence's names kept whole, then
 *   adjacent pieces joined back when together they are a course word.
 * - Pinyin: a course word reads as its card. When the old pinyin has different syllables (not just
 *   tones), the card still wins and the word is flagged for review (old typos and real exceptions such
 *   as 穿著 zhe both land there). Other words keep the old syllables when they are a known reading,
 *   else the Taiwan-first character reading. 一 and 不 take their tone changes; 不 is never neutral.
 * - Simplified: from the card or dictionary entry, else the old simplified text.
 * - Meanings are cleared, so taps and hover pop-ups show the app's own lookup.
 * - Named speakers become their own word ("朋子" + "："), turns are separated by "\n" in the text, the
 *   pinyin and the English; A/B labels stay as prefixes.
 * The Chinese text itself (traditional) is never changed. The report lists every flagged word.
 *
 * Reviewed fixes in scripts/content/grammarFixes-book<N>.json (words the lookup splits wrongly, English,
 * titles, pattern-table cells; each with its reason) are re-applied after every rebuild. `--patch <file>`
 * applies a new batch on its own; once reviewed, add it to that file.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sentenceCandidates, sentenceSegments, validatedSentenceSegments } from '../../src/utils/vocabulary/sentenceSegments';
import { getPinyinTone, type PinyinTone } from '../../src/utils/pinyin/pinyinTones';
import { splitPinyinWordToSyllables } from '../../src/utils/pinyin/pinyinSyllables';
import { stripTones } from '../../src/data/pinyinTables';
import type { GrammarWordToken } from '../../src/types/grammar';

const ROOT = resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const arg = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const BOOK = Number(arg('book'));
const ONLY_LESSON = arg('lesson') ? Number(arg('lesson')) : undefined;
const WRITE = args.includes('--write');
const REPORT = arg('report');
if (!BOOK) throw new Error('Usage: rebuildGrammarWords.ts --book N [--lesson N] [--write] [--report file]');

const NUMS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen'];
const HAN = /\p{Script=Han}/u;
const NUMERAL = new Set([...'零〇二兩三四五六七八九十百千萬']);
const PARTICLES = new Set([...'的了嗎呢吧啊呀喔哦啦們著得地麼個子頭過']);
const FINAL_PARTICLES = new Set([...'嗎呢吧啊呀喔哦啦']);
const OPENERS = new Set([...'「『（(《〈“‘']);

interface Syllable { base: string; tone: PinyinTone; text: string; capital?: boolean; word?: number; sentenceStart?: boolean }
interface Card { pinyin: string; simplified: string }
interface Flag { kind: string; word: string; detail: string }

// ---------- reference data ----------

/** Expands 想（要） → [想要, 想] and xiǎng(yào) → [xiǎngyào, xiǎng]. */
function expandOptional(form: string): string[] {
  const match = form.match(/[（(]([^）)]*)[）)]/);
  if (!match || match.index === undefined) return [form];
  const before = form.slice(0, match.index);
  const after = form.slice(match.index + match[0].length);
  return [...expandOptional(before + match[1] + after), ...expandOptional(before + after)];
}

function loadCards(): Map<string, Card[]> {
  const cards = new Map<string, Card[]>();
  const add = (word: string, card: Card) => {
    const list = cards.get(word) ?? [];
    if (!list.some((c) => c.pinyin === card.pinyin)) list.push(card);
    cards.set(word, list);
  };
  for (const file of readdirSync(resolve(ROOT, 'public/data/vocabulary')).filter((f) => /^book-\d+\.json$/.test(f))) {
    const { items } = JSON.parse(readFileSync(resolve(ROOT, 'public/data/vocabulary', file), 'utf8')) as {
      items: { traditional: string; simplified?: string; pinyin: string }[];
    };
    for (const item of items) {
      const trads = item.traditional.split('/').flatMap(expandOptional);
      const simps = (item.simplified ?? item.traditional).split('/').flatMap(expandOptional);
      const pins = item.pinyin.split('/').flatMap(expandOptional).map((pinyin) => pinyin.trim().replace(/\s+/g, ' '));
      trads.forEach((trad, index) => {
        const simplified = simps.length === trads.length ? simps[index] : simps[0];
        if (pins.length === trads.length) add(trad, { pinyin: pins[index], simplified });
        else if (pins.length === 1 || trads.length === 1) pins.forEach((pinyin) => add(trad, { pinyin, simplified }));
      });
    }
  }
  return cards;
}

function loadDictionary(): Map<string, Card[]> {
  const dict = new Map<string, Card[]>();
  const dir = resolve(ROOT, 'public/data/dictionary');
  for (const file of readdirSync(dir).filter((f) => /^shard-\d+\.json$/.test(f))) {
    const { items } = JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as { items: [number, string, string, string, string[]][] };
    for (const [, simplified, traditional, pinyin] of items) {
      const word = traditional || simplified;
      const list = dict.get(word) ?? [];
      list.push({ pinyin, simplified });
      dict.set(word, list);
    }
  }
  return dict;
}

function loadCharacterReadings(): Map<string, string[]> {
  const pack = JSON.parse(readFileSync(resolve(ROOT, 'public/data/pronunciation/pronunciation.json'), 'utf8')) as {
    readings: Record<string, string>;
  };
  return new Map(Object.entries(pack.readings).map(([char, value]) => [
    char,
    value.split('|').filter(Boolean).map((part) => part.split(':')[0].replace(/~$/, '')),
  ]));
}

const cards = loadCards();
const dictionary = loadDictionary();
const charReadings = loadCharacterReadings();
const isWord = (word: string) => cards.has(word) || dictionary.has(word);

// ---------- names ----------

/** The book's people, with their pinyin (scripts/content/grammarNames-bookN.json). */
const fixedNames = new Map(Object.entries(
  JSON.parse(readFileSync(resolve(ROOT, `scripts/content/grammarNames-book${BOOK}.json`), 'utf8')) as Record<string, string>,
));
const SURNAMES = new Set([...'林方王謝李康夏白戴游周阮陳紀錢馬張牛孔畢溫金杜顧陸黃吳劉蔡楊鄭蘇徐江葉胡朱羅宋唐廖文郭何許呂范邱余傅魏沈盧潘簡莊賴洪曹彭柯翁石田顏姚秦蔣韓汪丁']);
const TITLES = ['先生', '小姐', '太太', '老師', '教授', '導演', '經理', '老闆', '博士', '伯伯', '阿姨', '醫生', '同學',
  '媽媽', '爸爸', '奶奶', '爺爺', '叔叔', '伯母'];
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const surnamePinyin = (char: string) => capitalize((charReadings.get(char) ?? [char])[0]);

/** Names in a text with their pinyin: the book's people, surname + title (李先生 Lǐ xiānshēng), 小 + surname (小張 Xiǎo Zhāng). */
function namesIn(text: string): Map<string, string> {
  const found = new Map<string, string>();
  // A fixed name counts only where it is not part of a longer word (小東 inside 小東西 "little thing").
  for (const [name, pinyin] of fixedNames) {
    for (let at = text.indexOf(name); at >= 0; at = text.indexOf(name, at + 1)) {
      const next = text.slice(at + name.length, at + name.length + 1);
      if (!next || !isWord(name + next)) { found.set(name, pinyin); break; }
    }
  }
  const chars = [...text];
  chars.forEach((char, i) => {
    if (!SURNAMES.has(char)) return;
    const before = chars[i - 1];
    if (before && HAN.test(before) && before !== '小' && isWord(before + char)) return; // 中文老師, 地方
    const rest = chars.slice(i + 1).join('');
    const title = TITLES.find((t) => rest.startsWith(t));
    if (title) {
      const titlePinyin = cards.get(title)?.[0]?.pinyin ?? title;
      found.set(char + title, `${surnamePinyin(char)} ${titlePinyin}`);
    }
    if (before === '小' && !isWord(`小${char}`) && !fixedNames.has(`小${char}`)) found.set(`小${char}`, `Xiǎo ${surnamePinyin(char)}`);
  });
  return found;
}

// ---------- pinyin helpers ----------

function toSyllable(text: string): Syllable {
  const clean = text.normalize('NFC');
  return { text: clean, base: stripTones(clean).replace(/ü/g, 'v'), tone: getPinyinTone(clean) };
}

const startsUpper = (text: string) => text.charAt(0) !== text.charAt(0).toLowerCase();

/**
 * Syllables of one pinyin string, each tagged with its word index and capitalisation. Only a capital inside a
 * sentence marks a proper noun; the capital that starts a sentence, a turn or a quote does not.
 */
function pinyinSyllables(pinyin: string): Syllable[] {
  const out: Syllable[] = [];
  const spoken = pinyin.normalize('NFC').replace(/(^|\s|\n)(?:[A-D]|[\p{Script=Han}]{1,4})[:：]/gu, '$1.');
  let wordIndex = 0;
  for (const match of spoken.matchAll(/[A-Za-zÀ-ɏ'’]+/gu)) {
    const before = spoken.slice(0, match.index).trimEnd();
    const sentenceStart = /^[\s….,]*$/.test(before) || /[.?!:;…“"(]$/.test(before);
    splitPinyinWordToSyllables(match[0].replace(/’/g, "'")).forEach((part, index) => {
      out.push({
        ...toSyllable(part.toLowerCase()), word: wordIndex, sentenceStart: index === 0 && sentenceStart,
        capital: index === 0 && !sentenceStart && startsUpper(part),
      });
    });
    wordIndex += 1;
  }
  return out;
}

const vowelTone: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à'], e: ['ē', 'é', 'ě', 'è'], i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'], u: ['ū', 'ú', 'ǔ', 'ù'], v: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/** Writes a base with a tone mark (standard placement: a/e, else o in ou, else the last vowel). */
function mark(base: string, tone: PinyinTone): string {
  if (tone === 5 || base === 'r') return base.replace(/v/g, 'ü');
  let index = base.search(/[ae]/);
  if (index < 0) index = base.indexOf('ou');
  if (index < 0) {
    const vowels = [...base].map((char, i) => ('iouv'.includes(char) ? i : -1)).filter((i) => i >= 0);
    index = vowels[vowels.length - 1];
  }
  const vowel = base[index];
  return (base.slice(0, index) + vowelTone[vowel][tone - 1] + base.slice(index + 1)).replace(/v/g, 'ü');
}

/** Reading options of a word as syllable lists (erhua 兒 written as a final "r"). */
function readings(word: string, entries: Card[] | undefined): Syllable[][] {
  const chars = [...word];
  const out: Syllable[][] = [];
  for (const entry of entries ?? []) {
    let syllables = entry.pinyin.split(/\s+/).flatMap((part) => splitPinyinWordToSyllables(part.replace(/’/g, "'"))).map(toSyllable);
    if (syllables.length !== chars.length && chars[chars.length - 1] === '兒' && syllables[syllables.length - 1]?.base === 'r') {
      syllables = syllables.slice(0, -1).concat({ text: 'r', base: 'r', tone: 5 });
    }
    if (syllables.length === chars.length && syllables.every((s) => /^[a-zv]+$/.test(s.base))) out.push(syllables);
  }
  return out;
}

const bases = (syllables: (Syllable | null)[]) => syllables.map((s) => s?.base ?? '?').join(' ');

// ---------- segmentation ----------

function segmentRun(run: string, authored: string[], single: Set<string> = new Set(), names: Set<string> = new Set()): string[] {
  const present = authored.filter((word) => run.includes(word));
  const segments = sentenceSegments(run, present);
  const candidates = sentenceCandidates(segments.filter((part) => !present.includes(part.segment)));
  const valid = new Set(candidates.filter(isWord));
  present.forEach((word) => valid.add(word));
  const pieces = validatedSentenceSegments(segments, valid).map((part) => part.segment).filter(Boolean);
  // Join adjacent pieces back when together they are a course word (便利 + 商店 → 便利商店).
  const out: string[] = [];
  for (let i = 0; i < pieces.length;) {
    let joined = 1;
    for (let span = Math.min(4, pieces.length - i); span > 1; span--) {
      const word = pieces.slice(i, i + span).join('');
      if (cards.has(word) && [...word].length <= 6) {
        joined = span;
        break;
      }
    }
    out.push(pieces.slice(i, i + joined).join(''));
    i += joined;
  }
  // A number is one word (十萬 + 九 + 千 → 十萬九千).
  for (let i = 0; i + 1 < out.length; i++) {
    const allNumeral = (w: string) => [...w].every((c) => NUMERAL.has(c) || c === '一');
    if (allNumeral(out[i]) && allNumeral(out[i + 1])) {
      out.splice(i, 2, out[i] + out[i + 1]);
      i--;
    }
  }
  // Move one character across a boundary when that makes a course word (洗衣 | 服 → 洗 | 衣服, 不知 | 道 → 不 | 知道).
  const fixed = authored.concat([...names]);
  for (let changed = true, rounds = 0; changed && rounds < 10; rounds++) {
    changed = false;
    for (let i = 0; i + 1 < out.length; i++) {
      const [a, b] = [out[i], out[i + 1]];
      if (fixed.includes(a) || fixed.includes(b)) continue;
      const ca = [...a];
      const cb = [...b];
      const okRest = (rest: string) => [...rest].length === 1 || isWord(rest);
      // Only when neither side is a course word already, so a shift never undoes one.
      if (cards.has(a) || cards.has(b)) continue;
      if (ca.length > 1 && cards.has(ca[ca.length - 1] + b) && okRest(ca.slice(0, -1).join(''))) {
        out.splice(i, 2, ca.slice(0, -1).join(''), ca[ca.length - 1] + b);
        changed = true;
      } else if (cb.length > 1 && cards.has(a + cb[0]) && okRest(cb.slice(1).join(''))) {
        out.splice(i, 2, a + cb[0], cb.slice(1).join(''));
        changed = true;
      }
    }
  }
  // 的話 "if" ends a clause; inside one it is 的 + 話 (用浪漫的話 = with romantic words).
  for (let i = 0; i < out.length - 1; i++) if (out[i] === '的話') out.splice(i, 1, '的', '話');
  // A one-character grammar word at the edge of a looser word stands alone (常用 → 常 | 用).
  return out.flatMap((word) => {
    const chars = [...word];
    if (chars.length < 2 || cards.has(word) || authored.includes(word) || names.has(word)) return [word];
    const first = chars[0];
    const last = chars[chars.length - 1];
    const restOk = (rest: string) => [...rest].length === 1 || isWord(rest);
    if (single.has(last) && restOk(chars.slice(0, -1).join(''))) return [chars.slice(0, -1).join(''), last];
    if (single.has(first) && restOk(chars.slice(1).join(''))) return [first, chars.slice(1).join('')];
    return [word];
  });
}

// ---------- one text (an example, or one pattern cell) ----------

interface Built {
  words: GrammarWordToken[];
  simplified: string;
  pinyin: string;
  flags: Flag[];
  turns: number;
}

interface Piece {
  kind: 'word' | 'punct' | 'label' | 'name-label' | 'break' | 'latin' | 'gloss';
  text: string;
}

const LABEL_AT = /^(?:([A-D])|([\p{Script=Han}]{1,4}))[：:]/u;

function pieces(text: string, authored: string[], single: Set<string>, names: Set<string>): Piece[] {
  const out: Piece[] = [];
  const lines = text.split('\n');
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) out.push({ kind: 'break', text: '\n' });
    let rest = line;
    const label = rest.match(LABEL_AT);
    if (label && (label[1] || lines.length > 1 || /^[\p{Script=Han}]{1,4}[：:]/u.test(rest))) {
      out.push({ kind: label[1] ? 'label' : 'name-label', text: label[1] ?? label[2] });
      rest = rest.slice(label[0].length);
    }
    for (const run of rest.match(/[（(][^）)\p{Script=Han}]*[A-Za-z][^）)\p{Script=Han}]*[）)]|\p{Script=Han}+|[A-Za-z0-9]+|[^\p{Script=Han}A-Za-z0-9（(]+|[（(]/gu) ?? []) {
      if (/^[（(].*[A-Za-z].*[）)]$/u.test(run)) {
        out.push({ kind: 'gloss', text: run });
        continue;
      }
      if (HAN.test(run)) segmentRun(run, authored, single, names).forEach((word) => out.push({ kind: 'word', text: word }));
      else if (/[A-Za-z0-9]/.test(run)) out.push({ kind: 'latin', text: run });
      else if (run.trim()) out.push({ kind: 'punct', text: run.replace(/\s+/g, '') });
    }
  });
  return out;
}

/** The old pinyin's syllables lined up with the Han characters of `text` (null where they can't be). */
function hintsFor(rawText: string, rawPinyin: string): (Syllable | null)[] {
  // The book's Latin glosses in the text — （xīguǎn, straw） — are not syllables; drop the same ones from the pinyin.
  const gloss = /[（(][^）)\p{Script=Han}]*[A-Za-z][^）)\p{Script=Han}]*[）)]/gu;
  const glosses = (rawText.match(gloss) ?? []).map((g) => g.slice(1, -1).trim());
  const text = rawText.replace(gloss, '');
  let pinyin = rawPinyin;
  for (const g of glosses) pinyin = pinyin.replace(`(${g})`, ' ').replace(`（${g}）`, ' ');
  const hanCount = [...text].filter((c) => HAN.test(c)).length;
  let syllables = pinyinSyllables(pinyin);
  // Latin words in the sentence (3C, ATM) are not syllables.
  for (const latin of text.match(/[A-Za-z0-9]+/g) ?? []) {
    const index = syllables.findIndex((s) => s.text.toLowerCase() === latin.toLowerCase());
    if (index >= 0) syllables = syllables.slice(0, index).concat(syllables.slice(index + 1));
  }
  if (syllables.length !== hanCount) {
    const withoutR = syllables.filter((s) => s.base !== 'r');
    if (withoutR.length === hanCount) syllables = withoutR;
  }
  if (syllables.length === hanCount) return syllables;
  // Old pinyin that kept a Chinese speaker label (助理: xià ge yuè…) has no syllables for the label.
  const labelChars = new Set<number>();
  let index = 0;
  for (const line of text.split('\n')) {
    const label = line.match(/^([\p{Script=Han}]{1,4})[：:]/u);
    const lineHan = [...line].filter((c) => HAN.test(c)).length;
    if (label) for (let k = 0; k < [...label[1]].length; k++) labelChars.add(index + k);
    index += lineHan;
  }
  if (labelChars.size && syllables.length === hanCount - labelChars.size) {
    const out: (Syllable | null)[] = [];
    let next = 0;
    for (let k = 0; k < hanCount; k++) out.push(labelChars.has(k) ? null : syllables[next++]);
    return out;
  }
  return new Array(hanCount).fill(null);
}

function chooseReading(word: string, hint: (Syllable | null)[], flags: Flag[], isName: boolean): Syllable[] {
  const chars = [...word];
  const complete = hint.every(Boolean);
  const cardOptions = readings(word, cards.get(word));
  // A sentence-final particle with no old syllable to go by is neutral (對啊 duì a); its card gives the citation tone.
  if (!isName && chars.length === 1 && FINAL_PARTICLES.has(word) && !hint[0] && cardOptions.length) {
    return [{ ...cardOptions[0][0], tone: 5, text: cardOptions[0][0].base.replace(/v/g, 'ü') }];
  }
  if (!isName && cardOptions.length) {
    const match = cardOptions.find((option) => bases(option) === bases(hint));
    // A sentence particle keeps its neutral tone (吧, 啊, 喔); the card writes the citation form.
    if (match && chars.length === 1 && PARTICLES.has(word) && hint[0]?.tone === 5) return [hint[0]!];
    if (match) return match;
    if (complete) flags.push({ kind: 'card-differs', word, detail: `old ${hint.map((s) => s!.text).join(' ')} → card ${cardOptions[0].map((s) => s.text).join(' ')}` });
    return cardOptions[0];
  }
  if (chars.length === 1 && !isName) {
    const known = (charReadings.get(word) ?? []).map(toSyllable);
    const h = hint[0];
    if (h && known.some((k) => k.base === h.base)) {
      const sameBase = known.filter((k) => k.base === h.base);
      if (sameBase.some((k) => k.tone === h.tone) || (h.tone === 5 && PARTICLES.has(word))) return [h];
      if (h.tone === 5) return [h];
      if (word !== '一' && word !== '不') flags.push({ kind: 'tone-normalized', word, detail: `old ${h.text} → ${sameBase[0].text}` });
      return [sameBase[0]];
    }
    if (known.length) {
      if (h) flags.push({ kind: 'reading-unknown', word, detail: `old ${h.text} → ${known[0].text}` });
      return [known[0]];
    }
    if (h) return [h];
    flags.push({ kind: 'no-reading', word, detail: 'no reading found' });
    return [{ text: '?', base: '?', tone: 5 }];
  }
  // A word inside a course word reads as it does there (時候 in 什麼時候 → shíhòu).
  if (!isName && chars.length > 1) {
    const inside = insideCardReadings(word);
    const match = inside.find((option) => bases(option) === bases(hint)) ?? (complete ? undefined : inside[0]);
    if (match) return match;
  }
  // Names and other multi-character words: the old syllables when they fit, else the dictionary.
  if (complete) {
    if (isName) return hint as Syllable[];
    const dictOptions = readings(word, dictionary.get(word));
    if (!dictOptions.length || dictOptions.some((option) => bases(option) === bases(hint))) return hint as Syllable[];
    flags.push({ kind: 'dict-differs', word, detail: `old ${hint.map((s) => s!.text).join(' ')} → dictionary ${dictOptions[0].map((s) => s.text).join(' ')}` });
    return hint as Syllable[];
  }
  const dictOptions = readings(word, dictionary.get(word));
  if (dictOptions.length) {
    flags.push({ kind: 'from-dictionary', word, detail: dictOptions[0].map((s) => s.text).join(' ') });
    return dictOptions[0];
  }
  const perChar = chars.map((char) => toSyllable((charReadings.get(char) ?? ['?'])[0]));
  flags.push({ kind: 'per-character', word, detail: perChar.map((s) => s.text).join(' ') });
  return perChar;
}

/** Course words inside a longer word keep the card's tones (老朋友 → lǎo péngyǒu). */
function overlayCardWords(word: string, syllables: Syllable[]): Syllable[] {
  const chars = [...word];
  const out = [...syllables];
  const taken = new Array(chars.length).fill(false);
  for (let length = chars.length - 1; length >= 2; length--) {
    for (let at = 0; at + length <= chars.length; at++) {
      if (taken.slice(at, at + length).some(Boolean)) continue;
      const sub = chars.slice(at, at + length).join('');
      if (!cards.has(sub)) continue;
      const option = readings(sub, cards.get(sub)).find((o) => bases(o) === bases(out.slice(at, at + length)));
      if (!option) continue;
      option.forEach((s, k) => { out[at + k] = { ...s, word: out[at + k].word, capital: out[at + k].capital }; });
      taken.fill(true, at, at + length);
    }
  }
  return out;
}

const cardWords = [...cards.keys()];
const insideCache = new Map<string, Syllable[][]>();
/** Readings of `word` taken from the course words that contain it. */
function insideCardReadings(word: string): Syllable[][] {
  const cached = insideCache.get(word);
  if (cached) return cached;
  const out: Syllable[][] = [];
  for (const card of cardWords) {
    const at = card.indexOf(word);
    if (at < 0 || card === word) continue;
    const offset = [...card.slice(0, at)].length;
    for (const option of readings(card, cards.get(card))) {
      const part = option.slice(offset, offset + [...word].length);
      if (!out.some((o) => o.map((s) => s.text).join() === part.map((s) => s.text).join())) out.push(part);
    }
  }
  insideCache.set(word, out);
  return out;
}

/** Underlying tone of a syllable (a neutral one reads its character's main tone). */
function underlyingTone(char: string, syllable: Syllable | undefined): PinyinTone | undefined {
  if (!syllable) return undefined;
  if (syllable.tone !== 5) return syllable.tone;
  const options = [...(charReadings.get(char) ?? []), ...(dictionary.get(char) ?? []).map((entry) => entry.pinyin)]
    .map(toSyllable).filter((option) => option.base === syllable.base && option.tone !== 5);
  return options[0]?.tone;
}

interface Slot { char: string; syllable: Syllable; fromCard: boolean; word: number; last: boolean }

/** 一 and 不 tone changes on characters outside card words (cards are already written that way). */
function applyToneChanges(slots: Slot[], flags: Flag[]) {
  slots.forEach((slot, index) => {
    if (slot.fromCard || (slot.char !== '一' && slot.char !== '不')) return;
    const next = slots[index + 1];
    const nextTone = next && !slot.last ? (next.char === '一' ? 1 : underlyingTone(next.char, next.syllable)) : undefined;
    const before = slots[index - 1];
    let tone: PinyinTone;
    if (slot.char === '一' && slot.last && next?.char === '兩') {
      // 一、兩 + measure "one or two" reads as 一兩 (yì, liǎng).
      tone = 4;
    } else if (slot.char === '一' && before && '期拜週'.includes(before.char)) {
      // The day of the week keeps yī (星期一要考試 xīngqíyī, not yí).
      tone = 1;
    } else if (slot.char === '不' || (next && '百千萬億'.includes(next.char) && before?.char !== '十')) {
      // 不 always changes; so does 一 counting hundreds, thousands, ten thousands (yìbǎi, yìqiān, yíwàn), as the
      // books print it, but not the 一 of 十一 (十一萬 shíyī wàn).
      tone = nextTone === 4 ? 2 : 4;
    } else if (!next || slot.last || (before && (before.char === '第' || NUMERAL.has(before.char) || before.char === '一'))
      || (next && ['月', '號', '日'].includes(next.char)) || (next && NUMERAL.has(next.char))) {
      tone = 1;
    } else {
      tone = nextTone === 4 ? 2 : 4;
    }
    if (slot.syllable.tone !== tone) {
      const old = slot.syllable.text;
      slot.syllable = { ...slot.syllable, tone, text: mark(slot.syllable.base, tone) };
      flags.push({ kind: 'tone-change', word: slot.char, detail: `${old} → ${slot.syllable.text}` });
    }
  });
}

/** Joins a word's syllables; syllables from different old pinyin words keep their space (kěyǐ shuō shì). */
function joinWord(syllables: Syllable[]): string {
  return syllables.map((s, i) => {
    if (i === 0) return s.text;
    const previous = syllables[i - 1];
    if (s.word !== undefined && previous.word !== undefined && s.word !== previous.word) return ` ${s.text}`;
    return s.base !== 'r' && /^[aeo]/.test(s.base) ? `'${s.text}` : s.text;
  }).join('');
}

const PUNCT_PINYIN: Record<string, string> = {
  '，': ',', '。': '.', '？': '?', '！': '!', '、': ',', '；': ';', '：': ':', '「': '“', '」': '”', '『': '“', '』': '”',
  '（': '(', '）': ')', '《': '“', '》': '”',
};
const punctPinyin = (text: string) => text.replace(/[（(]([^）)]*)[）)]/g, ' ($1)').split(/( \([^)]*\))/)
  .map((part) => (part.startsWith(' (') ? part : [...part].map((c) => PUNCT_PINYIN[c] ?? c).join('').replace(/……/g, '…'))).join('');

/** A character's simplified form when the dictionary gives it only one; otherwise the character itself. */
function simplifiedChar(char: string): string {
  const forms = new Set((dictionary.get(char) ?? []).map((entry) => entry.simplified).filter((form) => [...form].length === 1));
  return forms.size === 1 ? [...forms][0] : char;
}

/** Card, then dictionary, then the old simplified text with any character it left unconverted converted. */
function simplifiedOf(word: string, oldSimplified: string | undefined): string {
  const card = cards.get(word)?.[0];
  if (card?.simplified) return card.simplified;
  const entry = dictionary.get(word)?.[0];
  if (entry?.simplified && [...entry.simplified].length === [...word].length) return entry.simplified;
  const chars = [...word];
  const old = oldSimplified && [...oldSimplified].length === chars.length ? [...oldSimplified] : chars;
  return old.map((form, i) => (form === chars[i] ? simplifiedChar(chars[i]) : form)).join('');
}

function build(
  text: string, oldPinyin: string, oldSimplified: string, idPrefix: string, focus: { whole: string[]; single: Set<string> },
): Built {
  const flags: Flag[] = [];
  const names = namesIn(text);
  const list = pieces(text, [...focus.whole, ...names.keys()], focus.single, new Set(names.keys()));
  const hints = hintsFor(text, oldPinyin);
  // Old simplified characters lined up with the traditional ones (same length when they correspond).
  const tradChars = [...text];
  const simpChars = [...oldSimplified];
  const simpAt = simpChars.length === tradChars.length ? simpChars : null;

  const words: GrammarWordToken[] = [];
  const slots: Slot[] = [];
  let hanIndex = 0;
  let charIndex = 0;
  let pendingPrefix = '';
  let turns = 1;
  const wordSyllables: Syllable[][] = [];
  const wordFromCard: boolean[] = [];

  const pushWord = (traditional: string, syllables: Syllable[], fromCard: boolean, simplified: string, isLabel = false) => {
    const token: GrammarWordToken = {
      id: `${idPrefix}-w${words.length + 1}`,
      traditional,
      simplified,
      pinyin: '',
      meaning: '',
      ...(pendingPrefix ? { prefix: pendingPrefix } : {}),
      ...(isLabel ? { suffix: '：' } : {}),
    };
    pendingPrefix = '';
    words.push(token);
    wordSyllables.push(syllables);
    wordFromCard.push(fromCard);
    return token;
  };

  for (let p = 0; p < list.length; p++) {
    const piece = list[p];
    // A word the old pinyin reads differently from every dictionary entry was glued together by the
    // splitter (都會 "metropolis" for 都 + 會, 到了 "at last" for 到 + 了): split it. A card word whose
    // last syllable the old pinyin reads as a particle (穿著 "wearing" = 穿 + 著 zhe) loses that particle.
    if (piece.kind === 'word' && !names.has(piece.text) && [...piece.text].length > 1) {
      const chars = [...piece.text];
      const hint = hints.slice(hanIndex, hanIndex + chars.length);
      if (hint.every(Boolean)) {
        const options = readings(piece.text, cards.get(piece.text));
        const dictOptions = readings(piece.text, dictionary.get(piece.text));
        const last = hint[hint.length - 1]!;
        let split: string[] | null = null;
        if (!options.length && dictOptions.length && !dictOptions.some((o) => bases(o) === bases(hint))) split = chars;
        else if (options.length && !options.some((o) => bases(o) === bases(hint)) && '著了過地得'.includes(chars[chars.length - 1])
          && last.tone === 5 && ['zhe', 'le', 'guo', 'de'].includes(last.base)) split = [chars.slice(0, -1).join(''), chars[chars.length - 1]];
        // 得 read děi is "must" before a verb (都得到圖書館去 = 得 + 到, 得很小心 = 得 + 很), not part of 得到 / 得很.
        else if (options.length && !options.some((o) => bases(o) === bases(hint)) && chars[0] === '得' && hint[0]!.base === 'dei')
          split = ['得', chars.slice(1).join('')];
        // 了 read liǎo is a result complement (拿得了 = 拿 + 得 + 了 liǎo), not the end of a card word (得了 déle).
        else if (options.length && !options.some((o) => bases(o) === bases(hint)) && chars[chars.length - 1] === '了'
          && last.base === 'liao') split = [...chars.slice(0, -1), '了'];
        if (split) {
          flags.push({ kind: 'split', word: piece.text, detail: split.join(' | ') });
          list.splice(p, 1, ...split.map((text) => ({ kind: 'word' as const, text })));
          p--;
          continue;
        }
      }
    }
    const start = charIndex;
    charIndex += [...piece.text].length + (piece.kind === 'label' || piece.kind === 'name-label' ? 1 : 0);
    if (piece.kind === 'break') {
      turns += 1;
      if (words.length) words[words.length - 1].suffix = `${words[words.length - 1].suffix ?? ''}\n`;
      else pendingPrefix += '\n';
      continue;
    }
    if (piece.kind === 'label') {
      pendingPrefix = `${pendingPrefix}${piece.text}：`;
      continue;
    }
    if (piece.kind === 'punct') {
      const opener = [...piece.text].every((c) => OPENERS.has(c)) || (piece.text.startsWith('…') && (!words.length || words[words.length - 1].suffix?.endsWith('\n')));
      if (opener || !words.length) pendingPrefix += piece.text;
      else words[words.length - 1].suffix = `${words[words.length - 1].suffix ?? ''}${piece.text}`;
      continue;
    }
    if (piece.kind === 'gloss') {
      if (words.length) words[words.length - 1].suffix = `${words[words.length - 1].suffix ?? ''}${piece.text}`;
      else pendingPrefix += piece.text;
      continue;
    }
    if (piece.kind === 'latin') {
      pushWord(piece.text, [], false, piece.text);
      continue;
    }
    const chars = [...piece.text];
    const hint = hints.slice(hanIndex, hanIndex + chars.length);
    hanIndex += chars.length;
    const isName = names.has(piece.text);
    const named = isName ? names.get(piece.text)!.split(/\s+/).flatMap((part) => splitPinyinWordToSyllables(part)).map(toSyllable) : [];
    let syllables = named.length === chars.length ? named : chooseReading(piece.text, hint, flags, isName);
    if (!isName && !cards.has(piece.text) && chars.length > 1) {
      syllables = syllables.map((s, i) => (i > 0 && chars[i] === '個' && s.base === 'ge' ? { ...s, tone: 5, text: 'ge' } : s));
    }
    if (!isName && !cards.has(piece.text) && chars.length > 2) syllables = overlayCardWords(piece.text, syllables);
    const fromCard = !isName && cards.has(piece.text);
    const oldSimp = simpAt ? simpAt.slice(start, start + chars.length).join('') : undefined;
    const simplified = isName ? chars.map(simplifiedChar).join('') : simplifiedOf(piece.text, oldSimp);
    // Proper nouns: names, a capital the old pinyin gave mid-sentence, or, where the old pinyin can't tell
    // (sentence start, no pinyin), a word the dictionary only knows as one (春節).
    const entries = dictionary.get(piece.text) ?? [];
    const properNoun = entries.length > 0 && entries.every((entry) => startsUpper(entry.pinyin))
      && !/^[一二三四五六七八九十]+月$/.test(piece.text);
    const capital = isName || piece.kind === 'name-label' || Boolean(hint[0]?.capital)
      || (properNoun && (!hint[0] || Boolean(hint[0].sentenceStart)));
    pushWord(piece.text, syllables.map((s, i) => (i === 0 && capital ? { ...s, capital: true } : s)), fromCard, simplified, piece.kind === 'name-label');
  }

  // Tone changes need every word's syllables in order.
  wordSyllables.forEach((syllables, w) => {
    const chars = [...words[w].traditional].filter((c) => HAN.test(c));
    syllables.forEach((syllable, i) => slots.push({
      char: chars[i] ?? '', syllable, fromCard: wordFromCard[w], word: w,
      last: i === syllables.length - 1 && /[，。？！、；：…]/.test(words[w].suffix ?? ''),
    }));
  });
  applyToneChanges(slots, flags);
  let cursor = 0;
  wordSyllables.forEach((syllables, w) => {
    const updated = slots.slice(cursor, cursor + syllables.length).map((slot) => slot.syllable);
    cursor += syllables.length;
    const card = cards.get(words[w].traditional);
    const cardText = card?.find((c) => readings(words[w].traditional, [c])[0]?.map((s) => s.text).join('') === updated.map((s) => s.text).join(''));
    // Numbers stay one word (十八 shíbā, 第二 dì'èr).
    const numeric = /^[第零〇一二兩三四五六七八九十百千萬幾]+$/.test(words[w].traditional);
    const joined = joinWord(numeric ? updated.map((s) => ({ ...s, word: undefined })) : updated);
    let pinyin = updated.length ? (cardText ? cardText.pinyin : joined) : words[w].traditional;
    if (syllables[0]?.capital) pinyin = capitalize(pinyin);
    const name = names.get(words[w].traditional);
    if (name) pinyin = name;
    words[w].pinyin = pinyin;
  });

  return { words, ...assemble(words), flags, turns };
}

/** The simplified text and sentence pinyin of a list of words. */
function assemble(words: GrammarWordToken[]): { simplified: string; pinyin: string } {
  const simplified = words.map((w) => `${w.prefix ?? ''}${w.simplified ?? w.traditional}${w.suffix ?? ''}`).join('');
  let pinyin = '';
  let capitalNext = true;
  for (const w of words) {
    const prefix = w.prefix ?? '';
    if (prefix.includes('\n')) capitalNext = true;
    const labels = prefix.replace(/\n/g, '').match(/[A-D][：:]/);
    if (prefix.includes('\n')) pinyin = `${pinyin.trimEnd()}\n`;
    if (labels) pinyin += `${labels[0][0]}: `;
    const opener = prefix.replace(/\n|[A-D][：:]/g, '');
    if (opener) pinyin += punctPinyin(opener) + (/[，、]$/.test(opener) ? ' ' : '');
    // An excerpt that opens with …… continues a sentence: no capital.
    if (opener.includes('…') && !pinyin.trim()) capitalNext = false;
    let body = w.pinyin;
    if (capitalNext && /^[a-zà-ÿāēīōūǖǎěǐǒǔǚ]/i.test(body)) body = body.charAt(0).toUpperCase() + body.slice(1);
    capitalNext = false;
    pinyin += body;
    const suffix = w.suffix ?? '';
    if (suffix) {
      const lineBreak = suffix.includes('\n');
      pinyin += punctPinyin(suffix.replace(/\n/g, ''));
      if (/[。？！.?!]/.test(suffix) || suffix.includes('：')) capitalNext = true;
      if (lineBreak) {
        pinyin = `${pinyin.trimEnd()}\n`;
        capitalNext = true;
        continue;
      }
    }
    pinyin += ' ';
  }
  return {
    simplified,
    pinyin: pinyin.replace(/ +\n/g, '\n').replace(/ +$/, '').replace(/ ([,.?!;:”)])/g, '$1')
      // An opening quote after punctuation takes the space before it: wǒ: “Kuài, not wǒ:“ Kuài.
      .replace(/([,.?!;:])“ /g, '$1 “'),
  };
}

/** Puts each speaker's English on its own line when every turn starts with a "Name:" label. */
function englishByTurn(english: string, turns: number, flags: Flag[]): string {
  if (turns < 2 || english.includes('\n')) return english;
  const labels = [...english.matchAll(/(?:^|(?<=[.!?…”"]\s))([A-Z][A-Za-z’'.-]*(?: [A-Z][A-Za-z’'.-]*)?):\s/g)];
  if (labels.length !== turns || labels[0].index !== 0) {
    flags.push({ kind: 'english-turns', word: '', detail: `${labels.length} labels for ${turns} turns` });
    return english;
  }
  return labels.map((label, i) => english.slice(label.index, labels[i + 1]?.index ?? english.length).trim()).join('\n');
}

// ---------- files ----------

interface ExampleText { traditional: string; simplified?: string; pinyin?: string; english?: string; words?: GrammarWordToken[] }
interface ReadingRecord { id: string; lessonId: number; title?: string; setting?: string; paragraphs: ExampleText[] }
interface Page {
  id: string; grammarNumber: number; titleTraditional: string; focusTerms?: string[];
  examples: { id: string; text: ExampleText }[];
  patternRows: { id: string; english?: string; columns?: GrammarWordToken[][]; subject?: GrammarWordToken[]; grammar?: GrammarWordToken[]; complement?: GrammarWordToken[] }[];
}

/** Chinese pieces of a title or term (甚至(連)……也/都…… → 甚至, 連, 也, 都). */
const hanPieces = (text: string) => text.split(/[^\p{Script=Han}]+/u).filter(Boolean)
  // 一M比一M gives 比一: a piece ending in 一 right before a slot letter is not a word.
  .filter((piece) => !(piece.length > 1 && piece.endsWith('一') && new RegExp(`${piece}[A-Za-z]`).test(text)));

/**
 * The page's grammar words. `whole`: kept as one word (2–4 characters, a real word or the title's own
 * term such as 可以說是 or 話說回來; example phrases like 萬一停電 are not words). `single`: one-character
 * grammar words that are split off a looser word (常用 → 常 | 用, 到了 → 到 | 了).
 */
function focusWords(page: Page): { whole: string[]; single: Set<string> } {
  const title = new Set(hanPieces(page.titleTraditional));
  const terms = (page.focusTerms ?? []).flatMap(hanPieces);
  return {
    whole: terms.filter((term) => [...term].length >= 2 && [...term].length <= 4 && (isWord(term) || title.has(term))),
    single: new Set([...terms, ...title].filter((term) => [...term].length === 1)),
  };
}

const report: { lesson: number; where: string; flags: Flag[] }[] = [];

// ---------- review patches (--patch file) ----------

interface NewWord { traditional: string; pinyin: string; simplified?: string }
type Patch =
  | { lesson: number; op: 'words'; target: string; cell?: number; from: string; to: NewWord[] }
  | { lesson: number; op: 'english'; target: string; english: string }
  | { lesson: number; op: 'cells'; target: string; cells: NewWord[][]; english?: string }
  | { lesson: number; op: 'field'; target: string; field: 'titleEnglish' | 'learnerPromise' | 'pattern'; value: string }
  | {
    lesson: number; op: 'reading'; target: string; paragraph?: number;
    field: 'pinyin' | 'simplified' | 'english' | 'title' | 'setting'; find: string | string[]; replace: string;
  }
  | { lesson: number; op: 'card-example'; target: string; find: string | string[]; replace: string };

const PATCH = arg('patch');
const patchProblems: string[] = [];

function toWords(list: NewWord[], idPrefix: string): GrammarWordToken[] {
  return list.map((w, i) => ({
    id: `${idPrefix}-w${i + 1}`, traditional: w.traditional, simplified: w.simplified ?? simplifiedOf(w.traditional, undefined),
    pinyin: w.pinyin, meaning: '',
  }));
}

/** Replaces the words spelling `from` (no punctuation inside) with `to`; the edges keep their prefix and suffix. */
function replaceSpan(words: GrammarWordToken[], from: string, to: NewWord[], where: string): GrammarWordToken[] | null {
  if (to.map((w) => w.traditional).join('') !== from) {
    patchProblems.push(`${where}: new words "${to.map((w) => w.traditional).join('|')}" do not spell "${from}"`);
    return null;
  }
  for (let i = 0; i < words.length; i++) {
    let text = '';
    for (let j = i; j < words.length; j++) {
      if (j > i && (words[j].prefix || words[j - 1].suffix)) break;
      text += words[j].traditional;
      if (text === from) {
        const replaced = to.map((w, k) => ({
          id: '', traditional: w.traditional, simplified: w.simplified ?? simplifiedOf(w.traditional, undefined), pinyin: w.pinyin, meaning: '',
          ...(k === 0 && words[i].prefix ? { prefix: words[i].prefix } : {}),
          ...(k === to.length - 1 && words[j].suffix ? { suffix: words[j].suffix } : {}),
        }));
        // Simplified of an unchanged word stays as it was.
        replaced.forEach((w, k) => {
          if (to[k].simplified) return;
          const old = words.slice(i, j + 1).find((o) => o.traditional === w.traditional);
          if (old?.simplified) w.simplified = old.simplified;
        });
        return [...words.slice(0, i), ...replaced, ...words.slice(j + 1)];
      }
      if (!from.startsWith(text)) break;
    }
  }
  patchProblems.push(`${where}: no run of words spells "${from}"`);
  return null;
}

const renumber = (words: GrammarWordToken[], idPrefix: string) => words.forEach((w, i) => { w.id = `${idPrefix}-w${i + 1}`; });

function applyPatches(lesson: number, data: Record<string, { grammarPages?: Page[] }>, patches: Patch[]) {
  const pages = Object.values(data).flatMap((part) => part?.grammarPages ?? []);
  for (const patch of patches.filter((p) => p.lesson === lesson)) {
    const where = `L${lesson} ${patch.target}`;
    const page = pages.find((p) => p.id === patch.target);
    const example = pages.flatMap((p) => p.examples).find((e) => e.id === patch.target);
    const row = pages.flatMap((p) => p.patternRows ?? []).find((r) => r.id === patch.target);
    if (patch.op === 'field') {
      if (!page) { patchProblems.push(`${where}: no page`); continue; }
      (page as unknown as Record<string, string>)[patch.field] = patch.value;
    } else if (patch.op === 'english') {
      if (example) example.text.english = patch.english;
      else if (row) row.english = patch.english;
      else patchProblems.push(`${where}: no example or row`);
    } else if (patch.op === 'words') {
      if (example) {
        const next = replaceSpan(example.text.words ?? [], patch.from, patch.to, where);
        if (!next) continue;
        renumber(next, example.id);
        example.text.words = next;
        Object.assign(example.text, assemble(next));
      } else if (row) {
        const groups = row.columns ?? [row.subject ?? [], row.grammar ?? [], row.complement ?? []];
        const index = (patch.cell ?? 1) - 1;
        const next = replaceSpan(groups[index] ?? [], patch.from, patch.to, `${where} c${index + 1}`);
        if (!next) continue;
        renumber(next, `${row.id}-c${index + 1}`);
        groups[index] = next;
        const mirrored = !row.columns || [row.subject, row.grammar, row.complement].some((slot) => slot?.length);
        if (row.columns) row.columns = groups;
        if (mirrored) [row.subject, row.grammar, row.complement] = [groups[0] ?? [], groups[1] ?? [], groups[2] ?? []];
      } else patchProblems.push(`${where}: no example or row`);
    } else if (patch.op === 'reading' || patch.op === 'card-example') {
      continue; // readings and card examples take theirs in --readings / --vocab-examples mode
    } else if (patch.op === 'cells') {
      if (!row) { patchProblems.push(`${where}: no row`); continue; }
      const groups = patch.cells.map((cell, c) => toWords(cell, `${row.id}-c${c + 1}`));
      const mirrored = !row.columns || [row.subject, row.grammar, row.complement].some((slot) => slot?.length);
      if (row.columns || groups.length !== 3) row.columns = groups;
      if (mirrored) [row.subject, row.grammar, row.complement] = [groups[0] ?? [], groups[1] ?? [], groups[2] ?? []];
      if (patch.english) row.english = patch.english;
    }
  }
}

/**
 * A reading fix replaces one exact piece of a paragraph's field (or the reading's title/setting). A fix whose
 * replacement is already there counts as applied, so fixes can be re-applied after every rebuild.
 */
function applyReadingFixes(readings: ReadingRecord[], fixes: Patch[]) {
  for (const fix of fixes) {
    if (fix.op !== 'reading' || (ONLY_LESSON && fix.lesson !== ONLY_LESSON)) continue;
    const where = `${fix.target}${fix.paragraph ? ` p${fix.paragraph}` : ''} ${fix.field}`;
    const reading = readings.find((r) => r.id === fix.target);
    const owner = (fix.paragraph ? reading?.paragraphs[fix.paragraph - 1] : reading) as Record<string, string> | undefined;
    const value = owner?.[fix.field];
    if (typeof value !== 'string') { patchProblems.push(`${where}: not found`); continue; }
    // `find` may list every wrong form the rebuild can produce (垃圾箱: lājīxiāng, or lè sè xiāng once hinted).
    const finds = Array.isArray(fix.find) ? fix.find : [fix.find];
    const find = finds.find((f) => value.includes(f)) ?? finds[0];
    const at = value.indexOf(find);
    const applied = fix.replace.includes(find) ? value.includes(fix.replace) : at < 0 && value.includes(fix.replace);
    if (applied) continue;
    if (at >= 0 && value.indexOf(find, at + 1) < 0) owner![fix.field] = value.slice(0, at) + fix.replace + value.slice(at + find.length);
    else patchProblems.push(`${where}: "${find}" ${at < 0 ? 'missing' : 'occurs more than once'}`);
  }
}

const patches: Patch[] | null = PATCH ? JSON.parse(readFileSync(PATCH, 'utf8')) as Patch[] : null;
// Reviewed fixes (a word the lookup splits wrongly, a better English line) are re-applied after every rebuild.
const FIXES_PATH = resolve(ROOT, `scripts/content/grammarFixes-book${BOOK}.json`);
const fixes: Patch[] = existsSync(FIXES_PATH) ? JSON.parse(readFileSync(FIXES_PATH, 'utf8')) as Patch[] : [];

// ---------- readings (--readings): the same pinyin and simplified rules for content/readings/book-N.json ----------

if (args.includes('--readings')) {
  const path = resolve(ROOT, `content/readings/book-${BOOK}.json`);
  const raw = readFileSync(path, 'utf8');
  const readingsData = JSON.parse(raw) as ReadingRecord[];
  const noFocus = { whole: [] as string[], single: new Set<string>() };
  for (const reading of readingsData) {
    if (ONLY_LESSON && reading.lessonId !== ONLY_LESSON) continue;
    reading.paragraphs.forEach((paragraph, index) => {
      const oldPinyin = paragraph.pinyin === 'TODO' ? '' : paragraph.pinyin ?? '';
      const oldSimplified = paragraph.simplified === 'TODO' ? '' : paragraph.simplified ?? '';
      const built = build(paragraph.traditional, oldPinyin, oldSimplified, `${reading.id}-p${index + 1}`, noFocus);
      paragraph.pinyin = built.pinyin;
      paragraph.simplified = built.simplified;
      report.push({ lesson: reading.lessonId, where: `${reading.id} p${index + 1}`, flags: built.flags });
    });
  }
  applyReadingFixes(readingsData, patches ?? fixes);
  patchProblems.forEach((problem) => console.log(`  fix not applied: ${problem}`));
  const out = `${JSON.stringify(readingsData, null, 2)}\n`;
  if (WRITE && out !== raw && !patchProblems.length) writeFileSync(path, out, 'utf8');
  const counts = new Map<string, number>();
  for (const entry of report) for (const flag of entry.flags) counts.set(flag.kind, (counts.get(flag.kind) ?? 0) + 1);
  console.log(`Book ${BOOK} readings: ${report.length} paragraphs${WRITE ? ' written' : ' (dry run)'}.`);
  console.log([...counts].sort((x, y) => y[1] - x[1]).map(([kind, n]) => `${kind} ${n}`).join(', '));
  if (REPORT) writeFileSync(REPORT, `${JSON.stringify(report.filter((entry) => entry.flags.length), null, 1)}\n`, 'utf8');
  process.exit(patchProblems.length ? 1 : 0);
}

// ---------- word-card examples (--vocab-examples): the same pinyin rules for content/vocabulary/book-N-examples.json ----------

if (args.includes('--vocab-examples')) {
  const path = resolve(ROOT, `content/vocabulary/book-${BOOK}-examples.json`);
  const raw = readFileSync(path, 'utf8');
  const examples = JSON.parse(raw) as Record<string, { chinese: string; pinyin?: string; english?: string }>;
  const { items } = JSON.parse(readFileSync(resolve(ROOT, `public/data/vocabulary/book-${BOOK}.json`), 'utf8')) as {
    items: { id: string; traditional: string }[];
  };
  const wordOf = new Map(items.map((item) => [item.id, item.traditional.split('/').flatMap(expandOptional)]));
  for (const [id, example] of Object.entries(examples)) {
    const lesson = Number(id.match(/^B\dL(\d+)/)?.[1]);
    if (ONLY_LESSON && lesson !== ONLY_LESSON) continue;
    // The card's own word stays one block, so it reads exactly as the card.
    const whole = (wordOf.get(id) ?? []).filter((form) => example.chinese.includes(form));
    // Cards keep both turns on one line ("A:… B:…"); the builder reads a label only at the start of a line.
    const turns = example.chinese.replace(/\s+(?=[A-D][:：])/g, '\n');
    const built = build(turns, example.pinyin ?? '', '', id, { whole, single: new Set() });
    example.pinyin = built.pinyin.replace(/\n/g, ' ');
    report.push({ lesson, where: id, flags: built.flags });
  }
  // Reviewed fixes for a card example's pinyin: { op: "card-example", target: <card id>, find, replace }.
  for (const fix of (patches ?? fixes).filter((f) => f.op === 'card-example')) {
    const example = examples[fix.target];
    const finds = Array.isArray(fix.find) ? fix.find : [fix.find];
    const find = finds.find((f) => example?.pinyin?.includes(f));
    if (example?.pinyin?.includes(fix.replace) && !find) continue;
    if (!example?.pinyin || !find) { patchProblems.push(`${fix.target} card example: "${finds[0]}" missing`); continue; }
    example.pinyin = example.pinyin.replace(find, fix.replace);
  }
  patchProblems.forEach((problem) => console.log(`  fix not applied: ${problem}`));
  const out = `${JSON.stringify(examples, null, 2)}\n`;
  if (WRITE && out !== raw) writeFileSync(path, out, 'utf8');
  const counts = new Map<string, number>();
  for (const entry of report) for (const flag of entry.flags) counts.set(flag.kind, (counts.get(flag.kind) ?? 0) + 1);
  console.log(`Book ${BOOK} card examples: ${report.length} sentences${WRITE ? ' written' : ' (dry run)'}; run npm run vocab:examples next.`);
  console.log([...counts].sort((x, y) => y[1] - x[1]).map(([kind, n]) => `${kind} ${n}`).join(', '));
  if (REPORT) writeFileSync(REPORT, `${JSON.stringify(report.filter((entry) => entry.flags.length), null, 1)}\n`, 'utf8');
  process.exit(0);
}

for (let lesson = 1; lesson <= 16; lesson++) {
  if (ONLY_LESSON && lesson !== ONLY_LESSON) continue;
  const path = resolve(ROOT, `content/grammar/b${BOOK}Lesson${NUMS[lesson - 1]}.json`);
  const raw = readFileSync(path, 'utf8');
  const data = JSON.parse(raw) as Record<string, { grammarPages?: Page[] }>;
  if (patches) {
    applyPatches(lesson, data, patches);
    const out = `${JSON.stringify(data, null, 2)}\n`;
    if (WRITE && out !== raw) writeFileSync(path, out, 'utf8');
    continue;
  }
  for (const part of Object.values(data)) {
    for (const page of part?.grammarPages ?? []) {
      const authored = focusWords(page);
      for (const example of page.examples) {
        const t = example.text;
        const built = build(t.traditional, t.pinyin ?? '', t.simplified ?? '', example.id, authored);
        t.words = built.words;
        t.simplified = built.simplified;
        t.pinyin = built.pinyin;
        if (t.english) t.english = englishByTurn(t.english, built.turns, built.flags);
        report.push({ lesson, where: `${page.id} ${example.id}`, flags: built.flags });
      }
      for (const row of page.patternRows ?? []) {
        const groups = row.columns ?? [row.subject ?? [], row.grammar ?? [], row.complement ?? []];
        const rebuilt = groups.map((cell, c) => {
          // A cell with Latin labels (對 + person) keeps its blocks; only their simplified is brought in line.
          if (!cell.length || cell.some((token) => /[A-Za-z]/.test(token.traditional))) {
            return cell.map((token) => (HAN.test(token.traditional)
              ? { ...token, simplified: simplifiedOf(token.traditional, token.simplified) } : token));
          }
          const text = cell.map((token) => `${token.prefix ?? ''}${token.traditional}${token.suffix ?? ''}`).join('');
          const oldPinyin = cell.map((token) => token.pinyin).join(' ');
          const oldSimp = cell.map((token) => `${token.prefix ?? ''}${token.simplified ?? token.traditional}${token.suffix ?? ''}`).join('');
          const built = build(text, oldPinyin, oldSimp, `${row.id}-c${c + 1}`, authored);
          report.push({ lesson, where: `${page.id} ${row.id} c${c + 1}`, flags: built.flags });
          return built.words;
        });
        // Rows with `columns` keep their old three slots as they were (empty ones stay empty).
        const mirrored = !row.columns || [row.subject, row.grammar, row.complement].some((slot) => slot?.length);
        if (row.columns) row.columns = rebuilt;
        if (mirrored) [row.subject, row.grammar, row.complement] = [rebuilt[0] ?? [], rebuilt[1] ?? [], rebuilt[2] ?? []];
      }
    }
  }
  applyPatches(lesson, data, fixes);
  const out = `${JSON.stringify(data, null, 2)}\n`;
  if (WRITE && out !== raw) writeFileSync(path, out, 'utf8');
}

if (fixes.length && !patches) {
  const inScope = fixes.filter((fix) => fix.op !== 'reading' && fix.op !== 'card-example'
    && (!ONLY_LESSON || fix.lesson === ONLY_LESSON)).length;
  console.log(`Re-applied ${inScope - patchProblems.length} of ${inScope} reviewed fixes.`);
  patchProblems.forEach((problem) => console.log(`  not applied: ${problem}`));
  if (patchProblems.length) process.exit(1);
}

if (patches) {
  console.log(`Applied ${patches.length - patchProblems.length} of ${patches.length} patches${WRITE ? '' : ' (dry run)'}.`);
  patchProblems.forEach((problem) => console.log(`  not applied: ${problem}`));
  process.exit(patchProblems.length ? 1 : 0);
}

const counts = new Map<string, number>();
for (const entry of report) for (const flag of entry.flags) counts.set(flag.kind, (counts.get(flag.kind) ?? 0) + 1);
console.log(`Book ${BOOK}${ONLY_LESSON ? ` lesson ${ONLY_LESSON}` : ''}: ${report.length} texts rebuilt${WRITE ? ' and written' : ' (dry run)'}.`);
console.log([...counts].sort((a, b) => b[1] - a[1]).map(([kind, n]) => `${kind} ${n}`).join(', '));
if (REPORT) writeFileSync(REPORT, `${JSON.stringify(report.filter((entry) => entry.flags.length), null, 1)}\n`, 'utf8');
