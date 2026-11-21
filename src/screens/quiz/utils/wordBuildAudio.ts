import type { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { findReadingMatch, pronunciationKey } from '../../../utils/pinyin/pronunciationMatching';
import { characterReadings } from '../../../utils/pinyin/characterReadings';
import type { ReadingsIndex } from '../../../utils/pinyin/pronunciation';

const SYLLABLE = /^[a-zü]+[1-5]$/;

/** The letters of a reading without its tone: xi5 -> xi. */
const letters = (reading: string) => reading.slice(0, -1);

/**
 * The tapped character's own sound, independent of where the learner places it. A tile is the character on
 * its own, so tone changes that only happen inside the word are left out (你 nǐ, 一 yī, 不 bù, 西 xī in 東西,
 * 兒 ér in 一點兒; the book writes third tones as citation tones already). The word decides only when the
 * character has a different reading there (行 háng in 銀行, 長 zhǎng in 長大, 好 hào in 愛好).
 */
export function wordBuildTileReading(card: Flashcard, char: string, index: ReadingsIndex | null = null): string | undefined {
  if (!/^[\u3400-\u9fff]$/u.test(char)) return undefined;
  if (Array.from(card.front).includes(char)) {
    // Punctuation, digits and Latin letters (這還不容易？, 台北101) carry no reading; the characters line up alone.
    const aligned = characterReadings(card.front, card.pinyin, card.traditional);
    const han = Array.from(card.front).filter((value) => /^[\u3400-\u9fff]$/u.test(value)).join('');
    if (!aligned || aligned.characters.join('') !== han) return undefined;
    const reading = aligned.readings[aligned.characters.indexOf(char)][0];
    if (!reading || !SYLLABLE.test(reading)) return undefined;
    if (char === '一') return 'yi1';
    if (char === '不') return 'bu4';
    if (reading === 'r5') return 'er2'; // Erhua: the character 兒 itself.
    if (!/5$/.test(reading)) return reading;
    // A neutral tone: the character's own tone with the same spelling (東西 xi -> xī); a particle that is only
    // ever neutral (了 le, 嗎 ma) keeps it.
    return (index?.get(char) ?? []).map((entry) => pronunciationKey(entry.pinyin))
      .find((key): key is string => Boolean(key && SYLLABLE.test(key) && !/5$/.test(key) && letters(key) === letters(reading)))
      ?? (index ? reading : undefined);
  }
  // Distractors have no word context: only an unambiguous indexed reading is safe, and 一/不 change tone.
  if (/[一不]/.test(char)) return undefined;
  const readings = new Set((index?.get(char) ?? []).map((reading) => pronunciationKey(reading.pinyin) ?? undefined));
  const [reading] = readings;
  return readings.size === 1 && reading && SYLLABLE.test(reading) ? reading : undefined;
}

/**
 * A distractor has no word context, but the course itself may pin its reading
 * (單字 vocabulary like 可 kě). Only a single taught reading is safe; a course
 * alternation (還 hái / huán) stays silent like any other polyphonic tile.
 */
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

/** The book's own recording of the character, else the recorded syllable. No whole-word fallback on a tile tap: it could reveal the answer. */
export function resolveWordBuildTileAudio(
  card: Flashcard,
  char: string,
  recordings: Map<string, Flashcard>,
  sounds?: Map<string, string>,
  index: ReadingsIndex | null = null,
): string | undefined {
  const reading = wordBuildTileReading(card, char, index)
    ?? (!Array.from(card.front).includes(char) ? courseCharacterReading(recordings, char) : undefined);
  if (!reading) return undefined;
  const recording = findReadingMatch(recordings, [char], reading);
  return recording?.audio && audioService.isAudioFileName(recording.audio) ? recording.audio
    : sounds?.get(reading);
}

