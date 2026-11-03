import { useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { PracticeChoiceButton, getPracticeChoiceState } from '../../../features/practice';
import { useNumberKeySelection } from '../../../hooks/useNumberKeySelection';
import type { ClozeItem, ParagraphBankItem } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { ChineseText, splitClosing } from './ChineseText';
import { choiceText, type Script } from './ChoiceList';

interface ParagraphBlanksProps {
  item: ParagraphBankItem | ClozeItem;
  /** Blanks open on this screen (in the Fix round: only the missed ones; the rest show their answer). */
  questionIds: string[];
  answers: Record<string, number>;
  checked: boolean;
  script: Script;
  bankOrder?: number[];
  orders: Record<string, number[]>;
  /** Question number of the first blank: blanks are numbered like the test's questions. */
  firstNumber: number;
  onAnswer: (questionId: string, choice: number | undefined) => void;
}

/**
 * A paragraph with numbered blanks. Paragraph bank (完成段落): one shared bank, each word used once, one extra.
 * Cloze (Band B 選詞填空): each blank has its own choices. A picked word flies into its blank and the bank closes up.
 */
export function ParagraphBlanks({ item, questionIds, answers, checked, script, bankOrder, orders, firstNumber, onAnswer }: ParagraphBlanksProps) {
  const reduceMotion = useReducedMotion();
  const open = new Set(questionIds);
  const blankAnswer = (index: number) => {
    const question = item.questions[index];
    return open.has(question.id) ? answers[question.id] : question.key;
  };
  const firstEmpty = item.questions.findIndex((question) => open.has(question.id) && answers[question.id] === undefined);
  const [picked, setPicked] = useState<number | null>(null);
  const current = picked !== null && open.has(item.questions[picked]?.id) && answers[item.questions[picked].id] === undefined ? picked : firstEmpty;
  const currentQuestion = current >= 0 ? item.questions[current] : undefined;
  const isBank = item.kind === 'paragraph-bank';
  const words = isBank ? item.bank : currentQuestion?.choices ?? [];
  const used = new Set(isBank ? item.questions.map((_, index) => blankAnswer(index)).filter((value) => value !== undefined) : []);
  // Every word keeps its number key while others leave the bank.
  const shownOrder = isBank ? bankOrder ?? item.bank.map((_, index) => index) : currentQuestion ? orders[currentQuestion.id] ?? [] : [];
  const chips = shownOrder.filter((index) => !used.has(index));
  const layoutId = (index: number) => (reduceMotion || !isBank ? undefined : `${item.id}-word-${index}`);

  const choose = (index: number) => {
    if (!currentQuestion || checked) return;
    onAnswer(currentQuestion.id, index);
    setPicked(null);
  };
  useNumberKeySelection({ items: shownOrder, onSelect: (index) => { if (!used.has(index)) choose(index); }, disabled: checked || !currentQuestion });

  const passage = item.passage[script] ?? item.passage.traditional;
  const parts = passage.split(/\{(\d+)\}/);
  return (
    <LayoutGroup id={item.id}>
      <div className="w-full rounded-feature border-2 border-ui-divider bg-ui-surface px-5 py-4">
        <p className="text-pretty font-chinese text-xl leading-loose text-ui-ink-strong md:text-2xl">
          {parts.map((part, index) => {
            // Punctuation right after a blank stays on the blank's line (a line never starts with 「。」).
            if (index % 2 === 0) return <ChineseText key={index} text={index > 0 ? splitClosing(part)[1] : part} />;
            const blank = Number(part) - 1;
            const question = item.questions[blank];
            const value = blankAnswer(blank);
            const isOpen = open.has(question.id);
            const wrong = checked && isOpen && value !== question.key;
            const word = value !== undefined ? choiceText((isBank ? item.bank : question.choices ?? [])[value], script) : '';
            return (
              <span key={index} className="whitespace-nowrap">
                <button
                  type="button"
                  disabled={!isOpen || checked}
                  aria-label={`Blank ${firstNumber + blank}${word ? `: ${word}` : ''}`}
                  onClick={() => { if (value !== undefined) onAnswer(question.id, undefined); setPicked(blank); }}
                  className={cn(
                    'mx-1 inline-block min-w-12 border-b-3 px-1 text-center align-baseline leading-tight outline-none focus-ring-inline',
                    !isOpen && 'border-ui-divider text-ui-muted-strong',
                    isOpen && !checked && (blank === current ? 'border-brand-primary' : 'border-ui-border'),
                    isOpen && !checked && 'text-brand-primary-text',
                    checked && isOpen && (wrong ? 'border-feedback-danger text-feedback-danger-text' : 'border-feedback-success text-feedback-success-text'),
                  )}
                >
                  {word ? (
                    <motion.span layoutId={layoutId(value!)} className="inline-block">
                      {wrong ? <><s className="opacity-60">{word}</s> <span className="text-feedback-success-text">{choiceText((isBank ? item.bank : question.choices ?? [])[question.key], script)}</span></> : word}
                    </motion.span>
                  ) : (
                    <span className="font-sans text-sm font-black text-ui-muted-strong">{firstNumber + blank}</span>
                  )}
                </button>
                {splitClosing(parts[index + 1] ?? '')[0]}
              </span>
            );
          })}
        </p>
      </div>
      {!checked && chips.length > 0 && (
        <div className="flex w-full flex-wrap justify-center gap-3">
          {chips.map((index) => (
            <motion.div key={index} layout={!reduceMotion} transition={{ type: 'spring', stiffness: 420, damping: 34 }}>
              <PracticeChoiceButton
                compact
                state={getPracticeChoiceState(false, false, false)}
                onClick={() => choose(index)}
                className="min-w-16 [&>span:last-child]:!px-5"
              >
                <motion.span layoutId={layoutId(index)} className="inline-block font-chinese text-2xl font-normal text-ui-ink-strong">
                  {choiceText(words[index], script)}
                </motion.span>
              </PracticeChoiceButton>
            </motion.div>
          ))}
        </div>
      )}
    </LayoutGroup>
  );
}
