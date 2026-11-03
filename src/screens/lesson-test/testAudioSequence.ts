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

/**
 * What a listening question plays, in TOCFL order: the dialogue, a ding and a pause, the narrator's
 * question, then each answer as "A … B … C …" in the order the choices are shown.
 */
export function listeningSteps(
  item: LessonTestItem,
  question: LessonTestQuestion,
  order: number[] | undefined,
  sounds: LessonTestSounds,
  script: 'traditional' | 'simplified',
): AudioStep[] {
  const steps: AudioStep[] = [];
  const say = (line: { audio?: SentenceAudio; traditional?: string; simplified?: string }, cue: AudioStep['cue']) => {
    steps.push({ audio: line.audio, text: line[script] ?? line.traditional, cue });
  };
  const readChoices = () => {
    const choices = question.choices ?? [];
    (order ?? choices.map((_, index) => index)).forEach((original, shown) => {
      if (shown > 0) steps.push({ pauseMs: BETWEEN_CHOICES_MS });
      steps.push({ audio: sounds.letters?.[LETTERS[shown]], text: LETTERS[shown], mark: shown });
      steps.push({ pauseMs: LETTER_GAP_MS, mark: shown });
      const choice = choices[original];
      steps.push({ audio: choice.audio, text: choice[script] ?? choice.traditional, mark: shown });
    });
  };

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
    if (question.prompt) say(question.prompt, 'question');
    if (!item.printed) {
      steps.push({ pauseMs: BEFORE_CHOICES_MS });
      readChoices();
    }
  }
  if (item.kind === 'picture-hear') readChoices();
  return steps;
}
