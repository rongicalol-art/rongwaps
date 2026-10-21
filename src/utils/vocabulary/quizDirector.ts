import type { Flashcard } from '../../data/flashcards';
import { normalizeChoiceValue } from './meaningChoices';

/**
 * Plans a mixed vocab quiz round. Every format links a word to its English meaning
 * (hanzi to meaning, audio to meaning, meaning to hanzi); nothing tests pinyin or hanzi alone.
 * Pure and seeded: the same session and deck always produce the same plan.
 */

export type QuizFormat =
  | 'pair-match'
  | 'sound-match'
  | 'pick-meaning'
  | 'listen-pick'
  | 'pick-hanzi'
  | 'true-false'
  | 'word-build';

/** The quiz types a learner can pick before a quiz (Cards done); none picked means Mixed (every format). */
export type QuizTypeId = 'meaning' | 'listen' | 'hanzi' | 'match' | 'true-false' | 'build';

export const QUIZ_TYPE_FORMATS: Readonly<Record<QuizTypeId, readonly QuizFormat[]>> = {
  meaning: ['pick-meaning'],
  listen: ['listen-pick'],
  hanzi: ['pick-hanzi'],
  match: ['pair-match', 'sound-match'],
  'true-false': ['true-false'],
  build: ['word-build'],
};

/** The picker types this word can take: listening needs a recording, building needs a 2-4 character word. */
export function quizTypesFor(card: Flashcard, deck: readonly Flashcard[]): QuizTypeId[] {
  const types: QuizTypeId[] = ['meaning', 'hanzi', 'match', 'true-false'];
  if (card.audio) types.push('listen');
  if (hasWordTiles(card, deckCharacters(deck))) types.push('build');
  return types;
}

/** Picked types keep only the words that fit one of them ([] = Mixed keeps every word). */
export function wordsForQuizTypes(deck: readonly Flashcard[], types: readonly QuizTypeId[]): Flashcard[] {
  if (types.length === 0 || types.some((type) => type !== 'listen' && type !== 'build')) return [...deck];
  const characters = types.includes('build') ? deckCharacters(deck) : [];
  return deck.filter((card) => (types.includes('listen') && card.audio) || (types.includes('build') && hasWordTiles(card, characters)));
}

/** The picker offers only types at least one word can take. */
export function availableQuizTypes(deck: readonly Flashcard[]): Set<QuizTypeId> {
  if (!deck.length) return new Set();
  const types = new Set<QuizTypeId>(['meaning', 'hanzi', 'match', 'true-false']);
  if (deck.some((card) => card.audio)) types.add('listen');
  const characters = deckCharacters(deck);
  if (deck.some((card) => hasWordTiles(card, characters))) types.add('build');
  return types;
}

export interface QuizBeat {
  format: QuizFormat;
  /** The words this beat tests: one, or 3-5 for the match formats. */
  cards: Flashcard[];
  /** Pick formats: the answer plus distractors, shuffled. Match formats: the cards in right-column order. */
  options?: Flashcard[];
  /** true-false: the word whose meaning is shown (the card itself or a distractor). */
  shown?: Flashcard;
  /** word-build: the answer's characters plus distractor characters, shuffled (repeats keep their own tile). */
  tiles?: string[];
}

export interface PlanOptions {
  seed: string;
  /** The learner's past mix-ups (card id -> card ids), used as wrong choices first. */
  confusions?: Readonly<Record<string, readonly string[]>>;
  /** The Cards done handoff word: the first beat is pick-meaning on it. */
  firstCardId?: string;
  reviewPass: boolean;
  /** Other loaded cards: extra distractors. */
  extraCards?: readonly Flashcard[];
  /** Picked quiz types; omitted or empty means every format. A word that fits none of them gets pick-meaning. */
  types?: readonly QuizTypeId[];
  /** How match pairs should be formatted. */
  matchPairType?: 'characters' | 'audio' | 'mixed';
}

export type QuizRng = () => number;

export function createQuizRng(seed: string): QuizRng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: readonly T[], rng: QuizRng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const HANZI = /[\u3400-\u9fff]/;
const hanziChars = (text: string) => Array.from(text).filter((ch) => HANZI.test(ch));
const wordKeys = new WeakMap<Flashcard, { back: string; pinyin?: string; meaning: string; sound: string; toneless: string }>();
function keysFor(card: Flashcard) {
  let keys = wordKeys.get(card);
  if (!keys || keys.back !== card.back || keys.pinyin !== card.pinyin) {
    const sound = normalizeChoiceValue(card.pinyin ?? '', 'pinyin');
    keys = { back: card.back, pinyin: card.pinyin, meaning: normalizeChoiceValue(card.back, 'meaning'), sound,
      toneless: sound.normalize('NFD').replace(/[\u0300-\u036f0-9]/g, '') };
    wordKeys.set(card, keys);
  }
  return keys;
}
const soundKey = (card: Flashcard) => keysFor(card).sound;
const meaningKey = (card: Flashcard) => keysFor(card).meaning;
const tonelessKey = (card: Flashcard) => keysFor(card).toneless;

function deckCharacters(deck: readonly Flashcard[]): string[] {
  return [...new Set(deck.flatMap((card) => hanziChars(card.front)))];
}

function hasWordTiles(card: Flashcard, characters: readonly string[]): boolean {
  if (!canBuildWord(card)) return false;
  let distractors = 0;
  for (const char of characters) if (!card.front.includes(char) && ++distractors === 2) return true;
  return false;
}

function sharedChars(a: Flashcard, b: Flashcard): string[] {
  const inB = new Set(hanziChars(b.front));
  return Array.from(new Set(hanziChars(a.front).filter((ch) => inB.has(ch))));
}

/** Avoid optional forms, aliases, punctuation and long expressions in a spelling task. */
export function canBuildWord(card: Flashcard): boolean {
  return /^[\u3400-\u9fff]{2,4}$/.test(card.front)
    && Boolean(meaningKey(card))
    && !/[()/（）]/.test(`${card.traditional ?? ''}${card.simplified ?? ''}`);
}

/** Two character distractors come only from this deck; a repeated answer character keeps its own tile. */
export function buildWordTiles(card: Flashcard, deck: readonly Flashcard[], rng: QuizRng): string[] | null {
  return wordTiles(card, deckCharacters(deck), rng);
}

function wordTiles(card: Flashcard, characters: readonly string[], rng: QuizRng): string[] | null {
  if (!canBuildWord(card)) return null;
  const answer = Array.from(card.front);
  const answerChars = new Set(answer);
  const pool = characters.filter((char) => !answerChars.has(char));
  if (pool.length < 2) return null;
  return seededShuffle([...answer, ...seededShuffle(pool, rng).slice(0, 2)], rng);
}

// ---------------------------------------------------------------- distractors

export interface DistractorArgs {
  answer: Flashcard;
  /** The main deck; tried before `others`. */
  deck: readonly Flashcard[];
  others?: readonly Flashcard[];
  /** What the choices show: meanings (hanzi/audio prompt) or hanzi (meaning prompt). */
  kind: 'meaning' | 'hanzi';
  count?: number;
  /** The prompt is audio: nothing that sounds the same as the answer may be offered. */
  audioPrompt?: boolean;
  /** Answers of the next beats: only used when nothing else is left. */
  avoidIds?: ReadonlySet<string>;
  /** Words the learner has mixed up with the answer: offered first when they pass the other rules. */
  confusedIds?: readonly string[];
  rng: QuizRng;
}

export function buildQuizDistractors({
  answer, deck, others = [], kind, count = 2, audioPrompt = false, avoidIds, confusedIds = [], rng,
}: DistractorArgs): Flashcard[] {
  const seenIds = new Set<string>([answer.id]);
  const pool = [...seededShuffle(deck, rng), ...seededShuffle(others, rng)].filter((card) => {
    if (seenIds.has(card.id)) return false;
    seenIds.add(card.id);
    return true;
  });

  const answerMeaning = meaningKey(answer);
  const answerSound = soundKey(answer);
  const eligible = pool.filter((card) => {
    if (card.front === answer.front) return false;
    if (meaningKey(card) === answerMeaning || !meaningKey(card)) return false;
    if (audioPrompt && ((answerSound && soundKey(card) === answerSound) || (answer.audio && card.audio === answer.audio))) return false;
    return true;
  });

  const score = (card: Flashcard) => {
    if (confusedIds.includes(card.id)) return 10;
    if (kind !== 'hanzi') return 0;
    return (sharedChars(card, answer).length > 0 ? 4 : 0)
      + (tonelessKey(card) && tonelessKey(card) === tonelessKey(answer) ? 2 : 0)
      + (Array.from(card.front).length === Array.from(answer.front).length ? 1 : 0);
  };
  const ranked = (cards: Flashcard[]) => cards
    .map((card, i) => ({ card, i, s: score(card) }))
    .sort((x, y) => y.s - x.s || x.i - y.i)
    .map((x) => x.card);

  const preferred = ranked(eligible.filter((card) => !avoidIds?.has(card.id)));
  const fallback = ranked(eligible.filter((card) => avoidIds?.has(card.id)));

  const out: Flashcard[] = [];
  const seenValues = new Set<string>();
  for (const card of [...preferred, ...fallback]) {
    const value = kind === 'hanzi' ? card.front : meaningKey(card);
    if (seenValues.has(value)) continue;
    seenValues.add(value);
    out.push(card);
    if (out.length >= count) break;
  }
  return out;
}

// -------------------------------------------------------------------- planner

interface Draft {
  format: QuizFormat;
  cards: Flashcard[];
}

const MATCH_FORMATS: ReadonlySet<QuizFormat> = new Set(['pair-match', 'sound-match']);
const SINGLE_FORMATS: readonly QuizFormat[] = ['pick-meaning', 'listen-pick', 'pick-hanzi', 'true-false', 'word-build'];
const ALL_FORMATS: readonly QuizFormat[] = ['pair-match', 'sound-match', ...SINGLE_FORMATS];

/** Splits n (>= 3) cards into balanced chunks of 3-5. */
function chunkSizes(n: number): number[] {
  const k = Math.ceil(n / 5);
  const base = Math.floor(n / k);
  const extra = n % k;
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0));
}

export function planQuizRound(
  cards: readonly Flashcard[],
  { seed, firstCardId, reviewPass, extraCards = [], confusions = {}, types = [], matchPairType = 'mixed' }: PlanOptions,
): QuizBeat[] {
  const allowed = new Set<QuizFormat>(types.length ? types.flatMap((type) => QUIZ_TYPE_FORMATS[type]) : ALL_FORMATS);
  if (matchPairType === 'characters') allowed.delete('sound-match');
  else if (matchPairType === 'audio') allowed.delete('pair-match');
  const rng = createQuizRng(`${seed}|${reviewPass ? 'review' : 'main'}|${cards.map((c) => c.id).join(',')}`);
  const mainIds = new Set(cards.map((c) => c.id));
  const others = extraCards.filter((c) => !mainIds.has(c.id));

  // Tile distractors may come from the whole loaded deck, so a short review pass can still build words.
  const characters = deckCharacters([...cards, ...others]);
  const tilesFor = (card: Flashcard) => wordTiles(card, characters, createQuizRng(`${seed}|build|${card.id}`));
  /** Every format is open to every word; only the data decides (audio for listening, 2+ characters for building). */
  const canUse = (card: Flashcard, format: QuizFormat) => allowed.has(format) && (
    format === 'sound-match' || format === 'listen-pick' ? Boolean(card.audio)
      : format === 'word-build' ? hasWordTiles(card, characters) : true);
  /** The preferred single format if this word can take it, else another picked one, else pick-meaning. */
  const singleFor = (card: Flashcard, preferred: QuizFormat) =>
    canUse(card, preferred) ? preferred : SINGLE_FORMATS.find((format) => canUse(card, format)) ?? 'pick-meaning';

  // A review pass uses the same picked types as the pass before it; only the handoff lead is first-pass only.
  const drafts: Draft[] = [];
  const found = !reviewPass && firstCardId ? cards.find((c) => c.id === firstCardId) : undefined;
  const first = found && canUse(found, 'pick-meaning') ? found : undefined;
  if (first) drafts.push({ format: 'pick-meaning', cards: [first] });

  /** Cards that join a match chunk keep one per meaning (and sound), so the tiles are unambiguous. */
  const pushMatches = (format: QuizFormat, pool: Flashcard[], fallback: QuizFormat) => {
    const seenMeaning = new Set<string>();
    const seenSound = new Set<string>();
    const usable: Flashcard[] = [];
    for (const card of pool) {
      const dup = seenMeaning.has(meaningKey(card)) || (format === 'sound-match' && soundKey(card) && seenSound.has(soundKey(card)));
      if (dup || pool.length < 3) {
        drafts.push({ format: singleFor(card, fallback), cards: [card] });
      } else {
        seenMeaning.add(meaningKey(card));
        seenSound.add(soundKey(card));
        usable.push(card);
      }
    }
    if (usable.length < 3) {
      usable.forEach((card) => drafts.push({ format: singleFor(card, fallback), cards: [card] }));
      return;
    }
    let at = 0;
    for (const size of chunkSizes(usable.length)) {
      drafts.push({ format, cards: usable.slice(at, at + size) });
      at += size;
    }
  };

  const pairPool: Flashcard[] = [];
  const soundPool: Flashcard[] = [];
  for (const card of cards) {
    if (card === first) continue;
    const open = ALL_FORMATS.filter((format) => canUse(card, format));
    const pick = open.length ? open[Math.floor(rng() * open.length)] : 'pick-meaning';
    if (pick === 'pair-match') pairPool.push(card);
    else if (pick === 'sound-match') soundPool.push(card);
    else drafts.push({ format: pick, cards: [card] });
  }
  pushMatches('pair-match', pairPool, 'pick-meaning');
  pushMatches('sound-match', soundPool, 'listen-pick');

  // Order: the handoff beat first, the rest shuffled, then placed so no format repeats.
  const lead = drafts.filter((d) => first && d.cards[0] === first && d.cards.length === 1 && d.format === 'pick-meaning');
  const leadDraft = lead[0];
  let pending = seededShuffle(drafts.filter((d) => d !== leadDraft), rng);

  const candidatesFor = (draft: Draft): QuizFormat[] => {
    if (MATCH_FORMATS.has(draft.format)) return [draft.format];
    const card = draft.cards[0];
    return [draft.format, ...SINGLE_FORMATS.filter((f) => f !== draft.format && canUse(card, f))];
  };

  const placed: Array<{ draft: Draft; format: QuizFormat }> = [];
  const place = (draft: Draft, format: QuizFormat) => {
    placed.push({ draft, format });
    pending = pending.filter((d) => d !== draft);
  };
  if (leadDraft) place(leadDraft, 'pick-meaning');
  while (pending.length > 0) {
    const prev = placed[placed.length - 1]?.format;
    const preferred = pending.find((d) => candidatesFor(d)[0] !== prev);
    if (preferred) {
      place(preferred, candidatesFor(preferred)[0]);
      continue;
    }
    let swapped = false;
    for (const d of pending) {
      const alt = candidatesFor(d).find((f) => f !== prev);
      if (alt) {
        place(d, alt);
        swapped = true;
        break;
      }
    }
    if (!swapped) place(pending[0], candidatesFor(pending[0])[0]);
  }

  // Build options now that the order is final.
  const answerOrder = placed.map((p) => p.draft.cards.map((c) => c.id));
  return placed.map(({ draft, format }, i) => {
    const beat: QuizBeat = { format, cards: draft.cards };
    if (MATCH_FORMATS.has(format)) {
      beat.options = seededShuffle(draft.cards, rng);
    } else if (format === 'word-build') {
      beat.tiles = tilesFor(draft.cards[0]) ?? undefined;
    } else {
      const card = draft.cards[0];
      const avoidIds = new Set([...(answerOrder[i + 1] ?? []), ...(answerOrder[i + 2] ?? [])]);
      const distractors = buildQuizDistractors({
        answer: card,
        deck: cards,
        others,
        kind: format === 'pick-hanzi' ? 'hanzi' : 'meaning',
        audioPrompt: format === 'listen-pick',
        avoidIds,
        confusedIds: confusions[card.id],
        rng,
      });
      beat.options = seededShuffle([card, ...distractors], rng);
      if (format === 'true-false') {
        const wrong = distractors[0];
        beat.shown = wrong && rng() < 0.5 ? wrong : card;
      }
    }
    return beat;
  });
}

// ---------------------------------------------------------------- measure words

export interface MeasureWord {
  hanzi: string;
  pinyin: string;
}

const MEASURE_NOTE = /\(M:\s*([^\s)a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+)\s*([^)]*)\)/;

/** "book (M: 本běn)" gives 本 běn; the first listed measure word wins. */
export function parseMeasureWord(back: string): MeasureWord | null {
  const match = MEASURE_NOTE.exec(back);
  if (!match) return null;
  const hanzi = match[1].replace(/[,;、/].*$/, '').trim();
  const pinyin = match[2].split(/[,;/]/)[0].trim();
  return hanzi ? { hanzi, pinyin } : null;
}

const FALLBACK_MEASURE_WORDS: MeasureWord[] = [
  { hanzi: '個', pinyin: 'gè' },
  { hanzi: '本', pinyin: 'běn' },
  { hanzi: '朵', pinyin: 'duǒ' },
  { hanzi: '張', pinyin: 'zhāng' },
  { hanzi: '杯', pinyin: 'bēi' },
  { hanzi: '位', pinyin: 'wèi' },
  { hanzi: '支', pinyin: 'zhī' },
  { hanzi: '件', pinyin: 'jiàn' },
];

/** The right measure word plus 2 others: the deck's own measure words first, then a short constant list. */
export function buildMeasureWordChoices(answer: MeasureWord, deckBacks: readonly string[], rng: QuizRng, count = 3): MeasureWord[] {
  const fromDeck = deckBacks.map(parseMeasureWord).filter((m): m is MeasureWord => m !== null);
  const seen = new Set([answer.hanzi]);
  const picks: MeasureWord[] = [];
  for (const m of [...seededShuffle(fromDeck, rng), ...seededShuffle(FALLBACK_MEASURE_WORDS, rng)]) {
    if (seen.has(m.hanzi)) continue;
    seen.add(m.hanzi);
    picks.push(m);
    if (picks.length >= count - 1) break;
  }
  return seededShuffle([answer, ...picks], rng);
}
