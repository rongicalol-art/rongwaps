/**
 * Teacher-style memory hooks.
 *
 * A character hook names the pieces of a character by stroke range and explains,
 * in one sentence built from the meaning pieces, why the character means what it
 * means. A word hook adds a word's characters up, or says plainly that the word
 * is learned whole.
 */

/** What a piece does in its character. `part` is a shape learned whole, with no known picture. */
export type PieceJob = 'meaning' | 'sound' | 'both' | 'picture' | 'part';

/** Inclusive stroke range, 0-based, in hanzi-writer stroke order. */
export type StrokeRange = [from: number, to: number];

export interface HookPiece {
  /** Teaching name ("bamboo"); for a sound piece, its own reading ("kuài"). */
  name: string;
  /** Typed form, when the piece has one. */
  glyph?: string;
  job: PieceJob;
  strokes: StrokeRange[];
  /** What the learner sees when the shape misleads: "now looks like 月 moon", "shortened here". */
  note?: string;
  /** Reading of a piece that gives both meaning and sound. */
  from?: string;
  /** The reading the piece points to: the character's own. */
  to?: string;
  /** The sound no longer matches today. */
  old?: boolean;
  /** Not a word a learner needs, so the hook leaves it out. */
  rare?: boolean;
  /** A real piece with its own page (a character or radical used elsewhere). */
  real?: boolean;
  /** The whole character is this one piece. */
  whole?: boolean;
}

export interface TeachHook {
  char: string;
  /** Reading in the lesson word that introduces the character. */
  pinyin: string;
  /** The meaning the hook lands on. */
  gloss: string;
  pieces: HookPiece[];
  /** One sentence; `{0|bamboo}` marks the words that name piece 0, `**x**` the meaning. */
  hook: string;
  /** "Good to know" lines, shown behind a closed toggle. */
  more?: string[];
}

export type WordHookKind = 'sum' | 'whole' | 'sound';

export interface WordHookPart {
  /** One or more characters of the word. */
  text: string;
  meaning: string;
  /** `label`: no meaning of its own (a noun ending). `sound`: copies a foreign sound. */
  role?: 'label' | 'sound';
}

export interface WordHook {
  word: string;
  gloss: string;
  parts: WordHookPart[];
  /** `sum`: the parts add up. `whole`: learned whole, with `teach`. `sound`: copies a foreign word. */
  kind: WordHookKind;
  /** The sum read literally, when that helps. */
  lit?: string;
  /** A teacher's plain explanation of a word that does not add up. */
  teach?: string;
  /** "Good to know" line. */
  note?: string;
}

export interface HookPack<T> {
  schemaVersion: number;
  shard: number;
  count: number;
  items: T[];
}

export type TeachHookIndex = Map<string, TeachHook>;
export type WordHookIndex = Map<string, WordHook>;
