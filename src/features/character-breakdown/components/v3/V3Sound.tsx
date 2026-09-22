import { SoundBlock, useSoundHook } from '../../../character-memory-hooks';

/**
 * "Sound" block for the V3 breakdown summary. Reads the static Sound pack;
 * renders nothing when the character has no entry.
 */
export function V3Sound({ character, onGlyphClick }: { character: string; onGlyphClick?: (glyph: string) => void }) {
  const { sound, loaded } = useSoundHook(character, true);
  if (!loaded || !sound) return null;
  return <SoundBlock entry={sound} onGlyphClick={onGlyphClick} />;
}
