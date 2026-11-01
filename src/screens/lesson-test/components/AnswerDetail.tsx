import type { LessonTestItem, LessonTestQuestion, TestChoice, TestText } from '../../../types/lessonTest';
import type { Script } from './ChoiceList';

type Shown = Partial<TestText> & Pick<TestChoice, 'traditional'>;

/** The sentence that holds the answer, with its reading and meaning. */
export function answerText(item: LessonTestItem, question: LessonTestQuestion): Shown | undefined {
  switch (item.kind) {
    case 'scene-gap': return question.answer;
    case 'dialogue': return item.lines[item.answerLine];
    case 'hear-pick-picture': {
      const lines = item.lines;
      return lines.length === 1 ? lines[0] : {
        traditional: lines.map((line) => line.traditional).join(''),
        simplified: lines.map((line) => line.simplified).join(''),
        pinyin: lines.map((line) => line.pinyin).join(' '),
        english: lines.map((line) => line.english).join(' '),
      };
    }
    case 'read-pick-picture': return question.prompt;
    case 'paragraph-bank': return item.bank[question.key];
    default: return question.choices?.[question.key];
  }
}

/**
 * Fix round feedback: the right sentence (or word), its pinyin and English, and one line on why. Several blanks
 * (a paragraph) get one compact line each, so the bar never covers the passage.
 */
export function AnswerDetail({ item, questions, script }: { item: LessonTestItem; questions: LessonTestQuestion[]; script: Script }) {
  const compact = questions.length > 1;
  return (
    <div className={compact ? 'flex flex-col gap-2' : 'flex flex-col'}>
      {questions.map((question) => {
        const shown = answerText(item, question);
        // A reply after —— goes on its own line, as in the question.
        const zh = (shown ? shown[script] ?? shown.traditional ?? '' : '').replace(/——/g, '\n');
        return compact ? (
          <div key={question.id} className="flex flex-col">
            <p className="leading-snug">
              <span className="font-chinese text-lg text-ui-ink-strong">{zh}</span>
              <span className="ml-2 text-base font-bold text-ui-muted-strong">{[shown?.pinyin, shown?.english].filter(Boolean).join(' · ')}</span>
            </p>
            <p className="text-sm font-extrabold leading-snug text-ui-ink-strong">{question.why}</p>
          </div>
        ) : (
          <div key={question.id} className="flex flex-col gap-0.5">
            {zh && <span className="whitespace-pre-line font-chinese text-xl leading-snug text-ui-ink-strong">{zh}</span>}
            {shown?.pinyin && <span className="text-base font-bold leading-snug text-ui-muted-strong">{shown.pinyin}</span>}
            {shown?.english && <span className="text-base font-bold leading-snug text-ui-muted-strong">{shown.english}</span>}
            <span className="mt-1 text-base font-extrabold leading-snug text-ui-ink-strong">{question.why}</span>
          </div>
        );
      })}
    </div>
  );
}
