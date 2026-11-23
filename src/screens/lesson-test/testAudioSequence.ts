import type { SentenceAudio } from '../../types/grammarPractice';
import type { LessonTestItem, LessonTestLesson, LessonTestQuestion, LessonTestSounds } from '../../types/lessonTest';

/** One step of what a listening question says: a clip, or a pause. `mark` lights up the choice being read. */
export interface AudioStep {
  audio?: SentenceAudio;
  text?: string;
  pauseMs?: number;
  mark?: number;
  /** What the speaker key shows while this clip plays (choices show their letter through `mark`). */
  cue?: 'voice' | 'ding' | 'question';
  /** Which of the screen's questions this step asks or reads (a recording with several questions). */
  question?: number;
  /** The recording's line this clip speaks (the Fix round's script lights it). */
  line?: number;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const TURN_GAP_MS = 450;
/**
 * Band B (Book 2 Lessons 9–16, Books 3–4): speakers answer each other quickly, as on the TOCFL recordings (owner's
 * pick). Each clip already keeps 0.1 s of silence at both ends, so turns are about 0.3 s apart instead of 0.65 s.
 */
const BAND_B_TURN_GAP_MS = 100;
/**
 * Books whose dialogue clips are Yating's takes as they came (owner's pick by ear, 2026-11-19): each keeps its own
 * ≈ 0.35 s of silence at the end, so the next speaker follows with no added gap.
 */
const NATIVE_EDGE_BOOKS = new Set([2, 3]);

/** The silence between two speakers' turns in one test. */
export function turnGapMs(lesson: Pick<LessonTestLesson, 'bookId' | 'band'> & { lessonId?: number }): number {
  if (NATIVE_EDGE_BOOKS.has(lesson.bookId)) return 0;
  return lesson.band === 'B' ? BAND_B_TURN_GAP_MS : TURN_GAP_MS;
}
/** After a dialogue: a beat of silence, the ding, then a pause before the question, so nothing blurs together. */
const BEFORE_DING_MS = 2000;
const AFTER_DING_MS = 800;
/**
 * Reading the answers, at the pace of the official TOCFL Band A mock recordings (vol. 4 Part 1: about 0.9 s after the
 * question, 0.7–1.0 s between a letter and its answer, 1.25–1.55 s before the next letter), so each one can sink in.
 */
const BEFORE_CHOICES_MS = 1000;
const LETTER_GAP_MS = 800;
const BETWEEN_CHOICES_MS = 1300;
/** Between one question's last answer and the next question (the exam waits five seconds; here the learner answers meanwhile). */
const BETWEEN_QUESTIONS_MS = 2000;

/**
 * What a listening screen plays, in TOCFL order: the narrator's opening line (Band B), the dialogue, a ding and a
 * pause, then each question the narrator asks with its answers read as "A … B … C …" in the order they are shown. A
 * picture question asks its question (if it has one) and reads its answers.
 * Printed answers are read too, as on the exam. A recording with several questions plays once, then asks them one
 * after another (`question` is the index of the one being asked or read).
 */
export function listeningSteps(
  item: LessonTestItem,
  questions: LessonTestQuestion[],
  orders: Record<string, number[]> | undefined,
  sounds: LessonTestSounds,
  script: 'traditional' | 'simplified',
  turnGap: number = TURN_GAP_MS,
): AudioStep[] {
  const steps: AudioStep[] = [];
  const say = (line: { audio?: SentenceAudio; traditional?: string; simplified?: string }, cue: AudioStep['cue'], question?: number) => {
    steps.push({ audio: line.audio, text: line[script] ?? line.traditional, cue, question });
  };
  const readChoices = (question: LessonTestQuestion, index: number) => {
    const choices = question.choices ?? [];
    (orders?.[question.id] ?? choices.map((_, original) => original)).forEach((original, shown) => {
      if (shown > 0) steps.push({ pauseMs: BETWEEN_CHOICES_MS, question: index });
      steps.push({ audio: sounds.letters?.[LETTERS[shown]], text: LETTERS[shown], mark: shown, question: index });
      steps.push({ pauseMs: LETTER_GAP_MS, mark: shown, question: index });
      const choice = choices[original];
      steps.push({ audio: choice.audio, text: choice[script] ?? choice.traditional, mark: shown, question: index });
    });
  };

  if (item.kind === 'dialogue' && item.intro) {
    say(item.intro, 'voice');
    steps.push({ pauseMs: TURN_GAP_MS });
  }
  if (item.kind === 'hear-pick-picture' || item.kind === 'dialogue') steps.push(...lineSteps(item, script, turnGap));
  if (item.kind === 'dialogue') {
    steps.push({ pauseMs: BEFORE_DING_MS });
    if (sounds.ding) steps.push({ audio: sounds.ding, cue: 'ding' });
    steps.push({ pauseMs: AFTER_DING_MS });
    questions.forEach((question, index) => {
      if (index > 0) steps.push({ pauseMs: BETWEEN_QUESTIONS_MS, question: index });
      if (question.prompt) say(question.prompt, 'question', index);
      steps.push({ pauseMs: BEFORE_CHOICES_MS, question: index });
      readChoices(question, index);
    });
  }
  // TOCFL Band A 看圖回答: the narrator asks about the picture, then reads the answers (Book 1 only reads the answers).
  if (item.kind === 'picture-hear') {
    const [question] = questions;
    if (question.prompt) {
      say(question.prompt, 'question', 0);
      steps.push({ pauseMs: BEFORE_CHOICES_MS, question: 0 });
    }
    readChoices(question, 0);
  }
  return steps;
}

/** A recording's lines alone, with the short gap between turns: what the Fix round's script plays as a whole. */
export function lineSteps(item: LessonTestItem, script: 'traditional' | 'simplified', turnGap: number = TURN_GAP_MS): AudioStep[] {
  if (item.kind !== 'hear-pick-picture' && item.kind !== 'dialogue') return [];
  return item.lines.flatMap((line, index) => [
    ...(index > 0 && turnGap > 0 ? [{ pauseMs: turnGap }] : []),
    { audio: line.audio, text: line[script] ?? line.traditional, cue: 'voice' as const, line: index },
  ]);
}

/** Every recording a screen plays (its own clips, the ding and the letters), for downloading ahead. */
export function testRecordings(item: LessonTestItem, questions: LessonTestQuestion[], sounds: LessonTestSounds): string[] {
  const files = listeningSteps(item, questions, undefined, sounds, 'traditional').map((step) => step.audio?.file);
  return [...new Set(files.filter((file): file is string => Boolean(file)))];
}
