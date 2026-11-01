import { useMemo } from 'react';
import type { LessonTestItem, LessonTestQuestion, LessonTestSounds, TestText } from '../../../types/lessonTest';
import type { PlannedItem } from '../../../utils/lesson/lessonTestPlan';
import { cn } from '../../../utils/cn';
import { useTestAudio } from '../hooks/useTestAudio';
import { listeningSteps } from '../testAudioSequence';
import { testPicture } from '../testPictures';
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

/** A picture the question is about: native ratio, uncropped, on a quiet card. */
function StimulusPicture({ name, alt, wide }: { name: string; alt: string; wide?: boolean }) {
  return (
    <div className={cn('mx-auto w-full rounded-feature border-2 border-ui-divider bg-ui-surface p-2', wide ? 'max-w-xl' : 'max-w-md')}>
      <img src={testPicture(name)} alt={alt} draggable={false} className="block h-auto w-full select-none rounded-control" />
    </div>
  );
}

/** A note, notice or passage, set like a printed card. */
function ReadingText({ item, script }: { item: Extract<LessonTestItem, { kind: 'reading' }>; script: Script }) {
  const lines = text(item.text, script).split('\n');
  return (
    <div className="w-full rounded-feature border-2 border-ui-divider bg-ui-surface px-5 py-4">
      {item.title && <p className="mb-2 text-center font-chinese text-xl text-ui-ink-strong">{text(item.title, script)}</p>}
      {lines.map((line, index) => (
        <p
          key={index}
          className={cn(
            'font-chinese text-lg leading-8 text-ui-ink-strong md:text-xl',
            item.format === 'message' && index === lines.length - 1 && lines.length > 2 && 'text-right text-ui-muted-strong',
          )}
        >
          {line}
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
  /** Question number of the screen's first question (paragraph blanks show it). */
  firstNumber: number;
  onAnswer: (questionId: string, choice: number | undefined) => void;
}

/** One screen of the test: the instruction, the recording or text, and the answers. */
export function QuestionBody({ item, questionIds, planned, answers, checked, mode, sounds, script, firstNumber, onAnswer }: QuestionBodyProps) {
  const question = item.questions.find((entry) => entry.id === questionIds[0]) ?? item.questions[0];
  const order = planned.orders[question.id] ?? (question.choices ?? []).map((_, index) => index);
  const steps = useMemo(() => listeningSteps(item, question, order, sounds, script), [item, question, order, sounds, script]);
  const audio = useTestAudio(steps, `${mode}:${item.id}:${question.id}`, mode, script);
  const selected = answers[question.id];
  const pick = (choice: number) => onAnswer(question.id, choice);
  const speaker = steps.length > 0 && (
    <TestSpeaker playing={audio.playing} plays={audio.plays} maxPlays={item.kind === 'dialogue' && item.plays === 1 ? 1 : audio.maxPlays} onReplay={audio.replay} />
  );
  const choiceList = (spoken: boolean) => (
    <ChoiceList question={question} order={order} selected={selected} checked={checked} spoken={spoken} mark={audio.mark} script={script} onSelect={pick} />
  );
  const pictures = <PictureChoices question={question} order={order} selected={selected} checked={checked} onSelect={pick} />;
  const printedPrompt = question.prompt && (
    <p className="text-center font-chinese text-xl leading-snug text-ui-ink-strong md:text-2xl">{text(question.prompt, script)}</p>
  );

  let body: React.ReactNode;
  switch (item.kind) {
    case 'hear-pick-picture':
      body = <>{speaker}{pictures}</>;
      break;
    case 'picture-hear':
      body = <><StimulusPicture name={item.picture.picture} alt={item.picture.alt} wide />{speaker}{choiceList(true)}</>;
      break;
    case 'dialogue':
      body = <>{speaker}{printedPrompt}{choiceList(!item.printed)}</>;
      break;
    case 'read-pick-picture':
      body = (
        <>
          <div className="w-full rounded-feature border-2 border-ui-divider bg-ui-surface px-4 py-6 text-center font-chinese text-2xl leading-normal text-ui-ink-strong md:py-8 md:text-3xl">
            {text(question.prompt, script)}
          </div>
          {pictures}
        </>
      );
      break;
    case 'realia':
      body = <><StimulusPicture name={item.picture} alt={`${item.alt}: ${item.transcript.traditional}`} />{printedPrompt}{choiceList(false)}</>;
      break;
    case 'scene-gap':
      body = (
        <>
          <StimulusPicture name={item.picture} alt={item.alt} wide />
          <GapSentence question={question} order={order} selected={selected} checked={checked} script={script} onSelect={pick} />
        </>
      );
      break;
    case 'paragraph-bank':
    case 'cloze':
      body = (
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
      body = <><ReadingText item={item} script={script} />{printedPrompt}{choiceList(false)}</>;
      break;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-5">
      <h1 className="text-balance text-center text-2xl font-black leading-tight text-ui-ink-strong">{titleFor(item, question)}</h1>
      {body}
    </div>
  );
}
