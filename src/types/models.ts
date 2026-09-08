export interface UserFlashcard {
  id: string; // generate this using crypto.randomUUID()
  folderId?: string; // which custom folder it belongs to
  simplified: string;
  traditional?: string;
  pinyin?: string;
  translation: string;
  notes?: string;
  measure_words?: string[];
  createdAt: number;
  userId: string;
}

export interface UserFolder {
  id: string;
  name: string;
  color: string;
}

export interface UserProgressData {
  srsData: Record<string, unknown>;
  learnedCards: string[];
  lastActivity: string | null;
}

export type CourseLessonState = 'current' | 'completed' | 'available' | 'locked';

export type LessonPartSelection = 'all' | number[];
export type LessonPartSelectionMap = Record<string, LessonPartSelection>;

export interface PartSegment {
  partId: number;
  label: string;
  cardCount: number;
  startIndex: number;
}

export interface CourseLessonPartProgress {
  id: number;
  wordCount: number;
  learnedCount: number;
  isSelected: boolean;
}

export interface CourseLessonProgress {
  id: number;
  label: string;
  title: string;
  previewChinese?: string;
  previewEnglish?: string;
  wordCount: number;
  learnedCount: number;
  isSelected: boolean;
  areAllPartsSelected: boolean;
  parts: CourseLessonPartProgress[];
  requiredPathCount: number;
  completedPathCount: number;
  startedPathCount: number;
  isFullyCompleted: boolean;
  state: CourseLessonState;
}

export interface CourseDashboardProgress {
  totalWords: number;
  learnedWords: number;
  completedLessons: number;
  totalLessons: number;
  progressPercent: number;
  currentLessonId: number | null;
  lessons: CourseLessonProgress[];
}

export interface SessionProgress {
  cardsReviewed: number;
  cardsLearned: number;
  startTime: number;
}

export type PracticeFlowStatus = 'idle' | 'playing' | 'paused' | 'finished';

export interface PracticeHeaderActions {
  onLightbulbClick?: () => void;
  onSettingsClick?: () => void;
  onShuffleClick?: () => void;
  onFlowClick?: () => void;
  onRestartClick?: () => void;
  isShuffled?: boolean;
  flowStatus?: PracticeFlowStatus;
}

export interface FlashcardBase {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  translation: string;
  audio?: string;
  decomposition?: string;
  composition?: string;
  radicals?: string;
  notes?: string;
  measure_words?: string[];
  // related to curriculum
  curriculum_lesson?: number;
  curriculum_book?: number;
}

export interface DictionaryListEntry {
  id: number | string;
  simplified: string;
  traditional: string;
  pinyin_accented: string;
  definitions: string | string[] | Record<string, unknown>;
  bookId?: number;
  lessonId?: number;
  pos?: string;
  audio?: string;
  measure_words?: string[];
}

export interface DictionarySavedPreview {
  word: string;
  traditional: string;
  pinyin: string;
  meaning: string;
}

export type PracticeActivityType = 'flashcards' | 'listening' | 'quiz' | 'writing';
export type QuizMode = 'choices' | 'typing';
export type ActivityType = PracticeActivityType | 'flashcards-review' | 'flashcards-library' | 'create-card' | null;
export type LastActivityType = PracticeActivityType | 'flashcards-review' | null;


export * from './grammar';

export interface AlignedWord {
  w: string;
  start: number;
  end: number;
  charStart?: number;
  charEnd?: number;
}

/** One spoken syllable's timing from character-level forced alignment. */
export interface AlignedChar {
  charStart: number;
  charEnd: number;
  start: number;
  end: number;
  score?: number;
}

export interface AlignedLine {
  index: number;
  speaker: string;
  text: string;
  start: number;
  end: number;
  words: AlignedWord[];
  chars?: AlignedChar[];
  score?: number;
  unmatched?: boolean;
}

export interface DialogueAlignment {
  audioFile: string;
  lessonId: number;
  dialogueNumber: number;
  trimSec: number;
  lines: AlignedLine[];
}

/** One line of a dialogue, exposed as a flowing paragraph in readings. */
export interface ReadingParagraph {
  speaker: string;
  traditional: string;
  simplified: string;
  pinyin: string;
  english: string;
}

/** Font size preference for reader mode */
export type ReaderTextSize = 'normal' | 'large' | 'extra-large';

/** A dialogue-as-reading, paragraph by paragraph. */
export interface ReadingRecord {
  id: string;
  bookId: number;
  lessonId: number;
  dialogueNumber: number;
  title: string;
  setting: string;
  printedPages: number[];
  audioReference: string;
  paragraphs: ReadingParagraph[];
}

/** An optional hero illustration shown at the top of a reading narrative. */
export interface ReadingIllustration {
  url: string;
  alt: string;
}

export interface CourseExampleRecord {
  id: string;
  sourceCardId: string;
  sourceFront: string;
  sourceMeaning: string;
  bookId: number;
  lessonId: number;
  partId: number;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  printedPage?: number;
  sourceOcrId: string;
  provenance: 'textbook-ocr' | 'authored';
  confidence: 'high' | 'medium' | 'needs-review';
}

export interface CourseExamplePack {
  schemaVersion: number;
  bookId: number;
  count: number;
  records: CourseExampleRecord[];
}

export interface CourseExampleManifestBook {
  bookId: number;
  count: number;
  path: string;
  sha256: string;
  bytes: number;
}

export interface CourseExampleManifest {
  schemaVersion: number;
  version: string;
  generatedAt: string;
  totalCount: number;
  books: CourseExampleManifestBook[];
}
