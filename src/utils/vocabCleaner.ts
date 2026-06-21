/**
 * Vocabulary text cleaning utilities
 * Handles edge cases in vocabulary data from Supabase
 */

/**
 * Clean a vocabulary word/text for mnemonic generation.
 * - Strips parenthetical content: "你好(吗)" → "你好"
 * - Takes only the first variant before "/": "你好/您好" → "你好"
 * - Trims whitespace
 */
export function cleanVocabText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // Remove parenthetical content (optional characters)
  // e.g. "你好(吗)" → "你好"
  cleaned = cleaned.replace(/\(.*?\)/g, '');

  // Take only the first variant before "/"
  // e.g. "你好/您好" → "你好"
  const slashIndex = cleaned.indexOf('/');
  if (slashIndex !== -1) {
    cleaned = cleaned.substring(0, slashIndex);
  }

  return cleaned.trim();
}

/**
 * Split a vocabulary entry into individual words if it contains slashes.
 * Returns array of cleaned words.
 * e.g. "你好/您好" → ["你好", "您好"]
 */
export function splitVocabVariants(text: string): string[] {
  if (!text) return [];
  return text.split('/').map(v => v.trim()).filter(v => v.length > 0);
}
