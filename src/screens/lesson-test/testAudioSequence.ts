import type { SentenceAudio } from '../../types/grammarPractice';
import type { LessonTestItem, LessonTestQuestion, LessonTestSounds } from '../../types/lessonTest';

/** One step of what a listening question says: a clip, or a pause. `mark` lights up the choice being read. */
export interface AudioStep {
  audio?: SentenceAudio;
  text?: string;
  pauseMs?: number;
  mark?: number;
}

const LETTERS = ['A', 'B', 'C', 'D'] as const;
const TURN_GAP_MS = 450;
/** After a dialogue: the ding, then a pause before the question, so the two never blur together. */
const AFTER_DING_MS = 900;
const BEFORE_CHOICES_MS = 500;
const BETWEEN_CHOICES_MS = 550;

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
  const say = (line: { audio?: SentenceAudio; traditional?: string; simplified?: string }) => {
    steps.push({ audio: line.audio, text: line[script] ?? line.traditional });
  };
  const readChoices = () => {
    const choices = question.choices ?? [];
    (order ?? choices.map((_, index) => index)).forEach((original, shown) => {
      if (shown > 0) steps.push({ pauseMs: BETWEEN_CHOICES_MS });
      steps.push({ audio: sounds.letters?.[LETTERS[shown]], text: LETTERS[shown], mark: shown });
      steps.push({ pauseMs: 150, mark: shown });
      const choice = choices[original];
      steps.push({ audio: choice.audio, text: choice[script] ?? choice.traditional, mark: shown });
    });
  };

  if (item.kind === 'hear-pick-picture' || item.kind === 'dialogue') {
    item.lines.forEach((line, index) => {
      if (index > 0) steps.push({ pauseMs: TURN_GAP_MS });
      say(line);
    });
  }
  if (item.kind === 'dialogue') {
    steps.push({ pauseMs: 350 });
    if (sounds.ding) steps.push({ audio: sounds.ding });
    steps.push({ pauseMs: AFTER_DING_MS });
    if (question.prompt) say(question.prompt);
    if (!item.printed) {
      steps.push({ pauseMs: BEFORE_CHOICES_MS });
      readChoices();
    }
  }
  if (item.kind === 'picture-hear') readChoices();
  return steps;
}
