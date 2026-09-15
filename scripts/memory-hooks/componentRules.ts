export const JUNK_GLOSS = /(heavenly stem|earthly branch|terrestrial branch|kwukyel|component cluster|used in|ancient form|variant of|^radical\b|kangxi|^surname\b|^etc\b)/i;
export const TECHNICAL_LABEL = /\b(heavenly stem|earthly branch|terrestrial branch|surname|radical|variant|kwukyel|cluster|stroke)\b/i;
export const FUNCTION_WORD_LABEL = /^(should|can|could|will|would|shall|may|might|must|the|a|an|of|to|is|are|be|has|have|had|do|does|did|from|by)$/i;

export function usableGlosses(glosses: string[]): string[] {
  return glosses.filter((gloss) => !JUNK_GLOSS.test(gloss) && !/\p{Script=Han}/u.test(gloss));
}

/** Pure stroke shapes: never worth a story part, even when they carry a numeric gloss. */
export const STROKE_GLYPHS = new Set([
  '丨', '丿', '丶', '乙', '亅', '乀', '乁', '乛', '乚', '𠃌', '㇉', '㇇', 'コ', 'ユ',
]);
