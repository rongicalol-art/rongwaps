import type { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { findReadingMatch, pronunciationKey } from '../../../utils/pinyin/pronunciationMatching';
import { characterReadings } from '../../../utils/pinyin/characterReadings';
import { wordBopomofo } from '../../../utils/pinyin/bopomofo';
import { numberToToneMarks } from '../../../utils/pinyin/pinyin';
import type { ReadingsIndex } from '../../../utils/pinyin/pronunciation';

const SYLLABLE = /^[a-zü]+[1-5]$/;

/**
 * The tapped character's reading, independent of where the learner places it: the tone it has where it
 * first appears in the word (the book's 一/不 tones as written, a third tone before a third tone said as
 * a second, the first of two listed readings; erhua stays silent), so the tile sounds like the word it builds.
 */
export function wordBuildTileReading(card: Flashcard, char: string, index: ReadingsIndex | null = null): string | undefined {
  if (!/^[㐀-鿿]$/u.test(char)) return undefined;
  if (Array.from(card.front).includes(char)) {
    // Punctuation, digits and Latin letters (這還不容易？, 台北101) carry no reading; the characters line up alone.
    const aligned = characterReadings(card.front, card.pinyin, card.traditional);
    const han = Array.from(card.front).filter((value) => /^[\u3400-\u9fff]$/u.test(value)).join('');
    if (!aligned || aligned.characters.join('') !== han) return undefined;
    const at = aligned.characters.indexOf(char);
    const reading = aligned.readings[at][0];
    // Erhua (一點兒) is not a syllable of its own; it never plays as a standalone er.
    if (!reading || !SYLLABLE.test(reading) || reading === 'r5') return undefined;
    return /3$/.test(reading) && /3$/.test(aligned.readings[at + 1]?.[0] ?? '') ? reading.replace(/3$/, '2') : reading;
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

/**
 * A tile of the word whose sound no recording has (shuí in 水果, neutral xi in 東西): the cloud voice says the
 * character with that exact reading, made once by the server and kept. Only after resolveWordBuildTileAudio found nothing.
 */
export function wordBuildTileSpeech(card: Flashcard, char: string): { text: string; reading: string } | undefined {
  if (!Array.from(card.front).includes(char)) return undefined;
  const reading = wordBuildTileReading(card, char);
  const bopomofo = reading ? wordBopomofo(char, numberToToneMarks(reading)) : null;
  return bopomofo ? { text: char, reading: bopomofo } : undefined;
}
