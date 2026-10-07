import type { DialogueAlignment, ReadingParagraph, ReadingRecord } from '../../../types/models';
import { getWordChunks, type PhraseChunk } from '../../../utils/pinyin/rubyPinyin';
import { getDialogueSpeakerColorMap, getSpeakerDotColor } from '../../../utils/lesson/speakerColors';
import { getCharacterForSpeaker } from '../../../utils/lesson/speakerCharacters';
import { splitChunksIntoSentences, type DialogueSentenceItem } from '../../../utils/lesson/dialogueSync';
import { overlapsAnyLocatedRange, type ReaderLocatedRange } from './readerLocate';

/** Speakers that always sit on the left in two-person dialogues. */
const LEFT_ANCHOR_SPEAKERS = new Set(['老師', '媽媽', '醫生', '女店員', '店員']);
/** In 3+ person dialogues, the primary student protagonist answers as "You". */
const STUDENT_PRIORITY = ['中明', '家樂', '宜文', '友美', '國安', '元真'];

export function pickRightSpeaker(speakers: string[]): string | null {
  if (speakers.length < 2) return null;

  // In 2-person dialogues: anchor authority/elder/clerks to the left
  if (speakers.length === 2) {
    if (LEFT_ANCHOR_SPEAKERS.has(speakers[0]) && !LEFT_ANCHOR_SPEAKERS.has(speakers[1])) return speakers[1];
    if (LEFT_ANCHOR_SPEAKERS.has(speakers[1]) && !LEFT_ANCHOR_SPEAKERS.has(speakers[0])) return speakers[0];
    return speakers[1];
  }

  // In 3+ person dialogues: pick the primary student protagonist who acts as "You" / responder
  for (const candidate of STUDENT_PRIORITY) {
    if (speakers.includes(candidate)) return candidate;
  }

  return speakers[1] || null;
}

export interface SentenceRange {
  charStart: number;
  charEnd: number;
}

/** One dialogue line pre-computed for rendering: chunks, sentences, speaker chrome. */
export interface ReadingCanvasLine {
  index: number;
  paragraph: ReadingParagraph;
  isNarrator: boolean;
  isRightAligned: boolean;
  speakerDotColor: string;
  speakerChar: ReturnType<typeof getCharacterForSpeaker>;
  avatarInitial: string;
  chunks: PhraseChunk[];
  sentences: DialogueSentenceItem[];
  sentenceRanges: SentenceRange[];
}

export interface BuildReadingLinesInput {
  reading: ReadingRecord;
  alignment: DialogueAlignment | null;
  characterPreference: 'traditional' | 'simplified';
  rightSpeaker: string | null;
}

/**
 * Pre-computes chunks, sentences, and speaker presentation for every
 * paragraph once per reading/alignment/script change.
 */
export function buildReadingLines({
  reading,
  alignment,
  characterPreference,
  rightSpeaker,
}: BuildReadingLinesInput): ReadingCanvasLine[] {
  const speakerColorMap = getDialogueSpeakerColorMap(reading.paragraphs);

  return reading.paragraphs.map((paragraph, index) => {
    const text = characterPreference === 'simplified'
      ? paragraph.simplified
      : paragraph.traditional;
    const lineAlignment = alignment?.lines[index];
    const chunks = getWordChunks(text, paragraph.pinyin, lineAlignment);
    const isNarrator = !paragraph.speaker || paragraph.speaker.toLowerCase() === 'narrator';
    const isRightAligned = !isNarrator && Boolean(rightSpeaker && paragraph.speaker === rightSpeaker);
    const sentences = splitChunksIntoSentences(chunks, index, lineAlignment?.start, lineAlignment?.end);
    // Chunks partition the line, so accumulating sentence text lengths gives
    // each sentence's character range for the grammar locate highlight.
    let sentenceOffset = 0;
    const sentenceRanges = sentences.map((sentence) => {
      const range = { charStart: sentenceOffset, charEnd: sentenceOffset + sentence.text.length };
      sentenceOffset = range.charEnd;
      return range;
    });

    return {
      index,
      paragraph,
      isNarrator,
      isRightAligned,
      speakerDotColor: getSpeakerDotColor(paragraph.speaker, speakerColorMap),
      speakerChar: getCharacterForSpeaker(paragraph.speaker),
      avatarInitial: paragraph.speaker ? paragraph.speaker[0] : '？',
      chunks,
      sentences,
      sentenceRanges,
    };
  });
}

/** True when a sentence's character range overlaps any located grammar range. */
export function isSentenceLocated(
  paragraphIndex: number,
  range: SentenceRange | undefined,
  locatedGrammarRanges: readonly ReaderLocatedRange[],
): boolean {
  if (!range) return false;
  return overlapsAnyLocatedRange({ paragraphIndex, ...range }, locatedGrammarRanges);
}
