import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LessonTestItem, LessonTestQuestion, LessonTestSounds, TestText } from '../../../types/lessonTest';
import type { PlannedItem } from '../../../utils/lesson/lessonTestPlan';
import { cn } from '../../../utils/cn';
import { useTestAudio } from '../hooks/useTestAudio';
import { listeningSteps } from '../testAudioSequence';
import { testPicture } from '../testPictures';
import { ChineseText } from './ChineseText';
import { ChoiceList, type Script } from './ChoiceList';
import { GapSentence } from './GapSentence';
import { ParagraphBlanks } from './ParagraphBlanks';
import { PictureChoices } from './PictureChoices';
import { TestSpeaker } from './TestSpeaker';

/** The instruction above each question, by kind (TOCFL prints one per part; ours stays short). */
function titleFor(item: LessonTestItem, question: LessonTestQuestion): string {
  switch (item.kind) {
    case 'hear-pick-picture': return 'Listen and pick the picture';
    case 'picture-hear': return 'Which sentence matches the picture?';
    case 'dialogue': return 'Listen, then answer';
    case 'read-pick-picture': return 'Pick the picture';
    case 'realia': return question.prompt ? 'Read and answer' : 'Which sentence is true?';
    case 'scene-gap': return 'Fill in the blank';
    case 'paragraph-bank':
    case 'cloze': return 'Fill in the blanks';
    case 'reading': return 'Read and answer';
  }
}

const text = (value: Pick<TestText, 'traditional' | 'simplified'> | undefined, script: Script) => (value ? value[script] ?? value.traditional : '');

/**
 * The picture a question is about, above its answers: native ratio, uncropped, on a quiet card. Its box is
 * held before it loads (scenes 16:9, notices and menus 4:3) so the answers never jump; a notice is capped by
 * the window height so the whole question still fits a 900px-tall window.
 */
function StimulusPicture({ name, alt, notice }: { name: string; alt: string; notice?: boolean }) {
  return (
    <div className={cn('mx-auto w-full rounded-feature border-2 border-ui-divider bg-ui-surface p-2', notice && 'max-w-[min(28rem,40vh)]')}>
      <img
        src={testPicture(name)}
        alt={alt}
        draggable={false}
        className={cn('block h-auto w-full select-none rounded-control object-contain', notice ? 'aspect-[4/3]' : 'aspect-video')}
      />
    </div>
  );
}

/** A note, notice or passage, set like a printed card. */
function ReadingText({ item, script }: { item: Extract<LessonTestItem, { kind: 'reading' }>; script: Script }) {
  const lines = text(item.text, script).split('\n');
  return (
    <div className="w-full rounded-feature border-2 border-ui-divider bg-ui-surface px-5 py-4">
      {item.title && <p className="mb-2 text-balance text-center font-chinese text-xl text-ui-ink-strong"><ChineseText text={text(item.title, script)} /></p>}
      {lines.map((line, index) => (
        <p
          key={index}
          className={cn(
            'font-chinese text-lg leading-8 text-ui-ink-strong md:text-xl',
            item.format === 'message' && index === lines.length - 1 && lines.length > 2 && 'text-right text-ui-muted-strong',
          )}
        >
          <ChineseText text={line} />
        </p>
      ))}
    </div>
  );
}

export interface QuestionBodyProps {
  item: LessonTestItem;
  /** Questions answered on this screen (one, or the open blanks of a paragraph). */
  questionIds: string[];
  planned: PlannedItem;
  answers: Record<string, number>;
  /** Fix round, after Check: right and wrong show. */
  checked: boolean;
  /** `exam`: recordings play twice on their own; `replay`: once, with a replay button (Fix round). */
  mode: 'exam' | 'replay';
  sounds: LessonTestSounds;
  script: Script;
  /** This screen's recordings are downloaded (or can stream): the audio starts then, never part-way late. */
  audioReady: boolean;
  /** Question number of the screen's first question (paragraph blanks show it). */
  firstNumber: number;
  onAnswer: (questionId: string, choice: number | undefined) => void;
}

/**
 * One screen of the test, one column at every size like TOCFL's computer test: the instruction, then the
 * recording, picture or text, then the answers, all one width so their edges line up.
 */
export function QuestionBody({ item, questionIds, planned, answers, checked, mode, sounds, script, audioReady, firstNumber, onAnswer }: QuestionBodyProps) {
  const question = item.questions.find((entry) => entry.id === questionIds[0]) ?? item.questions[0];
  const order = planned.orders[question.id] ?? (question.choices ?? []).map((_, index) => index);
  const steps = useMemo(() => listeningSteps(item, question, order, sounds, script), [item, question, order, sounds, script]);
  const audio = useTestAudio(steps, `${mode}:${item.id}:${question.id}`, mode, audioReady);
  const reduceMotion = useReducedMotion();
  const selected = answers[question.id];
  const pick = (choice: number) => onAnswer(question.id, choice);
  // Picture questions have no speaker (the answer being read presses in instead), unless a clip failed: then it offers a retry.
  const speaker = steps.length > 0 && (item.kind !== 'picture-hear' || audio.failed) && (
    <TestSpeaker
      face={audio.face}
      playing={audio.playing}
      plays={audio.plays}
      maxPlays={item.kind === 'dialogue' && item.plays === 1 ? 1 : audio.maxPlays}
      onReplay={audio.replay}
      onRetry={audio.retry}
    />
  );
  const sayChoice = (original: number, shown: number) => {
    const choice = question.choices?.[original];
    if (choice) void audio.say({ audio: choice.audio, text: choice[script] ?? choice.traditional, mark: shown });
  };
  const choiceList = (spoken: boolean) => (
    <ChoiceList question={question} order={order} selected={selected} checked={checked} spoken={spoken} mark={audio.mark} script={script} onSelect={pick} onSay={sayChoice} />
  );
  const pictures = <PictureChoices question={question} order={order} selected={selected} checked={checked} onSelect={pick} />;
  const printedPrompt = question.prompt && (
    <p className="text-balance text-center font-chinese text-xl leading-snug text-ui-ink-strong md:text-2xl"><ChineseText text={text(question.prompt, script)} /></p>
  );
  // A dialogue's question appears when the narrator asks it, right after the ding (TOCFL order).
  const askedPrompt = question.prompt && (
    <motion.p
      aria-hidden={!(audio.asked || checked)}
      initial={false}
      animate={audio.asked || checked ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.96 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 24 }}
      className="text-balance text-center font-chinese text-xl leading-snug text-ui-ink-strong md:text-2xl"
    >
      <ChineseText text={text(question.prompt, script)} />
    </motion.p>
  );

  let stimulus: React.ReactNode = null;
  let answersPart: React.ReactNode = null;
  switch (item.kind) {
    case 'hear-pick-picture':
      stimulus = speaker; answersPart = pictures;
      break;
    case 'picture-hear':
      stimulus = <>{speaker}<StimulusPicture name={item.picture.picture} alt={item.picture.alt} /></>; answersPart = choiceList(true);
      break;
    case 'dialogue':
      stimulus = speaker; answersPart = <>{askedPrompt}{choiceList(!item.printed)}</>;
      break;
    case 'read-pick-picture':
      stimulus = (
        <p className="w-full text-balance rounded-feature border-2 border-ui-divider bg-ui-surface px-4 py-6 text-center font-chinese text-2xl leading-normal text-ui-ink-strong md:py-8 md:text-3xl">
          <ChineseText text={text(question.prompt, script)} />
        </p>
      );
      answersPart = pictures;
      break;
    case 'realia':
      stimulus = <StimulusPicture name={item.picture} alt={`${item.alt}: ${item.transcript.traditional}`} notice />; answersPart = <>{printedPrompt}{choiceList(false)}</>;
      break;
    case 'scene-gap':
      stimulus = <StimulusPicture name={item.picture} alt={item.alt} />;
      answersPart = <GapSentence question={question} order={order} selected={selected} checked={checked} script={script} onSelect={pick} />;
      break;
    case 'paragraph-bank':
    case 'cloze':
      answersPart = (
        <ParagraphBlanks
          item={item}
          questionIds={questionIds}
          answers={answers}
          checked={checked}
          script={script}
          bankOrder={planned.bankOrder}
          orders={planned.orders}
          firstNumber={firstNumber}
          onAnswer={onAnswer}
        />
      );
      break;
    case 'reading':
      stimulus = <ReadingText item={item} script={script} />; answersPart = <>{printedPrompt}{choiceList(false)}</>;
      break;
  }

  // Picture answers are compared at a glance, so they get a wider column on big screens.
  const pictureAnswers = item.kind === 'hear-pick-picture' || item.kind === 'read-pick-picture';
  return (
    <div className={cn('mx-auto flex w-full max-w-xl flex-col items-center gap-6', pictureAnswers && 'md:max-w-3xl')}>
      <h1 className="text-balance text-center text-2xl font-black leading-tight text-ui-ink-strong">{titleFor(item, question)}</h1>
      {stimulus && <div className="flex w-full flex-col items-center gap-5">{stimulus}</div>}
      <div className="flex w-full flex-col items-center gap-5">{answersPart}</div>
    </div>
  );
}
