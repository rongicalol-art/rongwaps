import { definitionStrings } from '../../../shared/dictionaryDefinitions';
import { pronunciationKey, sameReading } from '../pinyin/pronunciationMatching';

export * from '../../../shared/dictionaryDefinitions';

const READING_LINE_RE = /^\[([^\]]+)\]:\s*(.+)$/;

/**
 * Senses for one reading of a merged dictionary row, or null when the row has
 * no such reading. Merged rows carry only their first reading as `pinyin`;
 * each later reading lists its senses, then a "[reading]: senses, joined" line
 * (啊 ā … "[a]: modal particle …").
 * `tolerant` (with the word) accepts the book's tones for CEDICT's neutral/一/不 ones;
 * callers try the exact reading across all rows first.
 */
export function sensesForReading(
  entry: { pinyin?: string[] | null; definitions: unknown },
  reading: string,
  tolerant?: { word: string; neutral?: boolean },
): string[] | null {
  const target = pronunciationKey(reading);
  if (!target) return null;
  const matches = (value: string) => (tolerant ? sameReading(value, reading, tolerant.word, tolerant.neutral ?? true) : pronunciationKey(value) === target);
  const tagged: string[] = [];
  let pending: string[] = [];
  for (const line of definitionStrings(entry.definitions)) {
    const match = READING_LINE_RE.exec(line.trim());
    if (!match) { pending.push(line); continue; }
    const summary = match[2].trim();
    // The tagged line repeats the senses listed just above it; claim those.
    let size = pending.length;
    while (size > 0 && pending.slice(-size).join(', ') !== summary) size -= 1;
    const senses = size > 0 ? pending.slice(-size) : [summary];
    pending = pending.slice(0, pending.length - size);
    if (matches(match[1])) tagged.push(...senses);
  }
  if (tagged.length) return tagged;
  return entry.pinyin?.some(matches) ? pending : null;
}

/** CEDICT cross-reference senses ("abbr. for Singapore 新加坡", "variant of 嬭") mean nothing to a beginner. */
const REFERENCE_SENSE_RE = /^(?:abbr\.|(?:old |archaic |popular )?variant of\b)/i;

/** Hover gloss for beginners: no cross-references, no long parenthetical notes. */
export function beginnerDefinitions(defs: string[]): string[] {
  return defs
    .filter((d) => !REFERENCE_SENSE_RE.test(d))
    .map((d) => d.replace(/\s*\((?:Note:|[^)]{40,})[^)]*\)/gi, '').trim())
    .filter(Boolean);
}
