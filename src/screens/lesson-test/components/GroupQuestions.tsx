import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LessonTestQuestion, TestText } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import type { AudioStep } from '../testAudioSequence';
import { ChineseText } from './ChineseText';
import { ChoiceList, type Script } from './ChoiceList';

interface GroupQuestionsProps {
  questions: LessonTestQuestion[];
  orders: Record<string, number[]>;
  answers: Record<string, number>;
  checked: boolean;
  /** Choices only heard (Book 1) show as sound bars; Band B prints them. */
  spoken: boolean;
  script: Script;
  /** Number of the first question, as in the TOCFL booklet. */
  firstNumber: number;
  /** How many questions the narrator has asked; which question's choice is being read. */
  asked: number;
  mark: number | null;
  markQuestion: number;
  playing: boolean;
  say: (step: AudioStep) => void;
  onAnswer: (questionId: string, choice: number | undefined) => void;
}

const text = (value: Pick<TestText, 'traditional' | 'simplified'>, script: Script) => value[script] ?? value.traditional;

/**
 * Every question of one recording on one screen (it plays once, so all of them are in view while it plays, as in the
 * TOCFL booklet). The printed choices show from the start; each question appears as the narrator asks it, its number
 * lights while it is asked and read, and the screen glides down to it. Number keys answer the first open question.
 */
export function GroupQuestions({ questions, orders, answers, checked, spoken, script, firstNumber, asked, mark, markQuestion, playing, say, onAnswer }: GroupQuestionsProps) {
  const reduceMotion = useReducedMotion();
  const blocks = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (asked > 1) blocks.current[asked - 1]?.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [asked, reduceMotion]);
  const keysFor = questions.findIndex((question) => answers[question.id] === undefined);

  return (
    <div className="flex w-full flex-col gap-7">
      {questions.map((question, index) => {
        const shown = checked || asked > index;
        const order = orders[question.id] ?? (question.choices ?? []).map((_, original) => original);
        return (
          <div key={question.id} ref={(node) => { blocks.current[index] = node; }} className="flex w-full scroll-mb-40 flex-col gap-3">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'mt-0.5 grid h-7 min-w-7 shrink-0 place-items-center rounded-xs px-1.5 text-sm font-black tabular-nums transition-colors duration-300',
                  playing && markQuestion === index && asked > index ? 'bg-brand-primary text-brand-on-primary' : 'bg-brand-primary-wash text-brand-primary-text',
                )}
              >
                {firstNumber + index}
              </span>
              {question.prompt && (
                <motion.p
                  aria-hidden={!shown}
                  initial={false}
                  animate={shown ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 24 }}
                  className="flex-1 text-balance font-chinese text-xl leading-snug text-ui-ink-strong"
                >
                  <ChineseText text={text(question.prompt, script)} />
                </motion.p>
              )}
            </div>
            <ChoiceList
              question={question}
              order={order}
              selected={answers[question.id]}
              checked={checked}
              spoken={spoken}
              mark={markQuestion === index ? mark : null}
              script={script}
              keysOff={index !== keysFor}
              onSelect={(choice) => onAnswer(question.id, choice)}
              onSay={(original, shownAt) => {
                const choice = question.choices?.[original];
                if (choice) say({ audio: choice.audio, text: choice[script] ?? choice.traditional, mark: shownAt, question: index });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
