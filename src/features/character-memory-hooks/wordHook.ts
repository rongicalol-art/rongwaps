const HANZI_RE = /\p{Script=Han}/u;

/** Mnemonic cache key for a vocabulary word (mirrors `mnemonicCache` key format). */
export function wordMnemonicKey(front: string): string {
  return `word_${front}`;
}

/**
 * Memory hooks are offered for any card containing Chinese characters,
 * providing consistency across single-character and multi-character cards.
 */
export function shouldShowWordHook(front: string): boolean {
  return [...front].some((char) => HANZI_RE.test(char));
}
