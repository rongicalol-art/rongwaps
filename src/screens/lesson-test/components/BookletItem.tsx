import { useMemo } from 'react';
import { ActionButton, AppIcon, SpeakerIcon } from '../../../lib/widgets';
import type { ClozeItem, LessonTestItem, LessonTestQuestion, ParagraphBankItem, TestChoice, TestText } from '../../../types/lessonTest';
import type { PlannedItem } from '../../../utils/lesson/lessonTestPlan';
import { cn } from '../../../utils/cn';
import type { BookletAudio, BookletClip } from '../hooks/useBookletAudio';
import { testPicture } from '../testPictures';
import { ChineseText } from './ChineseText';
import { choiceText, type Script } from './ChoiceList';
import { testRubyItems } from '../testPinyin';
import { PinyinText, RubyRun } from './PinyinText';
import { ReadingText } from './ReadingText';

/** What the booklet shows besides the Chinese, and how it plays. */
export interface BookletView {
  script: Script;
  pinyin: boolean;
  english: boolean;
  audio: BookletAudio;
}

interface BookletItemProps {
  item: LessonTestItem;
  planned: PlannedItem;
  answers: Record<string, number>;
  /** The test's number for the item's first question. */
  firstNumber: number;
  view: BookletView;
}

const VOICE: Record<string, string> = { F: '女', M: '男' };
const LETTERS = 'ABCD';
type Shown = Partial<TestText> & Pick<TestChoice, 'traditional'>;
const zhOf = (value: Shown | undefined, script: Script) => (value ? value[script] ?? value.traditional ?? '' : '');

/** A question's number: plain when it was right, red when it was missed. */
function QuestionNumber({ value, right }: { value: number; right: boolean }) {
  return (
    <span
      aria-label={`Question ${value}, ${right ? 'right' : 'missed'}`}
      className={cn(
        'mt-px grid h-7 min-w-7 shrink-0 place-items-center rounded-xs px-1.5 text-sm font-black tabular-nums',
        right ? 'border-2 border-ui-border bg-ui-surface text-ui-ink-strong' : 'bg-feedback-danger text-ui-on-solid',
      )}
    >
      {value}
    </span>
  );
}

/** Chinese (pinyin over it when on) and, when English is on, its meaning on the next line. */
function Said({ value, view, className }: { value: Shown; view: BookletView; className?: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className={cn('text-pretty font-chinese text-ui-ink-strong', view.pinyin ? 'leading-[1.8]' : 'leading-snug', className)}>
        <PinyinText text={zhOf(value, view.script)} pinyin={value.pinyin} show={view.pinyin} />
      </span>
      {view.english && value.english && <span className="text-[15px] font-bold leading-snug text-ui-muted">{value.english}</span>}
    </span>
  );
}

interface LineProps {
  clip: BookletClip;
  value: Shown;
  badge: string;
  view: BookletView;
  /** The line that holds a right answer, or a spoken answer that was picked wrongly. */
  tone?: 'right' | 'wrong';
  /** A recording with several questions: the number of the question this line answers. */
  number?: number;
}

/** One spoken line: who says it, the Chinese with a small play button at its end, its meaning. A tap anywhere plays it. */
function Line({ clip, value, badge, view, tone, number }: LineProps) {
  const speaking = view.audio.line === clip.key;
  const zh = zhOf(value, view.script);
  const play = () => { if (speaking) view.audio.stop(); else void view.audio.say(clip); };
  return (
    <div
      onClick={clip.audio ? play : undefined}
      className={cn(
        'flex w-full gap-3 rounded-control px-3 py-2.5 transition-colors duration-200',
        clip.audio && 'cursor-pointer',
        speaking ? 'bg-brand-primary-wash' : tone === 'right' ? 'bg-feedback-success-surface' : tone === 'wrong' ? 'bg-feedback-danger-surface' : clip.audio && 'hover:bg-ui-hover',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-7 shrink-0 place-items-center rounded-xs text-base',
          /[A-Z?]/.test(badge) ? 'font-sans font-black' : 'font-chinese',
          tone ? 'bg-ui-surface' : 'bg-brand-primary-wash',
          tone === 'right' ? 'text-feedback-success-text' : tone === 'wrong' ? 'text-feedback-danger-text' : 'text-brand-primary-deep',
        )}
      >
        {badge}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn('text-pretty font-chinese text-[19px] text-ui-ink-strong', view.pinyin ? 'leading-[1.8]' : 'leading-snug', tone === 'wrong' && 'text-feedback-danger-text line-through decoration-2')}>
          <PinyinText text={zh} pinyin={value.pinyin} show={view.pinyin} />
          {clip.audio && (
            <button
              type="button"
              aria-label={`${speaking ? 'Stop' : 'Play'}: ${zh}`}
              onClick={(event) => { event.stopPropagation(); play(); }}
              className={cn(
                'ml-1.5 -mt-1 inline-grid h-6.5 w-7 place-items-center rounded-xs align-middle transition-colors duration-200 focus-ring',
                speaking ? 'bg-brand-primary text-brand-on-primary' : tone ? 'bg-ui-surface text-brand-primary-deep' : 'bg-brand-primary-wash text-brand-primary-deep',
              )}
            >
              <SpeakerIcon status={speaking ? 'playing' : null} size={16} />
            </button>
          )}
        </span>
        {view.english && value.english && <span className="text-[15px] font-bold leading-snug text-ui-muted">{value.english}</span>}
      </span>
      {number !== undefined && (
        <span className="grid h-6.5 min-w-6.5 shrink-0 place-items-center self-start rounded-xs bg-feedback-success px-1.5 text-[13px] font-black tabular-nums text-ui-on-solid">
          {number}
        </span>
      )}
    </div>
  );
}

/** Plays every line of a recording in turn, or stops it. */
function PlayAll({ id, clips, view }: { id: string; clips: BookletClip[]; view: BookletView }) {
  const playing = view.audio.all === id;
  if (!clips.some((clip) => clip.audio)) return null;
  return (
    <div className="self-start">
      <ActionButton size="sm" onClick={() => (playing ? view.audio.stop() : void view.audio.playAll(id, clips))}>
        <SpeakerIcon status={playing ? 'playing' : null} size={18} />
        {playing ? 'Stop' : 'Play all'}
      </ActionButton>
    </div>
  );
}

/** The answers in the order the test showed them: the right one ticked, a wrong pick crossed out. */
function Choices({ question, order, picked, view }: { question: LessonTestQuestion; order: number[]; picked: number | undefined; view: BookletView }) {
  const choices = question.choices ?? [];
  return (
    <div className="flex flex-col gap-0.5 pl-[2.375rem]">
      {order.map((original) => {
        const choice = choices[original];
        const right = original === question.key;
        const wrong = !right && original === picked;
        return (
          <div key={original} className={cn('flex items-start gap-2.5 rounded-control px-2.5 py-1.5', right && 'bg-feedback-success-surface', wrong && 'bg-feedback-danger-surface')}>
            <span className="grid h-7 w-4.5 shrink-0 place-items-center">
              {right && <AppIcon name="check" size={18} className="text-feedback-success-text" />}
              {wrong && <AppIcon name="close" size={18} className="text-feedback-danger-text" />}
            </span>
            <span className={cn('min-w-0', view.pinyin ? 'leading-[1.8]' : 'leading-7')}>
              <span className={cn('font-chinese text-[17px]', right ? 'text-ui-ink-strong' : wrong ? 'text-feedback-danger-text line-through decoration-2' : 'text-ui-ink')}>
                <PinyinText text={choiceText(choice, view.script)} pinyin={choice.pinyin} show={view.pinyin} />
              </span>
              {/* Beside short Chinese; under it once pinyin makes the lines tall. */}
              {view.english && choice.english && <span className={cn('text-sm font-bold text-ui-muted', view.pinyin ? 'block leading-snug' : 'ml-2')}>{choice.english}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Words to pick from, in the order shown: the right one green, a wrong pick crossed out red. */
function WordChips({ words, order, right, picked, view }: { words: TestChoice[]; order: number[]; right: number; picked: number | undefined; view: BookletView }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {order.map((index) => (
        <span
          key={index}
          className={cn(
            'rounded-xs px-2.5 py-0.5 font-chinese text-[17px]',
            index === right ? 'bg-feedback-success-surface text-feedback-success-text' : index === picked ? 'bg-feedback-danger-surface text-feedback-danger-text line-through decoration-2' : 'border-2 border-ui-divider text-ui-muted-strong',
          )}
        >
          {index === right ? <PinyinText text={choiceText(words[index], view.script)} pinyin={words[index].pinyin} show={view.pinyin} /> : choiceText(words[index], view.script)}
        </span>
      ))}
    </span>
  );
}

const Why = ({ text }: { text: string }) => <p className="pl-[2.375rem] text-[15px] font-extrabold leading-snug text-ui-ink-strong">{text}</p>;

/** Three pictures in the order shown, the right one framed green and a wrong pick red. */
function PictureRow({ question, order, picked }: { question: LessonTestQuestion; order: number[]; picked: number | undefined }) {
  const choices = question.choices ?? [];
  return (
    <div className="grid grid-cols-3 gap-2.5 pl-[2.375rem]">
      {order.map((original) => {
        const right = original === question.key;
        const wrong = !right && original === picked;
        return (
          <div key={original} className={cn('relative rounded-control border-3 bg-ui-surface p-1', right ? 'border-feedback-success' : wrong ? 'border-feedback-danger' : 'border-ui-divider')}>
            <img src={testPicture(choices[original].picture)} alt={choices[original].alt ?? ''} draggable={false} className="block h-auto w-full select-none rounded-xs" />
            {(right || wrong) && (
              <span className={cn('absolute -left-2 -top-2 grid size-6 place-items-center rounded-full text-ui-on-solid', right ? 'bg-feedback-success' : 'bg-feedback-danger')}>
                <AppIcon name={right ? 'check' : 'close'} size={14} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function QuestionHead({ question, number, right, view, children }: { question: LessonTestQuestion; number: number; right: boolean; view: BookletView; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <QuestionNumber value={number} right={right} />
      {children ?? (question.prompt ? <Said value={question.prompt} view={view} className="text-lg" /> : null)}
    </div>
  );
}

/** A passage with its blanks filled in: right answers green, a wrong pick crossed out beside the right word. */
function FilledPassage({ item, answers, firstNumber, view }: { item: ClozeItem | ParagraphBankItem; answers: Record<string, number>; firstNumber: number; view: BookletView }) {
  const words = (question: LessonTestQuestion) => (item.kind === 'paragraph-bank' ? item.bank : question.choices ?? []);
  const template = item.passage[view.script] ?? item.passage.traditional;
  // The whole passage with its answers in, matched to the pinyin once; each piece then takes its share of characters.
  const ruby = useMemo(() => {
    if (!view.pinyin) return null;
    const filled = template.replace(/\{(\d+)\}/g, (_, n: string) => {
      const question = item.questions[Number(n) - 1];
      return choiceText((item.kind === 'paragraph-bank' ? item.bank : question.choices ?? [])[question.key], view.script);
    });
    return testRubyItems(filled, item.passage.pinyin);
  }, [view.pinyin, view.script, template, item]);
  let at = 0;
  const take = (chars: number) => {
    const out = [];
    for (let count = 0; count < chars && ruby && at < ruby.length; at += 1) {
      out.push(ruby[at]);
      count += ruby[at].char.length;
    }
    return out;
  };
  const piece = (text: string) => (ruby ? <RubyRun items={take(text.length)} /> : <ChineseText text={text} />);
  return (
    <div className="w-full rounded-feature border-2 border-ui-divider bg-ui-surface px-5 py-4">
      <p className={cn('text-pretty font-chinese text-lg text-ui-ink-strong md:text-xl', ruby ? 'leading-[2.2]' : 'leading-loose')}>
        {template.split(/(\{\d+\})/).map((part, index) => {
          const blank = /^\{(\d+)\}$/.exec(part);
          if (!blank) return <span key={index}>{piece(part)}</span>;
          const position = Number(blank[1]) - 1;
          const question = item.questions[position];
          const list = words(question);
          const picked = answers[question.id];
          const rightWord = choiceText(list[question.key], view.script);
          const wrong = picked !== question.key;
          return (
            <span key={index} className={cn('mx-0.5 rounded-xs px-1.5 py-px', wrong ? 'bg-feedback-danger-surface' : 'bg-feedback-success-surface')}>
              <b className={cn('mr-1 font-sans text-[11px] font-black', wrong ? 'text-feedback-danger-text' : 'text-ui-muted-strong')}>{firstNumber + position}</b>
              {wrong && picked !== undefined && <s className="mr-1 text-feedback-danger-text decoration-2">{choiceText(list[picked], view.script)}</s>}
              <span className="text-feedback-success-text">{piece(rightWord)}</span>
            </span>
          );
        })}
      </p>
      {!ruby && view.pinyin && <p className="mt-2 font-sans text-[15px] font-bold leading-snug text-ui-muted-strong">{item.passage.pinyin}</p>}
    </div>
  );
}

/** Each blank: its number, the words it offered (or the bank's right word), and why. */
function BlankRows({ item, planned, answers, firstNumber, view }: { item: ClozeItem | ParagraphBankItem; planned: PlannedItem; answers: Record<string, number>; firstNumber: number; view: BookletView }) {
  return item.questions.map((question, index) => {
    const picked = answers[question.id];
    const isBank = item.kind === 'paragraph-bank';
    const words = isBank ? item.bank : question.choices ?? [];
    const order = isBank ? [question.key, ...(picked !== undefined && picked !== question.key ? [picked] : [])] : planned.orders[question.id] ?? words.map((_, i) => i);
    return (
      <div key={question.id} className="flex flex-col gap-2">
        <QuestionHead question={question} number={firstNumber + index} right={picked === question.key} view={view}>
          <WordChips words={words} order={order} right={question.key} picked={picked} view={view} />
        </QuestionHead>
        <Why text={question.why} />
      </div>
    );
  });
}

/** A gap sentence with its answer in the blank (a wrong pick crossed out before it). */
function FilledGap({ question, picked, view }: { question: LessonTestQuestion; picked: number | undefined; view: BookletView }) {
  const choices = question.choices ?? [];
  const prompt = zhOf(question.prompt, view.script).replace(/——/g, ' ');
  const [before, after = ''] = prompt.split('＿＿');
  const wrong = picked !== question.key;
  return (
    <p className="text-pretty font-chinese text-lg leading-loose text-ui-ink-strong">
      <ChineseText text={before} />
      <span className={cn('mx-0.5 rounded-xs px-1.5 py-px', wrong ? 'bg-feedback-danger-surface' : 'bg-feedback-success-surface')}>
        {wrong && picked !== undefined && <s className="mr-1 text-feedback-danger-text decoration-2">{choiceText(choices[picked], view.script)}</s>}
        <span className="text-feedback-success-text">{choiceText(choices[question.key], view.script)}</span>
      </span>
      <ChineseText text={after} />
    </p>
  );
}

/**
 * One recording or text of the test in the booklet, as it was in the test: the script (every line, tap one to hear it)
 * or the text, then each question with the learner's answer, the right one, and why. Wide windows put the two side by side.
 */
export function BookletItem({ item, planned, answers, firstNumber, view }: BookletItemProps) {
  const orderOf = (question: LessonTestQuestion) => planned.orders[question.id] ?? (question.choices ?? []).map((_, index) => index);
  const numberOf = (question: LessonTestQuestion) => firstNumber + item.questions.indexOf(question);
  const rightOf = (question: LessonTestQuestion) => answers[question.id] === question.key;
  const english = (value?: string) => (view.english && value ? <p className="text-[15px] font-bold leading-relaxed text-ui-muted">{value}</p> : null);
  const lineClips = (lines: Array<{ audio?: TestChoice['audio'] }>) => lines.map((line, index) => ({ key: `${item.id}:${index}`, audio: line.audio }));

  // A question whose answers are only heard: its choices are lines to replay, with the letters the narrator read.
  const spokenQuestion = (question: LessonTestQuestion) => {
    const picked = answers[question.id];
    return (
      <div key={question.id} className="flex flex-col gap-2">
        <QuestionHead question={question} number={numberOf(question)} right={rightOf(question)} view={view} />
        <div className="flex flex-col gap-0.5 pl-6.5">
          {orderOf(question).map((original, shown) => {
            const choice = question.choices?.[original];
            if (!choice) return null;
            return (
              <Line
                key={original}
                clip={{ key: `${question.id}:${original}`, audio: choice.audio }}
                value={choice}
                badge={LETTERS[shown]}
                view={view}
                tone={original === question.key ? 'right' : original === picked ? 'wrong' : undefined}
              />
            );
          })}
        </div>
        <Why text={question.why} />
      </div>
    );
  };
  const printedQuestion = (question: LessonTestQuestion) => (
    <div key={question.id} className="flex flex-col gap-2">
      <QuestionHead question={question} number={numberOf(question)} right={rightOf(question)} view={view} />
      <Choices question={question} order={orderOf(question)} picked={answers[question.id]} view={view} />
      <Why text={question.why} />
    </div>
  );

  let side: React.ReactNode = null;
  let questions: React.ReactNode = null;
  switch (item.kind) {
    case 'dialogue': {
      const clips = lineClips(item.lines);
      const answerAt = new Map(item.questions.map((question) => [question.answerLine ?? item.answerLine, question]));
      side = (
        <>
          <PlayAll id={item.id} clips={clips} view={view} />
          {item.intro && <p className="pl-[3.25rem] pr-3 font-chinese text-base text-ui-muted-strong"><ChineseText text={zhOf(item.intro, view.script)} /></p>}
          <div className="flex flex-col gap-0.5">
            {item.lines.map((line, index) => {
              const answered = answerAt.get(index);
              return (
                <Line
                  key={index}
                  clip={clips[index]}
                  value={line}
                  badge={VOICE[line.speaker] ?? ''}
                  view={view}
                  tone={answered ? 'right' : undefined}
                  number={answered && item.questions.length > 1 ? numberOf(answered) : undefined}
                />
              );
            })}
          </div>
        </>
      );
      questions = item.questions.map((question) => (item.printed ? printedQuestion(question) : spokenQuestion(question)));
      break;
    }
    case 'hear-pick-picture': {
      const clips = lineClips(item.lines);
      side = (
        <>
          <PlayAll id={item.id} clips={clips} view={view} />
          <div className="flex flex-col gap-0.5">
            {item.lines.map((line, index) => <Line key={index} clip={clips[index]} value={line} badge={VOICE[line.speaker] ?? ''} view={view} />)}
          </div>
        </>
      );
      questions = item.questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-2">
          <QuestionHead question={question} number={numberOf(question)} right={rightOf(question)} view={view}><span /></QuestionHead>
          <PictureRow question={question} order={orderOf(question)} picked={answers[question.id]} />
          <Why text={question.why} />
        </div>
      ));
      break;
    }
    case 'picture-hear': {
      const question = item.questions[0];
      const clips = orderOf(question).map((original) => ({ key: `${question.id}:${original}`, audio: question.choices?.[original]?.audio }));
      side = (
        <>
          <img src={testPicture(item.picture.picture)} alt={item.picture.alt} draggable={false} className="block aspect-video h-auto w-full select-none rounded-control bg-ui-surface object-contain" />
          <PlayAll id={item.id} clips={[{ key: `${question.id}:prompt`, audio: question.prompt?.audio }, ...clips]} view={view} />
        </>
      );
      questions = spokenQuestion(question);
      break;
    }
    case 'read-pick-picture':
      questions = item.questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-2">
          <QuestionHead question={question} number={numberOf(question)} right={rightOf(question)} view={view} />
          <PictureRow question={question} order={orderOf(question)} picked={answers[question.id]} />
          <Why text={question.why} />
        </div>
      ));
      break;
    case 'realia':
      side = (
        <>
          <img src={testPicture(item.picture)} alt={`${item.alt}: ${item.transcript.traditional}`} draggable={false} className="mx-auto block aspect-[4/3] h-auto w-full max-w-md select-none rounded-control bg-ui-surface object-contain" />
          {view.pinyin && <p className="font-chinese text-lg leading-[1.9] text-ui-ink-strong"><PinyinText text={zhOf(item.transcript, view.script)} pinyin={item.transcript.pinyin} show /></p>}
          {english(item.transcript.english)}
        </>
      );
      questions = item.questions.map(printedQuestion);
      break;
    case 'scene-gap':
      side = <img src={testPicture(item.picture)} alt={item.alt} draggable={false} className="block aspect-video h-auto w-full select-none rounded-control bg-ui-surface object-contain" />;
      questions = item.questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-2">
          <QuestionHead question={question} number={numberOf(question)} right={rightOf(question)} view={view}>
            <span className="flex min-w-0 flex-col gap-0.5">
              <FilledGap question={question} picked={answers[question.id]} view={view} />
              {view.english && question.answer?.english && <span className="text-[15px] font-bold leading-snug text-ui-muted">{question.answer.english}</span>}
            </span>
          </QuestionHead>
          <Why text={question.why} />
        </div>
      ));
      break;
    case 'cloze':
    case 'paragraph-bank':
      side = (
        <>
          <FilledPassage item={item} answers={answers} firstNumber={firstNumber} view={view} />
          {english(item.passage.english)}
        </>
      );
      questions = <BlankRows item={item} planned={planned} answers={answers} firstNumber={firstNumber} view={view} />;
      break;
    case 'reading':
      side = (
        <>
          <ReadingText item={item} script={view.script} pinyin={view.pinyin} />
          {view.english && (
            <div className="flex flex-col gap-2">
              {[item.title?.english, ...item.text.english.split('\n')].filter(Boolean).map((paragraph, index) => (
                <p key={index} className="text-[15px] font-bold leading-relaxed text-ui-muted">{paragraph}</p>
              ))}
            </div>
          )}
        </>
      );
      questions = item.questions.map(printedQuestion);
      break;
  }

  return (
    <section className={cn('grid gap-5 border-t-2 border-ui-divider py-6 [h3+&]:border-t-0', side && 'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-x-10')}>
      {side && <div className="flex min-w-0 flex-col gap-3">{side}</div>}
      <div className={cn('flex min-w-0 flex-col gap-6', side && 'lg:sticky lg:top-20')}>{questions}</div>
    </section>
  );
}
