import type { SentenceAudio } from './grammarPractice';

/**
 * TOCFL-style lesson tests: authored in `content/lesson-tests/book-N/lessonNN.json`, exported to the
 * `lesson-tests` pack. A lesson is a list of slots in TOCFL order (聽力 first, then 閱讀); each slot holds
 * 2–3 interchangeable versions so a retake shows other questions. Rules: content/lesson-tests/README.md.
 */

export type LessonTestPart = 'listening' | 'reading';
export type LessonTestBand = 'A' | 'B';

/** Chinese text with its reading and meaning (shown after the test, in the Fix round). */
export interface TestText {
  traditional: string;
  simplified: string;
  pinyin: string;
  english: string;
}

/** A spoken line: F and M are the two dialogue voices, N the narrator who reads questions and answers. */
export interface TestLine extends TestText {
  speaker: 'F' | 'M' | 'N';
  /** Attached by the export from the studio receipt (or a book clip); missing only before audio exists. */
  audio?: SentenceAudio;
}

/** One answer choice: a picture (picture questions) or text, spoken when it carries `speaker`. */
export interface TestChoice {
  picture?: string;
  alt?: string;
  traditional?: string;
  simplified?: string;
  pinyin?: string;
  english?: string;
  speaker?: TestLine['speaker'];
  audio?: SentenceAudio;
}

/** A gap sentence or printed question; gap sentences mark the blank with ＿＿. */
export interface TestPrompt {
  traditional: string;
  simplified: string;
  pinyin?: string;
  english?: string;
  speaker?: TestLine['speaker'];
  audio?: SentenceAudio;
}

/** One scored answer. */
export interface LessonTestQuestion {
  id: string;
  prompt?: TestPrompt;
  /** Absent for a paragraph-bank blank (it chooses from the item's bank). */
  choices?: TestChoice[];
  /** Index into `choices` (or the item's bank). */
  key: number;
  /** The full right sentence for feedback (gap questions). */
  answer?: TestText;
  /** One line on why the key is right, shown in the Fix round. */
  why: string;
  /** What the question tests, listed under "to fix" on the results screen. */
  focus: { zh: string; en: string };
  /** The lesson this question practises (this lesson or an earlier one). */
  lesson: number;
  /** The book of `lesson` when it is an earlier book's (a Lesson 1 test reviews the book before). */
  book?: number;
  /** A recording with several questions: the line that answers this one (shown in the Fix round). */
  answerLine?: number;
  /** Vocabulary card ids the question tests: missed words go back into review. */
  wordIds: string[];
  grammarIds?: string[];
}

interface ItemBase {
  id: string;
  questions: LessonTestQuestion[];
}

/** Hear a sentence (or a short exchange), pick one of three pictures. TOCFL Novice 聽力 1 / Band A 問答理解. */
export interface HearPickPictureItem extends ItemBase {
  kind: 'hear-pick-picture';
  lines: TestLine[];
}

/** Look at one picture, hear three sentences, pick the one that matches. TOCFL Novice 聽力 2 / Band A 看圖回答. */
export interface PictureHearItem extends ItemBase {
  kind: 'picture-hear';
  picture: { picture: string; alt: string };
}

/**
 * A dialogue or talk, a ding, then its question(s), whose choices the narrator reads A, B, C(, D). Book 1 only
 * speaks them; `printed` also prints them (TOCFL Band A's last part and Band B). A recording with several
 * questions (Band B) opens with the narrator's `intro` and names each question's `answerLine`.
 */
export interface DialogueItem extends ItemBase {
  kind: 'dialogue';
  /** 請聽一段對話（廣播……），然後回答兩個問題。 */
  intro?: TestLine;
  lines: TestLine[];
  /** The line that holds the answer (shown in feedback); a question's own `answerLine` wins. */
  answerLine: number;
  printed?: boolean;
  /** Times the recording plays in the test (TOCFL: twice at Novice/Band A, once at Band B). */
  plays?: 1 | 2;
}

/** Read one sentence, pick one of three pictures. TOCFL 單句理解. */
export interface ReadPickPictureItem extends ItemBase {
  kind: 'read-pick-picture';
}

/** A menu, receipt or notice picture with its exact text; which statement is true. TOCFL 看圖釋義. */
export interface RealiaItem extends ItemBase {
  kind: 'realia';
  picture: string;
  alt: string;
  /** The exact writing in the picture (screen readers, scope checks and the Fix round). */
  transcript: TestText;
}

/** One scene picture, several gap sentences. TOCFL 選詞填空. */
export interface SceneGapItem extends ItemBase {
  kind: 'scene-gap';
  picture: string;
  alt: string;
}

/** A paragraph with numbered blanks ({1}…) and a shared word bank, one extra. TOCFL 完成段落. */
export interface ParagraphBankItem extends ItemBase {
  kind: 'paragraph-bank';
  passage: TestText;
  bank: TestText[];
}

/** A passage with numbered blanks, each with its own choices. TOCFL Band B 選詞填空. */
export interface ClozeItem extends ItemBase {
  kind: 'cloze';
  passage: TestText;
}

/**
 * A short text with one or more questions. TOCFL 閱讀理解. `message`: the last line signs it; `notice`: lines
 * like 時間：…… are label and value; `table`: one row per line, cells split by ｜, the first row the heading.
 */
export interface ReadingItem extends ItemBase {
  kind: 'reading';
  format: 'message' | 'notice' | 'passage' | 'table';
  title?: TestText;
  text: TestText;
}

export type LessonTestItem =
  | HearPickPictureItem
  | PictureHearItem
  | DialogueItem
  | ReadPickPictureItem
  | RealiaItem
  | SceneGapItem
  | ParagraphBankItem
  | ClozeItem
  | ReadingItem;

export interface LessonTestSlot {
  id: string;
  part: LessonTestPart;
  /** A review slot: its versions practise earlier lessons. */
  review?: boolean;
  versions: LessonTestItem[];
}

export interface LessonTestLesson {
  schemaVersion: 1;
  key: string;
  bookId: number;
  lessonId: number;
  band: LessonTestBand;
  /** Book names and words the passages may use beyond the taught vocabulary. */
  allowWords?: string[];
  slots: LessonTestSlot[];
}

/** Shared clips: the ding between a dialogue and its question, and the narrator's letters. */
export interface LessonTestSounds {
  ding?: SentenceAudio;
  letters?: Partial<Record<'A' | 'B' | 'C' | 'D', SentenceAudio>>;
}

/** One book's pack. */
export interface LessonTestPack {
  schemaVersion: 1;
  bookId: number;
  count: number;
  sounds: LessonTestSounds;
  items: LessonTestLesson[];
}
