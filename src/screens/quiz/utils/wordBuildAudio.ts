import type { Flashcard } from '../../../data/flashcards';
import { audioService } from '../../../services/audioService';
import { findReadingMatch, pronunciationKey } from '../../../utils/pinyin/pronunciationMatching';
import { characterReadings } from '../../../utils/pinyin/characterReadings';
import type { ReadingsIndex } from '../../../utils/pinyin/pronunciation';

/** The tapped character's reading, independent of where the learner places it. */
export function wordBuildTileReading(card: Flashcard, char: string, index: ReadingsIndex | null = null): string | undefined {
  if (!/^[\u3400-\u9fff]$/u.test(char) || /[一不]/.test(char)) return undefined;
  const characters = Array.from(card.front);
  const positions = characters.flatMap((value, i) => value === char ? [i] : []);
  let readings: Array<string | undefined>;
  if (positions.length) {
    const aligned = characterReadings(card.front, card.pinyin, card.traditional);
    if (!aligned || aligned.characters.join('') !== card.front) return undefined;
    // An actual third-tone change needs the complete word, not a citation-tone clip.
    if (positions.some((i) => aligned.readings[i].some((reading) => /3$/.test(reading))
      && aligned.readings[i + 1]?.some((reading) => /3$/.test(reading)))) return undefined;
    readings = positions.flatMap((i) => aligned.readings[i]);
  } else {
    // Distractors have no word context: only an unambiguous indexed reading is safe.
    readings = (index?.get(char) ?? []).map((reading) => pronunciationKey(reading.pinyin) ?? undefined);
  }
  const unique = new Set(readings);
  const reading = readings[0];
  return unique.size === 1 && reading && /^[a-zü]+[1-5]$/.test(reading) ? reading : undefined;
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
    if (!/^[a-zü]+[1-5]$/.test(value)) continue;
    if (reading && reading !== value) return undefined;
    reading = value;
  }
  return reading;
}

/** No whole-word fallback on a tile tap: it could reveal the answer. */
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
  return recording?.audio && audioService.isAudioFileName(recording.audio) ? recording.audio : sounds?.get(reading);
}
