/**
 * One dictionary entry per (word, reading): the single owner of which course
 * card teaches which dictionary reading, how a word's readings are ordered, and
 * what the word page and the search row show for a reading. The search index
 * build, the course lookup pack and the word page all use these rules, so a
 * list row and the page it opens always describe the same reading.
 */
import type { Flashcard } from '../../data/flashcards';
import { pronunciationKey } from '../pinyin/pronunciationMatching';
import { cleanVocabText } from './vocabCleaner';
import { splitCourseMeasureWords } from './measureWords';
import {
  definitionStrings,
  extractCedictReference,
  isReferenceOnlyDefinitions,
  sanitizeDictionaryDefinitions,
  type MeasureWordDetail,
} from './dictionaryDefinitions';
import { posTagsKey } from './dictionarySearch';
import { formatPosLabel } from './posLabels';
import type { SenseExampleRow } from '../packValidators';

/** Looks up a reading's word-type tags in the pack by `posTagsKey`. */
export type PosTagLookup = (key: string) => string | undefined;

export interface DictionaryRowLike {
  id: number;
  traditional: string;
  simplified?: string;
  pinyin_accented?: string | null;
  definitions?: unknown;
}

/** Reading identity: "zhang3", "ren2 jia5"; non-pinyin readings (letters, names) lowercased. */
export function readingKey(pinyin: string | null | undefined): string {
  if (!pinyin?.trim()) return '';
  return pronunciationKey(pinyin) ?? pinyin.toLowerCase().normalize('NFC').replace(/\s+/g, ' ').trim();
}

const toneless = (key: string) => key.replace(/[1-5]/g, '');

/** The word a course card teaches, by its traditional form. */
export function courseWordOf(card: Pick<Flashcard, 'front' | 'traditional'>): string {
  return cleanVocabText(card.traditional || card.front || '');
}

/** Every reading a card lists ("hé/hàn" → he2, han4). */
function cardReadingKeys(card: Pick<Flashcard, 'pinyin'>): string[] {
  return (card.pinyin ?? '').split('/').map(readingKey).filter(Boolean);
}

const byLesson = (a: Flashcard, b: Flashcard) => a.bookId - b.bookId || a.lessonId - b.lessonId;

/**
 * Which reading of one word each course card teaches. `rows` are the
 * dictionary rows whose traditional form is the word, never rows reached
 * through a shared simplified form (咊 and 和 share 和). A card takes the row
 * with its exact reading; else the one reading with the same syllables
 * (Taiwan tones: 星期 xīngqí ↔ xīngqī); else the word's only reading
 * (垃圾 lèsè ↔ lājī). Cards per reading key, earliest lesson first.
 */
export function linkCourseReadings(rows: readonly DictionaryRowLike[], cards: readonly Flashcard[]): Map<string, Flashcard[]> {
  const keys = [...new Set(rows.map((row) => readingKey(row.pinyin_accented)).filter(Boolean))];
  const contentKeys = [...new Set(rows
    .filter((row) => !isReferenceOnlyDefinitions(row.definitions))
    .map((row) => readingKey(row.pinyin_accented))
    .filter(Boolean))];
  const links = new Map<string, Flashcard[]>();
  for (const card of [...cards].sort(byLesson)) {
    const cardKeys = cardReadingKeys(card);
    // A card that lists two readings (那 nà/nèi) teaches both.
    let targets = keys.filter((key) => cardKeys.includes(key));
    if (targets.length === 0) {
      const sameSyllables = contentKeys.filter((key) => cardKeys.some((cardKey) => toneless(cardKey) === toneless(key)));
      if (sameSyllables.length === 1) targets = sameSyllables;
    }
    if (targets.length === 0 && contentKeys.length === 1) targets = contentKeys;
    for (const target of targets) links.set(target, [...(links.get(target) ?? []), card]);
  }
  return links;
}

/** Course cards per dictionary row id, for one word (search tags and the course lookup pack). */
export function courseCardsByRow(rows: readonly DictionaryRowLike[], cards: readonly Flashcard[]): Map<number, Flashcard[]> {
  const links = linkCourseReadings(rows, cards);
  const byRow = new Map<number, Flashcard[]>();
  for (const row of rows) {
    const linked = links.get(readingKey(row.pinyin_accented));
    if (linked) byRow.set(row.id, linked);
  }
  return byRow;
}

/**
 * A word's readings in display order: course readings by lesson, then the
 * Taiwan reading order (`taiwanReadings`, primary first), then readings with
 * a meaning before cross-reference stubs, then dictionary order.
 */
export function orderReadingKeys(
  rows: readonly DictionaryRowLike[],
  links: ReadonlyMap<string, readonly Flashcard[]>,
  taiwanReadings: readonly string[] = [],
): string[] {
  const keys = [...new Set(rows.map((row) => readingKey(row.pinyin_accented)).filter(Boolean))];
  const taiwan = taiwanReadings.map(readingKey);
  const stub = new Set(keys.filter((key) => rows
    .filter((row) => readingKey(row.pinyin_accented) === key)
    .every((row) => isReferenceOnlyDefinitions(row.definitions))));
  const lessonRank = (key: string) => {
    const first = links.get(key)?.[0];
    return first ? first.bookId * 100 + first.lessonId : Number.POSITIVE_INFINITY;
  };
  const taiwanRank = (key: string) => {
    const index = taiwan.indexOf(key);
    return index === -1 ? taiwan.length : index;
  };
  return keys
    .map((key, order) => ({ key, order }))
    .sort((a, b) => lessonRank(a.key) - lessonRank(b.key)
      || taiwanRank(a.key) - taiwanRank(b.key)
      || Number(stub.has(a.key)) - Number(stub.has(b.key))
      || a.order - b.order)
    .map(({ key }) => key);
}

export interface EntryExample {
  chinese: string;
  pinyin: string;
  english: string;
  audio?: NonNullable<Flashcard['examples']>[number]['audio'];
  /** Tatoeba credit ("#<id> (author) & #<id> (author)") for sentences from there. */
  credit?: string;
}

/** Per-reading extras looked up by `posTagsKey`: word types, and one example per word type. */
export interface EntryLookups {
  posTags?: PosTagLookup;
  senseExamples?: (key: string) => readonly SenseExampleRow[] | undefined;
}

/** Puts each example under its meaning, at most one per word type, never where the book already shows one. */
function attachExamples(groups: EntrySenseGroup[], rows: readonly SenseExampleRow[]): void {
  for (const [text, chinese, pinyin, english, audio, credit] of rows) {
    const group = groups.find((item) => item.senses.some((sense) => sense.text === text));
    if (!group || group.senses.some((sense) => sense.example)) continue;
    const sense = group.senses.find((item) => item.text === text)!;
    sense.example = { chinese, pinyin, english, ...(audio ? { audio: audio as EntryExample['audio'] } : {}), ...(credit ? { credit } : {}) };
  }
}

export interface EntrySense {
  text: string;
  /** The course's everyday gloss, for learners who chose simple definitions. */
  simple?: string;
  /** The lesson that teaches this sense. */
  course?: { bookId: number; lessonId: number };
  example?: EntryExample;
  /** A pointer sense ("variant of 和"): the word it points to. */
  ref?: { word: string; pinyin?: string };
}

export interface EntrySenseGroup {
  /** Course part-of-speech code ("Vs", "Vst/Adv"); null for dictionary senses, which carry none. */
  pos: string | null;
  senses: EntrySense[];
}

export interface EntryReading {
  key: string;
  /** Display reading: the course's (Taiwan) reading when a lesson teaches it. */
  pinyin: string;
  cards: Flashcard[];
  groups: EntrySenseGroup[];
  measureWords: MeasureWordDetail[];
  /** Only pointer senses ("used in 嗎啡"). */
  reference: boolean;
  /** The headline meaning for this reading (search row and hero). */
  headline: string;
}

export interface WordEntry {
  word: string;
  simplified: string;
  readings: EntryReading[];
}

/** Lowercased gloss parts without notes, for "is this dictionary sense already taught?". */
function glossParts(text: string, keepQualifiers = false): string[] {
  // Book notes ("with (someone)") never change the sense; a dictionary sense's trailing
  // qualifier does ("long (in time)" is not "long"), only its leading label ("(bound form)") goes.
  const plain = keepQualifiers ? text.replace(/^(?:\s*\([^)]*\))+/, ' ') : text.replace(/\([^)]*\)/g, ' ');
  return plain
    .toLowerCase()
    .split(/[;,/]/)
    .map((part) => part.replace(/^\s*(?:to|an?|the)\s+/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** The course meaning a search row or hero shows: the book's wording without its measure-word note. */
export function courseMeaning(card: Pick<Flashcard, 'back'>): string {
  return splitCourseMeasureWords(card.back.trim()).meaning;
}

function exampleOf(card: Flashcard): EntryExample | undefined {
  const example = card.examples?.find((item) => !item.fromText) ?? card.examples?.[0];
  return example ? { chinese: example.chinese, pinyin: example.pinyin, english: example.english, audio: example.audio } : undefined;
}

export interface DictionarySense {
  text: string;
  /** A pointer sense ("variant of 和"): the word it points to. */
  ref?: { word: string; pinyin?: string };
}

/**
 * One reading's dictionary senses in dictionary order: what the word page
 * lists (before it drops senses the book already teaches) and what word-type
 * tags are keyed on. Surnames are left out; measure words are collected.
 */
export function readingDictionarySenses(rows: readonly DictionaryRowLike[]): { senses: DictionarySense[]; measureWords: MeasureWordDetail[] } {
  const senses: DictionarySense[] = [];
  const measureWords: MeasureWordDetail[] = [];
  for (const row of rows) {
    for (const raw of definitionStrings(row.definitions)) {
      // Surnames mean nothing to a learner (the cleaner drops them from whole lists too).
      if (/^surname\b/i.test(raw.trim())) continue;
      const sanitized = sanitizeDictionaryDefinitions([raw], { preferredScript: 'traditional' });
      for (const detail of sanitized.measure_word_details) {
        if (!measureWords.some((item) => item.char === detail.char)) measureWords.push(detail);
      }
      const text = sanitized.definitions[0];
      if (!text || senses.some((sense) => sense.text === text)) continue;
      const reference = extractCedictReference(raw.trim());
      const isPointer = Boolean(reference && raw.trim().length <= reference.raw.length + 2);
      senses.push(isPointer && reference ? { text, ref: { word: reference.traditional, pinyin: reference.pinyin } } : { text });
    }
  }
  return { senses, measureWords };
}

/** A short fingerprint of a reading's senses: word-type tags apply only while the dictionary lists exactly these. */
export function senseChecksum(senses: readonly { text: string }[]): string {
  let hash = 0x811c9dc5;
  for (const char of senses.map((sense) => sense.text).join('\n')) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/** One word type per sense (null for pointer senses), only when the tags were made for exactly these senses. */
export function senseTags(value: string | undefined, senses: readonly { text: string }[]): Array<string | null> | null {
  if (!value) return null;
  const [checksum, list = ''] = value.split('|');
  const tags = list.split(',');
  if (checksum !== senseChecksum(senses) || tags.length !== senses.length) return null;
  return tags.map((tag) => tag || null);
}

/**
 * Dictionary senses grouped by word type, Pleco style. A sense joins the
 * book's group with the same label (長: "long (in time)" under the book's
 * Stative verb), otherwise its own group in the order types first appear;
 * untagged and pointer senses stay last, unlabelled.
 */
function groupBySenseType(groups: EntrySenseGroup[], senses: ReadonlyArray<{ sense: EntrySense; tag: string | null }>): void {
  const untagged: EntrySense[] = [];
  for (const { sense, tag } of senses) {
    if (!tag) { untagged.push(sense); continue; }
    const label = formatPosLabel(tag);
    const group = groups.find((item) => item.pos !== null && formatPosLabel(item.pos) === label);
    if (group) group.senses.push(sense);
    else groups.push({ pos: tag, senses: [sense] });
  }
  if (untagged.length > 0) groups.push({ pos: null, senses: untagged });
}

function buildReading(key: string, rows: readonly DictionaryRowLike[], cards: readonly Flashcard[], { posTags, senseExamples }: EntryLookups = {}): EntryReading {
  const groups: EntrySenseGroup[] = [];
  const { senses: allSenses, measureWords } = readingDictionarySenses(rows);
  const addMeasure = (detail: MeasureWordDetail) => {
    if (!measureWords.some((item) => item.char === detail.char)) measureWords.push(detail);
  };

  const taught = new Set<string>();
  for (const card of cards) {
    const split = splitCourseMeasureWords(card.back.trim());
    split.measureWords.forEach(addMeasure);
    glossParts(split.meaning).forEach((part) => taught.add(part));
    const pos = card.pos?.trim() || null;
    const group = groups.find((item) => item.pos === pos) ?? (() => {
      const created: EntrySenseGroup = { pos, senses: [] };
      groups.push(created);
      return created;
    })();
    if (group.senses.some((sense) => sense.text === split.meaning)) continue;
    const simple = card.simple?.trim() ? splitCourseMeasureWords(card.simple.trim()).meaning : undefined;
    group.senses.push({ text: split.meaning, ...(simple ? { simple } : {}), course: { bookId: card.bookId, lessonId: card.lessonId }, example: exampleOf(card) });
  }

  const referenceOnly = rows.length > 0 && rows.every((row) => isReferenceOnlyDefinitions(row.definitions));
  // Word types are keyed on the full sense list; senses the book already teaches are then left out.
  const lookupKey = posTagsKey(rows[0]?.traditional ?? '', rows[0]?.pinyin_accented);
  const tags = senseTags(posTags?.(lookupKey), allSenses);
  const dictionarySenses = allSenses
    .map((sense, index) => ({ sense: sense as EntrySense, tag: tags?.[index] ?? null }))
    .filter(({ sense }) => {
      const parts = glossParts(sense.text, true);
      return !(parts.length > 0 && parts.every((part) => taught.has(part)));
    });
  groupBySenseType(groups, dictionarySenses);
  attachExamples(groups, senseExamples?.(lookupKey) ?? []);

  const firstCard = cards[0];
  const rowPinyin = rows.find((row) => row.pinyin_accented)?.pinyin_accented ?? '';
  const pinyin = firstCard?.pinyin
    ? firstCard.pinyin.split('/').find((reading) => readingKey(reading) === key) ?? firstCard.pinyin.split('/')[0]
    : rowPinyin;
  const headline = groups[0]?.senses.find((sense) => !sense.ref)?.text ?? groups[0]?.senses[0]?.text ?? '';
  return { key, pinyin: pinyin.trim(), cards: [...cards], groups, measureWords, reference: referenceOnly && cards.length === 0, headline };
}

/**
 * The word page's entry: every reading of `word`, each with its course senses
 * first (grouped by the book's part of speech, with the lesson and example)
 * and then the dictionary's remaining senses. `rows` may include rows reached
 * through a shared simplified form; only rows of `word` itself are used, so a
 * variant (咊) never borrows the main word's (和) lessons.
 */
export function buildWordEntry(
  word: string,
  rows: readonly DictionaryRowLike[],
  cards: readonly Flashcard[],
  taiwanReadings: readonly string[] = [],
  lookups: EntryLookups = {},
): WordEntry | null {
  const own = rows.filter((row) => row.traditional === word);
  // A simplified spelling ("长") opens its traditional word.
  const traditional = own.length > 0 ? word : rows.find((row) => !isReferenceOnlyDefinitions(row.definitions))?.traditional ?? rows[0]?.traditional;
  if (!traditional) return null;
  const wordRows = rows.filter((row) => row.traditional === traditional);
  const wordCards = cards.filter((card) => courseWordOf(card) === traditional);
  const links = linkCourseReadings(wordRows, wordCards);
  const readings = orderReadingKeys(wordRows, links, taiwanReadings).map((key) =>
    buildReading(key, wordRows.filter((row) => readingKey(row.pinyin_accented) === key), links.get(key) ?? [], lookups));
  return { word: traditional, simplified: wordRows[0]?.simplified ?? traditional, readings };
}

/** A sense as the learner reads it: the course's simple gloss when they chose simple definitions. */
export function senseText(sense: EntrySense, simple = false): string {
  return (simple && sense.simple) || sense.text;
}

/** What a reading means at a glance (hero and search row): the book's sense, else the first dictionary sense. */
export function readingHeadline(reading: EntryReading, simple = false): string {
  const course = reading.groups.flatMap((group) => group.senses).find((sense) => sense.course);
  return course ? senseText(course, simple) : reading.headline;
}

/**
 * What a search row says a word means: the lesson's meaning (as the word page
 * leads with it), else the dictionary's first two senses. Never every sense run together.
 */
export function searchRowMeaning(row: { courseDefinition?: string; courseSimple?: string; definitions: unknown }, simple = false): string {
  const course = ((simple && row.courseSimple) || row.courseDefinition)?.trim();
  if (course) return splitCourseMeasureWords(course).meaning;
  return definitionStrings(row.definitions).map((text) => text.trim()).filter(Boolean).slice(0, 2).join('; ');
}

/** The reading to lead with: the one a row was opened for, else the first. */
export function pickReading(entry: WordEntry, preferred?: string | null): EntryReading | undefined {
  const key = readingKey(preferred);
  if (key) {
    const exact = entry.readings.find((reading) => reading.key === key || reading.cards.some((card) => cardReadingKeys(card).includes(key)));
    if (exact) return exact;
  }
  return entry.readings[0];
}
