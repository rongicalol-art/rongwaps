import type { SentenceAudio } from '../../types/grammarPractice';
import type { LessonTestItem, LessonTestQuestion, LessonTestSounds } from '../../types/lessonTest';

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
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const TURN_GAP_MS = 450;
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
 * pause, then each question the narrator asks with its answers read as "A … B … C …" in the order they are shown.
 * Printed answers are read too, as on the exam. A recording with several questions plays once, then asks them one
 * after another (`question` is the index of the one being asked or read).
 */
export function listeningSteps(
  item: LessonTestItem,
  questions: LessonTestQuestion[],
  orders: Record<string, number[]> | undefined,
  sounds: LessonTestSounds,
  script: 'traditional' | 'simplified',
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
  if (item.kind === 'hear-pick-picture' || item.kind === 'dialogue') {
    item.lines.forEach((line, index) => {
      if (index > 0) steps.push({ pauseMs: TURN_GAP_MS });
      say(line, 'voice');
    });
  }
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
  if (item.kind === 'picture-hear') readChoices(questions[0], 0);
  return steps;
}

/** Every recording a screen plays (its own clips, the ding and the letters), for downloading ahead. */
export function testRecordings(item: LessonTestItem, questions: LessonTestQuestion[], sounds: LessonTestSounds): string[] {
  const files = listeningSteps(item, questions, undefined, sounds, 'traditional').map((step) => step.audio?.file);
  return [...new Set(files.filter((file): file is string => Boolean(file)))];
}
