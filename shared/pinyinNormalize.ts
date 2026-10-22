/**
 * One owner for pinyin/text variant normalization, shared by the answer
 * checker, vocabulary search, and reader matching.
 *
 * Two rules live here:
 *  - `stripPinyinTones`: comparison form for pinyin — lowercase, tone marks
 *    and tone numbers removed, `u:`/`v` folded to `u`, everything non-Latin
 *    dropped.
 *  - `expandSlashAndOptionalVariants`: every spelling a term may be written
 *    as — slash alternates (`你好/妳好`) and optional （…） parts expanded to
 *    all combinations (`（一）點（兒）` → 一點兒 / 一點 / 點兒 / 點).
 */

const OPTIONAL_GROUP_PATTERN = /[（(]([^()（）]*)[）)]/;

/** Every combination of the optional parenthesized groups in a term. */
export function expandOptionalGroups(value: string): string[] {
  const match = value.match(OPTIONAL_GROUP_PATTERN);
  if (!match || match.index === undefined) return [value];

  const before = value.slice(0, match.index);
  const after = value.slice(match.index + match[0].length);

  return [
    ...expandOptionalGroups(`${before}${after}`),
    ...expandOptionalGroups(`${before}${match[1]}${after}`),
  ];
}

/** Lowercased pinyin stripped of tone marks, tone numbers, and separators. */
export function stripPinyinTones(value: string): string {
  return value
    .toLowerCase()
    .replace(/u:/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[1-5]/g, '')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '');
}

/** Slash alternates and optional parts expanded to every spelling, deduped. */
export function expandSlashAndOptionalVariants(value: string): string[] {
  const variants = value
    .split(/[/／]/)
    .flatMap(expandOptionalGroups)
    .map((variant) => variant.trim())
    .filter(Boolean);

  return [...new Set(variants)];
}
