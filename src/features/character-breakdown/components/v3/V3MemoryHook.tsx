import { MemoryHookBlock } from '../../../character-memory-hooks';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';

/**
 * "Memory Hook" block for the V3 breakdown summary.
 * Thin adapter over the shared `MemoryHookBlock` so the character surface and
 * the dictionary word surface render the identical hook card (nothing when the character has none).
 */
export function V3MemoryHook({ character, pinyin }: { character: string; pinyin?: string }) {
  return <MemoryHookBlock cacheKey={character} word={character} pinyin={pinyin ? numberToToneMarks(pinyin) : undefined} />;
}
