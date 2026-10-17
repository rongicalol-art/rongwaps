/**
 * Pedagogical role classifications for grammar highlights.
 *
 * Provides consistent 3-tier semantic color coding across explanations, titles,
 * and grammar sentences:
 * - 'contrast': Negations, opposing pairs, or alternatives (Rose: text-rose-700)
 * - 'number': Numerals, amounts, and quantity slots (Teal: text-teal-700)
 * - 'target': Core grammar particles, anchors, and standard targets (Brand blue: text-brand-primary)
 */

export type GrammarSemanticRole = 'contrast' | 'number' | 'target';

const NEGATION_EXACT = new Set([
  '不', '沒', '没', '別', '别', '難', '难',
  '不一樣', '不一样', '不可以', '不能', '不會', '不会',
  '不在', '不有', '不對', '不对', '沒有', '没有',
]);

const NUMBER_EXACT = new Set([
  '零', '一', '二', '兩', '两', '三', '四', '五', '六', '七', '八', '九', '十',
  '百', '千', '萬', '万', '幾', '几', '多',
]);

const CHINESE_DIGITS_REGEX = /^[零一二兩两三四五六七八九十百千萬万幾几多0-9]+$/;

export function getGrammarSemanticRole(text: string): GrammarSemanticRole {
  const trimmed = text.trim();
  if (NEGATION_EXACT.has(trimmed)) {
    return 'contrast';
  }
  if (NUMBER_EXACT.has(trimmed) || CHINESE_DIGITS_REGEX.test(trimmed)) {
    return 'number';
  }
  if (/^(不|沒|没有|難|难)/.test(trimmed) && trimmed.length <= 4) {
    return 'contrast';
  }
  return 'target';
}

export function getSemanticRoleClasses(role: GrammarSemanticRole): string {
  switch (role) {
    case 'contrast':
      return 'text-rose-700 dark:text-rose-400';
    case 'number':
      return 'text-teal-700 dark:text-teal-400';
    case 'target':
    default:
      return 'text-brand-primary';
  }
}

export function getSemanticRoleSoftBgClasses(role: GrammarSemanticRole): string {
  switch (role) {
    case 'contrast':
      return 'hover:bg-rose-50 dark:hover:bg-rose-950/30 focus-visible:bg-rose-50 active:bg-rose-50';
    case 'number':
      return 'hover:bg-teal-50 dark:hover:bg-teal-950/30 focus-visible:bg-teal-50 active:bg-teal-50';
    case 'target':
    default:
      return 'hover:bg-brand-primary-soft focus-visible:bg-brand-primary-soft active:bg-brand-primary-soft';
  }
}
