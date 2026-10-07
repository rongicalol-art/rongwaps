export const DICTIONARY_SHARD_COUNT = 64;

export function getDictionaryShard(word: string): number {
  let hash = 0;
  for (const character of word) {
    hash = ((hash * 31) + (character.codePointAt(0) || 0)) >>> 0;
  }
  return hash % DICTIONARY_SHARD_COUNT;
}
