export * from '../../../shared/dictionaryDefinitions';

/** CEDICT cross-reference senses ("abbr. for Singapore 新加坡", "variant of 嬭") mean nothing to a beginner. */
const REFERENCE_SENSE_RE = /^(?:abbr\.|(?:old |archaic |popular )?variant of\b)/i;

/** Hover gloss for beginners: no cross-references, no long parenthetical notes. */
export function beginnerDefinitions(defs: string[]): string[] {
  return defs
    .filter((d) => !REFERENCE_SENSE_RE.test(d))
    .map((d) => d.replace(/\s*\((?:Note:|[^)]{40,})[^)]*\)/gi, '').trim())
    .filter(Boolean);
}
