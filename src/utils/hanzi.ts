/** Matches CJK ideographs, CJK radicals, and extension blocks (including rare chars). */
const HANZI_RE =
  /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2FDF\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}]/u;

/** Whether a single character is a Chinese glyph worth interactive treatment. */
export function isHanziChar(char: string): boolean {
  return HANZI_RE.test(char);
}

/**
 * Whether a character is in the standard CJK Unified Ideographs block
 * (U+4E00 to U+9FFF), excluding rare extensions (Ext-A/B/C) and radical symbols.
 */
export function isStandardHanzi(char: string): boolean {
  if (!char || Array.from(char).length !== 1) return false;
  const code = char.codePointAt(0);
  return code !== undefined && code >= 0x4e00 && code <= 0x9fff;
}

