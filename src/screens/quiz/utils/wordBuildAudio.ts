import type { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { findReadingMatch, pronunciationKey } from '../../../utils/pinyin/pronunciationMatching';
import { characterReadings } from '../../../utils/pinyin/characterReadings';
import type { ReadingsIndex } from '../../../utils/pinyin/pronunciation';

const SYLLABLE = /^[a-zü]+[1-5]$/;

/** The letters of a reading without its tone: xi5 -> xi. */
const letters = (reading: string) => reading.slice(0, -1);

/**
 * A reading as the character says it alone: 一 yī, 不 bù, erhua as 兒 ér, and a neutral tone as the character's own
 * tone with the same spelling (東西 xi -> xī); a particle that is only ever neutral (了 le, 嗎 ma) keeps it.
 */
function ownSound(char: string, reading: string, index: ReadingsIndex | null): string | undefined {
  if (char === '一') return 'yi1';
  if (char === '不') return 'bu4';
  if (reading === 'r5') return 'er2';
  if (!/5$/.test(reading)) return reading;
  return (index?.get(char) ?? []).map((entry) => pronunciationKey(entry.pinyin))
    .find((key): key is string => Boolean(key && SYLLABLE.test(key) && !/5$/.test(key) && letters(key) === letters(reading)))
    ?? (index ? reading : undefined);
}

/**
 * The tapped character's own sound, independent of where the learner places it. A tile is the character on
 * its own, so tone changes that only happen inside the word are left out (你 nǐ, 一 yī, 不 bù, 西 xī in 東西,
 * 兒 ér in 一點兒; the book writes third tones as citation tones already). The word decides only when the
 * character has a different reading there (行 háng in 銀行, 長 zhǎng in 長大, 好 hào in 愛好). A wrong-answer
 * tile has no word, so it says the character's main reading (中 zhōng, 長 cháng; course readings come first).
 */
export function wordBuildTileReading(card: Flashcard, char: string, index: ReadingsIndex | null = null): string | undefined {
  if (!/^[\u3400-\u9fff]$/u.test(char)) return undefined;
  let reading: string | undefined;
  if (Array.from(card.front).includes(char)) {
    // Punctuation, digits and Latin letters (這還不容易？, 台北101) carry no reading; the characters line up alone.
    const aligned = characterReadings(card.front, card.pinyin, card.traditional);
    const han = Array.from(card.front).filter((value) => /^[\u3400-\u9fff]$/u.test(value)).join('');
    if (!aligned || aligned.characters.join('') !== han) return undefined;
    reading = aligned.readings[aligned.characters.indexOf(char)][0];
  } else {
    reading = pronunciationKey(index?.get(char)?.[0]?.pinyin) ?? undefined;
  }
  return reading && SYLLABLE.test(reading) ? ownSound(char, reading, index) : undefined;
}

/** Before the reading list has loaded, a wrong-answer tile can still use the one reading the course teaches (可 kě). */
function courseCharacterReading(recordings: Map<string, Flashcard>, char: string): string | undefined {
  const prefix = `${char}\u0000`;
  let reading: string | undefined;
  for (const key of recordings.keys()) {
    if (!key.startsWith(prefix)) continue;
    const value = key.slice(prefix.length);
    if (!SYLLABLE.test(value)) continue;
    if (reading && reading !== value) return undefined;
    reading = value;
  }
  return reading;
}

/** The reading a tile says: its own sound, or for a wrong-answer tile the one reading the course teaches. */
export function wordBuildTileSound(card: Flashcard, char: string, recordings: Map<string, Flashcard>, index: ReadingsIndex | null = null): string | undefined {
  return wordBuildTileReading(card, char, index)
    ?? (!Array.from(card.front).includes(char) ? courseCharacterReading(recordings, char) : undefined);
}

/** The book's own recording of the character, else the recorded syllable. No whole-word fallback on a tile tap: it could reveal the answer. */
export function resolveWordBuildTileAudio(
  card: Flashcard,
  char: string,
  recordings: Map<string, Flashcard>,
  sounds?: Map<string, string>,
  index: ReadingsIndex | null = null,
): string | undefined {
  const reading = wordBuildTileSound(card, char, recordings, index);
  if (!reading) return undefined;
  const recording = findReadingMatch(recordings, [char], reading);
  return recording?.audio && audioService.isAudioFileName(recording.audio) ? recording.audio
    : sounds?.get(reading);
}

