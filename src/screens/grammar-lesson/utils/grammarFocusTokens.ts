import type { GrammarWordToken } from '../../../types/models';

/** Negators that belong to the grammar unit they sit in front of (不是, 沒有, 別去). */
const NEGATORS = new Set(['不', '沒', '没', '別', '别']);
const CJK_REGEX = /[㐀-鿿豈-﫿]/;

const tokenText = (word: GrammarWordToken, characterPreference: 'traditional' | 'simplified') =>
  characterPreference === 'simplified' && word.simplified ? word.simplified : word.traditional;

/**
 * Which tokens of a sentence belong to the lesson's grammar point.
 *
 * Terms are matched against the sentence text, longest first (the same rule the
 * title and explanation use), so multi-character patterns such as 忙不忙 or 有沒有
 * light up even when the sentence is segmented into smaller tokens. A negator
 * directly in front of a highlighted token joins it, so 不是 reads as one unit.
 * Non-Chinese terms are teaching labels, not sentence content, and are ignored.
 */
export function getFocusTokenIds(
  words: GrammarWordToken[],
  focusTerms: string[],
  characterPreference: 'traditional' | 'simplified',
): Set<string> {
  const terms = [...new Set(focusTerms.filter((term) => term && CJK_REGEX.test(term) && !/[A-Za-z→–]/.test(term)))]
    .sort((a, b) => b.length - a.length);
  const focused = new Set<string>();
  if (terms.length === 0 || words.length === 0) return focused;

  const texts = words.map((word) => tokenText(word, characterPreference));
  const starts: number[] = [];
  let sentence = '';
  for (const text of texts) {
    starts.push(sentence.length);
    sentence += text;
  }

  const covered = new Array<boolean>(sentence.length).fill(false);
  for (const term of terms) {
    let from = sentence.indexOf(term);
    while (from !== -1) {
      const end = from + term.length;
      if (!covered.slice(from, end).some(Boolean)) covered.fill(true, from, end);
      from = sentence.indexOf(term, from + 1);
    }
  }

  words.forEach((word, index) => {
    const length = texts[index].length;
    if (length > 0 && covered.slice(starts[index], starts[index] + length).some(Boolean)) focused.add(word.id);
  });

  words.forEach((word, index) => {
    if (!focused.has(word.id) && NEGATORS.has(texts[index]) && words[index + 1] && focused.has(words[index + 1].id)) {
      focused.add(word.id);
    }
  });

  return focused;
}
