import { expandSlashAndOptionalVariants, stripPinyinTones } from './pinyinNormalize';

/** Comparison form for a typed pinyin answer (see `stripPinyinTones`). */
export const normalizePinyinAnswer = stripPinyinTones;

export function getPinyinAnswerVariants(pinyin: string): string[] {
  const variants = expandSlashAndOptionalVariants(pinyin)
    .map(stripPinyinTones)
    .filter(Boolean);

  return [...new Set(variants)];
}

export function isPinyinAnswerAccepted(input: string, pinyin?: string): boolean {
  const normalizedInput = normalizePinyinAnswer(input);
  if (!normalizedInput || !pinyin) return false;

  return getPinyinAnswerVariants(pinyin).includes(normalizedInput);
}
