import type { SentenceAudio } from '../../types/grammarPractice';
import type { DialogueItem, LessonTestItem, LessonTestQuestion, TestText } from '../../types/lessonTest';

/** One line of a script: who says it (女, 男, the question's ?, or an answer's letter), its text, and its clip. */
export interface ScriptRow {
  badge: string;
  text: Pick<TestText, 'traditional' | 'simplified'> & Partial<Pick<TestText, 'pinyin' | 'english'>>;
  audio?: SentenceAudio;
  /** The line that holds a question's answer. */
  answer: boolean;
  /** A recording with several questions: the numbers of the questions this line answers ("7", or "7, 8"). */
  number?: string;
}

/** What the Fix round's Script sheet shows: spoken lines to read and replay, or a text's reading and meaning. */
export type TestScript =
  | { kind: 'lines'; intro?: ScriptRow['text']; rows: ScriptRow[] }
  | { kind: 'text'; pinyin: string[]; english: string[]; answers: ScriptRow[] };

const LETTERS = 'ABCD';

const VOICE: Record<string, string> = { F: '女', M: '男' };
/** A dialogue's answer lines: line index → the questions it answers (two questions can share a line). */
export function dialogueAnswerLines(item: DialogueItem, questions: readonly LessonTestQuestion[]) {
  const lines = new Map<number, LessonTestQuestion[]>();
  for (const question of questions) {
    const line = question.answerLine ?? item.answerLine;
    lines.set(line, [...(lines.get(line) ?? []), question]);
  }
  return lines;
}

/** The question numbers a line shows when its recording has several questions. */
export const answerLabel = (item: LessonTestItem, answered: LessonTestQuestion[] | undefined, numberOf: (question: LessonTestQuestion) => number) => (
  answered && item.questions.length > 1 ? answered.map(numberOf).join(', ') : undefined);

const paragraphs = (text: string | undefined) => (text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

/**
 * The script of a question's recording or text, for the Fix round's Script sheet. Recordings list every line (a
 * dialogue or talk, or a picture question's question and answers, in the order shown); texts give their pinyin and
 * English, and include the answer text or the sentence the learner matched to a picture.
 * `numberOf` names a question's number on the test (a recording with several questions tags the line each answers).
 */
export function testScript(
  item: LessonTestItem,
  questions: LessonTestQuestion[],
  order: Record<string, number[]>,
  numberOf: (question: LessonTestQuestion) => number,
): TestScript {
  const textScript = (texts: Array<TestText | undefined>): TestScript => ({
    kind: 'text',
    pinyin: texts.flatMap((text) => paragraphs(text?.pinyin)),
    english: texts.flatMap((text) => paragraphs(text?.english)),
    answers: questions.flatMap((question) => {
      const text = item.kind === 'scene-gap' ? question.answer
        : item.kind === 'read-pick-picture' ? question.prompt
        : item.kind === 'paragraph-bank' ? item.bank[question.key]
        : question.choices?.[question.key];
      if (!text?.traditional) return [];
      return [{
        badge: '',
        text: {
          ...text,
          traditional: text.traditional.replace(/——/g, '\n'),
          simplified: (text.simplified ?? text.traditional).replace(/——/g, '\n'),
        },
        answer: item.kind !== 'read-pick-picture',
        number: item.questions.length > 1 ? String(numberOf(question)) : undefined,
      }];
    }),
  });
  switch (item.kind) {
    case 'dialogue': {
      const answers = dialogueAnswerLines(item, questions);
      return {
        kind: 'lines',
        intro: item.intro,
        rows: item.lines.map((line, index) => ({
          badge: VOICE[line.speaker] ?? '',
          text: line,
          audio: line.audio,
          answer: answers.has(index),
          number: answerLabel(item, answers.get(index), numberOf),
        })),
      };
    }
    case 'hear-pick-picture':
      return { kind: 'lines', rows: item.lines.map((line) => ({ badge: VOICE[line.speaker] ?? '', text: line, audio: line.audio, answer: false })) };
    case 'picture-hear': {
      const [question] = questions;
      const choices = question.choices ?? [];
      const shown = order[question.id] ?? choices.map((_, index) => index);
      const rows: ScriptRow[] = question.prompt
        ? [{ badge: '?', text: question.prompt, audio: question.prompt.audio, answer: false }]
        : [];
      shown.forEach((original, position) => {
        const choice = choices[original];
        if (choice.traditional) {
          rows.push({
            badge: LETTERS[position],
            text: { ...choice, traditional: choice.traditional, simplified: choice.simplified ?? choice.traditional },
            audio: choice.audio,
            answer: original === question.key,
          });
        }
      });
      return { kind: 'lines', rows };
    }
    case 'reading':
      return textScript([item.title, item.text]);
    case 'cloze':
    case 'paragraph-bank':
      return textScript([item.passage]);
    case 'realia':
      return textScript([item.transcript]);
    case 'scene-gap':
    case 'read-pick-picture':
      return textScript([]);
  }
}
