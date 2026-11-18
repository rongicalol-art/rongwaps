import type { SentenceAudio } from '../../types/grammarPractice';
import type { LessonTestItem, LessonTestQuestion, TestText } from '../../types/lessonTest';

/** One line of a script: who says it (女, 男, the question's ?, or an answer's letter), its text, and its clip. */
export interface ScriptRow {
  badge: string;
  text: Pick<TestText, 'traditional' | 'simplified'> & Partial<Pick<TestText, 'pinyin' | 'english'>>;
  audio?: SentenceAudio;
  /** The line that holds a question's answer. */
  answer: boolean;
  /** A recording with several questions: the number of the question this line answers. */
  number?: number;
}

/** What the Fix round's Script sheet shows: spoken lines to read and replay, or a text's reading and meaning. */
export type TestScript =
  | { kind: 'lines'; intro?: ScriptRow['text']; rows: ScriptRow[] }
  | { kind: 'text'; pinyin: string[]; english: string[] };

const LETTERS = 'ABCD';

/** Whether a question has a script to show (gap sentences and picture choices don't: the answer bar holds it all). */
export const hasTestScript = (item: LessonTestItem) => item.kind !== 'scene-gap' && item.kind !== 'read-pick-picture';
const VOICE: Record<string, string> = { F: '女', M: '男' };
const paragraphs = (text: string | undefined) => (text ?? '').split('\n').map((line) => line.trim()).filter(Boolean);

/**
 * The script of a question's recording or text, for the Fix round and See all. Recordings list every line (a
 * dialogue or talk, or a picture question's question and answers, in the order shown); texts give their pinyin and
 * English. Gap sentences and picture choices have none: the answer bar already shows their whole sentence.
 * `numberOf` names a question's number on the test (a recording with several questions tags the line each answers).
 */
export function testScript(
  item: LessonTestItem,
  questions: LessonTestQuestion[],
  order: Record<string, number[]>,
  numberOf: (question: LessonTestQuestion) => number,
): TestScript | null {
  switch (item.kind) {
    case 'dialogue': {
      const answers = new Map(questions.map((question) => [question.answerLine ?? item.answerLine, question]));
      return {
        kind: 'lines',
        intro: item.intro,
        rows: item.lines.map((line, index) => ({
          badge: VOICE[line.speaker] ?? '',
          text: line,
          audio: line.audio,
          answer: answers.has(index),
          number: item.questions.length > 1 && answers.has(index) ? numberOf(answers.get(index)!) : undefined,
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
      return {
        kind: 'text',
        pinyin: [...paragraphs(item.title?.pinyin), ...paragraphs(item.text.pinyin)],
        english: [...paragraphs(item.title?.english), ...paragraphs(item.text.english)],
      };
    case 'cloze':
    case 'paragraph-bank':
      return { kind: 'text', pinyin: paragraphs(item.passage.pinyin), english: paragraphs(item.passage.english) };
    case 'realia':
      return { kind: 'text', pinyin: paragraphs(item.transcript.pinyin), english: paragraphs(item.transcript.english) };
    case 'scene-gap':
    case 'read-pick-picture':
      return null;
  }
}
