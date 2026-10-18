/**
 * Book exercises shown after a grammar page ("Practice"). Authored per lesson in
 * `content/grammar-practice/*.json`, keyed by grammar page id, and merged into the
 * grammar pack by `npm run content:export`. Every kind is answered by tapping, never typing.
 */

/**
 * A recording of a sentence, attached by `npm run content:export` (never authored by hand): a clip
 * of the book's own track (`content/audio/grammar_book_clips.json`, with `start`/`end`) or a whole
 * studio-voice file the owner approved by ear (`content/audio/grammar_studio_audio.json`).
 */
export interface SentenceAudio {
  voice: 'book' | 'studio';
  file: string;
  start?: number;
  end?: number;
}

/** A full sentence shown in feedback or spoken in a chat. */
export interface PracticeSentence {
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  audio?: SentenceAudio;
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
  /** The item's title: its question or task, phrased so it never gives the answer away. Falls back to the book's instruction. */
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
   * Place the words: every slot is a gap between words where a tile could go. A slot that
   * lists a tile is where it belongs; a `slot` (or `placed`) repair says why each other spot is wrong.
   * One tile for a lone particle (吧), several for a frame (快要 and 了, 又 … 又).
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

/**
 * Build the sentence: loose words go onto one free line (no blanks, so the learner can't count
 * the answer). The prompt says what to say. Every accepted order is listed (exactly one unless
 * the grammar really allows two); a `placed` repair says why each wrong tile is wrong.
 */
export interface OrderBuildItem extends PracticeItemBase {
  kind: 'order-build';
  scene?: PracticeScene;
  tiles: PracticeTile[];
  accepted: ChatAnswer[];
  repairs?: PracticeRepair[];
  fallbackRepair: string;
}

/** A stretch of a book dialogue track: the real recording, never text-to-speech. */
export interface ListenClip {
  /** The dialogue (a reading id) and the index of the line the clip is cut from, as in `content/dialogueAlignment.json`. */
  reading: string;
  line: number;
  /** The dialogue's track (`audioFile`) and the seconds to play: the spoken words plus a little silence either side. */
  file: string;
  start: number;
  end: number;
}

/**
 * Listen, then build: the learner hears a stretch of a book dialogue and builds what was said on
 * the free line, exactly as in `order-build`. The title is the task ("Build what you hear") and no
 * Chinese shows before the answer. Exactly one order is right: the one that was said.
 */
export interface ListenBuildItem extends PracticeItemBase, Pick<OrderBuildItem, 'tiles' | 'accepted' | 'repairs' | 'fallbackRepair'> {
  kind: 'listen-build';
  clip: ListenClip;
}

/** One tappable word of a sentence a friend wrote; `tail` is punctuation that stays after it. */
export interface SpotChunk extends PracticeText {
  tail?: string;
}

/**
 * Spot the mistake: tap the wrong word in a written sentence, then choose its fix from the
 * dock (a replacement tile, or "Take it out", which is always offered so it never hints).
 * Wrong replacements explain themselves through `placed` repairs.
 */
export interface SpotFixItem extends PracticeItemBase {
  kind: 'spot-fix';
  chunks: SpotChunk[];
  /** Index of the wrong chunk. */
  wrong: number;
  /** The replacement that fixes it (a tile's `traditional`). Leave out when the fix is taking the word out. */
  fix?: string;
  /** Replacements offered, the right one included when `fix` is set. */
  tiles: PracticeTile[];
  repairs?: PracticeRepair[];
  /** Said when the learner takes out a word that needed swapping (required when `fix` is set). */
  takeOutNote?: string;
  /** Said when the learner taps a word that is fine: the rule, without naming the wrong word. */
  hint: string;
  /** The corrected sentence, shown on a right answer. */
  result: PracticeSentence;
  successNote?: string;
}

/** A line to answer, with what its reply needs (said when a wrong reply is picked). */
export interface MatchLine {
  sentence: PracticeSentence;
  note: string;
}

/** One reply. `answers` is the index of the line it answers; a reply with none is a trap that fits no line. */
export interface MatchReply {
  sentence: PracticeSentence;
  answers?: number;
  /** Why a trap fits no line. */
  note?: string;
}

/** Match the pair: each line is answered by exactly one reply, shown in the order given. */
export interface MatchPairsItem extends PracticeItemBase {
  kind: 'match-pairs';
  lines: MatchLine[];
  replies: MatchReply[];
  /** The one-line takeaway shown when every pair is matched. */
  successNote?: string;
}

export interface SortGroup {
  /** Plain English name of the group. */
  label: string;
  /** The pattern in Chinese, shown under the label. */
  pattern?: PracticeText;
}

export interface SortCard {
  sentence: PracticeSentence;
  /** Index of the group it belongs to. */
  group: 0 | 1;
  /** Why it belongs there; said when the other group is chosen. */
  note: string;
}

/** Sort by use: one sentence at a time goes into one of two groups. Cards come in the order given. */
export interface SortGroupsItem extends PracticeItemBase {
  kind: 'sort-groups';
  groups: [SortGroup, SortGroup];
  cards: SortCard[];
  /** The one-line takeaway shown when every sentence is sorted. */
  successNote?: string;
}

export interface StoryStep extends PracticeSentence {
  /** Why this step sits where it does; said when the wrong step is put there. */
  note: string;
}

/** Story order: tap short sentences in the order they happen. `steps` are shown as given; `answer` lists their indexes in the right order. */
export interface StoryOrderItem extends PracticeItemBase {
  kind: 'story-order';
  steps: StoryStep[];
  answer: number[];
  /** The one-line takeaway shown on a right answer. */
  successNote?: string;
}

export type PracticeItem =
  | SlotBuildItem | SlotReelsItem | ChatBuildItem
  | OrderBuildItem | ListenBuildItem | SpotFixItem | MatchPairsItem | SortGroupsItem | StoryOrderItem;
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
