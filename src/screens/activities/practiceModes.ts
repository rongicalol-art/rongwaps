import type { PlayfulNavIconName } from '../../lib/widgets';

/** The lesson's practice modes, as the Practice sheet lists them and the end screen suggests them. */
export type PracticeModeId = 'quiz' | 'writing' | 'pinyin' | 'tones' | 'sentences';

export interface PracticeModeInfo {
  icon: PlayfulNavIconName;
  label: string;
  /** One quiet line saying what the mode is: learners didn't know, so they never tried them. */
  line: string;
}

export const PRACTICE_MODES: Record<PracticeModeId, PracticeModeInfo> = {
  quiz: { icon: 'quiz', label: 'Quiz', line: 'Check every meaning' },
  writing: { icon: 'writing', label: 'Writing', line: 'Write each character stroke by stroke' },
  pinyin: { icon: 'pinyinPractice', label: 'Pinyin', line: 'Type how each word sounds' },
  tones: { icon: 'tonesPractice', label: 'Tones', line: 'Hear a word, draw its tones' },
  sentences: { icon: 'reading', label: 'Sentences', line: 'Hear and read the lesson’s sentences' },
};

export const PRACTICE_MODE_ORDER: readonly PracticeModeId[] = ['quiz', 'writing', 'pinyin', 'tones', 'sentences'];

/** A practice mode counts as recently done for a week; then it is suggested again. */
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
/** After a meaning quiz: Sentences when the part has them (owner's pick over the dialogue), then tones, writing, pinyin. */
const SUGGESTION_ORDER: readonly PracticeModeId[] = ['sentences', 'tones', 'writing', 'pinyin'];

/**
 * The practice mode to suggest after a lesson quiz: the first one not practised on these words this week.
 * Pinyin and Sentences answers aren't told apart in review history yet, so they never count as done.
 */
export function pickPracticeSuggestion(
  events: ReadonlyArray<{ cardId: string; source: string; reviewedAt: number }>,
  cardIds: ReadonlySet<string>,
  hasSentences: boolean,
  now: number,
): PracticeModeId {
  const since = now - RECENT_MS;
  const done = new Set(events.filter((e) => e.reviewedAt >= since && cardIds.has(e.cardId)).map((e) => e.source));
  return SUGGESTION_ORDER.find((id) => (id !== 'sentences' || hasSentences) && !done.has(id)) ?? 'tones';
}
