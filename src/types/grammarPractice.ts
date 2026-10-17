/**
 * Book exercises shown after a grammar page ("Practice"). Authored per lesson in
 * `content/grammar-practice/*.json`, keyed by grammar page id, and merged into the
 * grammar pack by `npm run content:export`. Every kind is answered by tapping, never typing.
 */

/** A full sentence shown in feedback or spoken in a chat. */
export interface PracticeSentence {
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
}

/** A word or chunk on a tappable tile. Answers match on `traditional`. */
export interface PracticeTile {
  traditional: string;
  simplified?: string;
  pinyin: string;
}

export interface PracticeText {
  traditional: string;
  simplified?: string;
}

/** A place or plan on the route map. `label` is the plain English caption under the pin. */
export interface PracticePlace {
  icon: PracticeIconName;
  label: string;
}

export type PracticeIconName =
  | 'usa' | 'taiwan' | 'home' | 'school' | 'restaurant' | 'library'
  | 'hotel' | 'post' | 'cafe' | 'book';

/** A pin is either fixed or follows a reel's current option. */
export type PracticeRoutePin = PracticePlace | { reel: string };

/** One side of a countdown picture: a calendar day or a clock time, with the book's caption. */
export interface PracticeMoment {
  label?: PracticeGlossEntry;
  date?: { month: number; day: number };
  /** 24-hour "HH:MM". */
  time?: string;
}

/** One person the book shows with a printed name and nationality. */
export interface PracticeCastMember {
  /** left, top, width, height of the picture alone (0–1 fractions of the page). */
  box: [number, number, number, number];
  name: string;
  pinyin: string;
  /** The printed note, e.g. 日本人. */
  note: string;
}

export type PracticeScene =
  | { type: 'route'; from: PracticeRoutePin; to: PracticeRoutePin; purpose?: PracticeRoutePin }
  | { type: 'change'; before: { label: string; value: string }; now: { label: string; value: string } }
  | { type: 'countdown'; now: PracticeMoment; next: PracticeMoment }
  /** One calendar day or clock time with its caption. */
  | { type: 'moment'; moment: PracticeMoment }
  /** The book's month calendar; `highlight` are day numbers. */
  | { type: 'month'; year: number; month: number; highlight: number[] }
  /** A crop of the printed book page (book 1); `box` = left, top, width, height as 0–1 fractions. */
  | { type: 'picture'; page: number; box: [number, number, number, number]; alt: string }
  /** Several pictures side by side, each captioned as printed; the learner reads across them. */
  | { type: 'cast'; page: number; alt: string; people: PracticeCastMember[] };

export type PracticeSegment =
  | ({ type: 'text' } & PracticeText)
  | { type: 'slot'; id: string; answers: string[] };

/** A sentence, or one chat message when the item is a dialogue (any line has a speaker). */
export interface PracticeLine {
  speaker?: PracticeText;
  /** The learner's own message (right-hand bubble). */
  me?: boolean;
  segments: PracticeSegment[];
}

/**
 * Repair notes, checked in order; the first match explains the mistake.
 * `placed`: any of these tiles was used. `slot`: a slot holds this tile.
 * `before`: tile [0] was placed before tile [1]. `notLast`: the answer does not end with this tile.
 * `notFirst`: the answer does not start with this tile.
 */
export interface PracticeRepair {
  placed?: string[];
  slot?: { id: string; tile: string };
  before?: [string, string];
  notLast?: string;
  notFirst?: string;
  note: string;
  /** Feedback heading when the grammar is right but the meaning is not. */
  title?: string;
  /** Tiles to mark wrong; defaults to the wrong slots (or every placed tile in a chat). */
  mark?: string[];
}

export interface PracticeGlossEntry extends PracticeText {
  pinyin: string;
  english: string;
}

interface PracticeItemBase {
  id: string;
  /** The book item it comes from ("p.81 #3"), or "own" for an extra item. */
  source: string;
  /** Short task line above the exercise. Omit when the scene says it all. */
  prompt?: string;
  sub?: string;
  /** Words the book glosses beside its exercise, shown under the line the book prints them after. */
  glossary?: PracticeGlossEntry[];
}

/** Tap tiles into the sentence's slots. */
export interface SlotBuildItem extends PracticeItemBase {
  kind: 'slot-build';
  scene?: PracticeScene;
  lines: PracticeLine[];
  tiles: PracticeTile[];
  repairs?: PracticeRepair[];
  fallbackRepair: string;
  result: PracticeSentence;
  /** The other accepted answers' sentences: feedback shows the one the learner built. */
  alternatives?: PracticeSentence[];
  /**
   * Place the word: one tile, and every slot is a gap between words where it could go.
   * Only the slot that lists it is right; a `slot` repair per wrong gap says why.
   */
  gaps?: boolean;
  successNote?: string;
}

export interface ReelOption extends PracticeTile, Partial<PracticePlace> {
  /** Fills the item's `english` template. */
  english: string;
}

export type ReelRule =
  | { type: 'different'; reels: [string, string]; note: string }
  | { type: 'requires'; reel: string; option: string; other: string; allowed: string[]; note: string };

/** "Write your own sentence": every reel combination the rules allow is right. */
export interface SlotReelsItem extends PracticeItemBase {
  kind: 'slot-reels';
  scene?: PracticeScene;
  segments: Array<({ type: 'text'; pinyin: string } & PracticeText) | { type: 'reel'; id: string; options: ReelOption[] }>;
  /** English with `{reelId}` placeholders. */
  english: string;
  rules: ReelRule[];
}

export interface ChatAnswer {
  order: string[];
  sentence: PracticeSentence;
}

/** One chat turn: the friend writes, you build your reply from tiles in the dock. */
export interface ChatBuildItem extends PracticeItemBase {
  kind: 'chat-build';
  before?: PracticeSentence[];
  tiles: PracticeTile[];
  accepted: ChatAnswer[];
  repairs?: PracticeRepair[];
  fallbackRepair: string;
  after?: PracticeSentence[];
}

export type PracticeItem = SlotBuildItem | SlotReelsItem | ChatBuildItem;
export type PracticeKind = PracticeItem['kind'];

export interface GrammarPractice {
  /** Printed page of the book exercise. */
  bookPage: number;
  /** The book's own instruction, e.g. "Describe the pictures". */
  title: string;
  /** Words outside the taught vocabulary that the book itself prints on this page. */
  allowWords?: string[];
  items: PracticeItem[];
}
