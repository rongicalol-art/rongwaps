import type {
  GrammarExerciseTile,
  GrammarLessonText,
  GrammarWordToken,
} from '../../types/models';

export interface GrammarLexeme {
  traditional: string;
  simplified?: string;
  pinyin: string;
  meaning: string;
}

export function lexeme(
  traditional: string,
  pinyin: string,
  meaning: string,
  simplified?: string,
): GrammarLexeme {
  return { traditional, simplified, pinyin, meaning };
}

export function grammarToken(
  id: string,
  lexicon: GrammarLexeme[],
  traditional: string,
  options: Partial<Pick<GrammarWordToken, 'prefix' | 'suffix'>> = {},
): GrammarWordToken {
  const entry = lexicon.find((candidate) => candidate.traditional === traditional);
  if (!entry) throw new Error(`Missing Lesson 2 lexeme: ${traditional}`);
  return { id, ...entry, ...options };
}

export function teachingGlossary(scope: string, lexicon: GrammarLexeme[]) {
  return lexicon.map((entry, index) => ({
    id: `${scope}-glossary-${index + 1}`,
    ...entry,
  }));
}

export function answerTile(
  id: string,
  traditional: string,
  pinyin: string,
  meaning: string,
  simplified?: string,
): GrammarExerciseTile {
  return { id, traditional, simplified, pinyin, meaning };
}

function tokenizeGrammarText(
  scope: string,
  text: string,
  lexicon: GrammarLexeme[],
): GrammarWordToken[] {
  const orderedLexicon = [...lexicon].sort(
    (left, right) => right.traditional.length - left.traditional.length,
  );
  const words: GrammarWordToken[] = [];
  let pending = '';
  let index = 0;

  while (index < text.length) {
    const entry = orderedLexicon.find((candidate) => text.startsWith(candidate.traditional, index));
    if (!entry) {
      pending += text[index];
      index += 1;
      continue;
    }

    words.push({
      id: `${scope}-word-${words.length + 1}`,
      ...entry,
      ...(pending ? { prefix: pending } : {}),
    });
    pending = '';
    index += entry.traditional.length;
  }

  if (pending && words.length > 0) {
    words[words.length - 1] = {
      ...words[words.length - 1],
      suffix: `${words[words.length - 1].suffix ?? ''}${pending}`,
    };
  }

  return words;
}

export function grammarText(
  scope: string,
  traditional: string,
  simplified: string,
  pinyin: string,
  english: string,
  lexicon: GrammarLexeme[],
): GrammarLessonText {
  return {
    traditional,
    simplified,
    pinyin,
    english,
    words: tokenizeGrammarText(scope, traditional, lexicon),
  };
}
