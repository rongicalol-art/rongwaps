export interface NarrativeSentenceItem {
  index: number;
  text: string;
  english?: string;
  speaker?: string;
}

export interface NarrativeParagraphGroup<T extends NarrativeSentenceItem> {
  id: number;
  sentences: T[];
  english: string;
}

const DISCOURSE_TRANSITIONS =
  /^(昨天|今天|明天|上個星期|下個星期|這個學期|開始|這次|每年|每天|平常|最近|但是|所以|現在|下午|晚上|節目裡|工廠裡|很多年輕男生|很多外國人|我覺得|今年是我第一次|華人聊天|老師告訴|台灣最有名的|而且)/;

/**
 * Determines whether a reading record represents a solo narrative/reading rather than a multi-speaker dialogue.
 */
export function isNarrativeReading(reading?: {
  dialogueNumber?: number;
  setting?: string;
  title?: string;
  paragraphs?: Array<{ speaker?: string }>;
} | null): boolean {
  if (!reading) return false;
  // Dialogue 1 and Dialogue 2 are always dialogues
  if (reading.dialogueNumber === 1 || reading.dialogueNumber === 2) return false;
  // If title explicitly says Dialogue / 對話, it is always a dialogue
  if (reading.title && (reading.title.includes('對話') || /dialogue/i.test(reading.title))) return false;
  if (reading.setting && (reading.setting.includes('對話') || /^對話/i.test(reading.setting))) return false;

  // Dialogue 3 is always the narrative / short reading
  if (reading.dialogueNumber === 3) return true;
  // Fallbacks for non-numbered readings
  if (reading.title && (reading.title.includes('短文') || /短文|Reading/i.test(reading.title))) return true;
  if (reading.setting && reading.setting.includes('短文')) return true;

  const paragraphs = reading.paragraphs ?? [];
  const speakers = Array.from(new Set(paragraphs.map((p) => p?.speaker).filter(Boolean)));
  if (speakers.length <= 1 && speakers.every((s) => !s || s.toLowerCase() === 'narrator')) return true;
  return false;
}

/**
 * Groups narrative sentences into natural paragraphs for reader mode.
 * 
 * Rules:
 * 1. Short readings (< 135 characters or < 4 sentences) stay as 1 clean, cohesive paragraph.
 * 2. Medium readings with 2 clear movements split into 2 balanced paragraphs.
 * 3. Rich, multi-themed readings (e.g. L8, L9, L12, L14, L15, L16) split into 3 paragraphs
 *    when clear narrative/topic shifts exist.
 * 4. Never creates orphan 1-line fragments unless the sentence is substantive (>= 25 characters).
 * 5. Respects dialogue speaker turns when multi-speaker dialogue lines are passed.
 */
export function groupSentencesIntoParagraphs<T extends NarrativeSentenceItem>(
  sentences: T[],
): NarrativeParagraphGroup<T>[] {
  if (!sentences || sentences.length === 0) {
    return [];
  }

  // If multi-speaker dialogue lines are passed, group by speaker turns
  const distinctSpeakers = Array.from(
    new Set(
      sentences
        .map((s) => s.speaker?.trim())
        .filter((s): s is string => Boolean(s && s.toLowerCase() !== 'narrator')),
    ),
  );
  if (distinctSpeakers.length > 1) {
    const speakerGroups: NarrativeParagraphGroup<T>[] = [];
    let currentTurn: T[] = [];

    sentences.forEach((sentence, idx) => {
      if (idx === 0) {
        currentTurn.push(sentence);
        return;
      }
      const prev = sentences[idx - 1];
      if (sentence.speaker && prev?.speaker && sentence.speaker.trim() !== prev.speaker.trim()) {
        speakerGroups.push({
          id: speakerGroups.length,
          sentences: currentTurn,
          english: currentTurn.map((s) => s.english?.trim()).filter(Boolean).join(' '),
        });
        currentTurn = [];
      }
      currentTurn.push(sentence);
    });

    if (currentTurn.length > 0) {
      speakerGroups.push({
        id: speakerGroups.length,
        sentences: currentTurn,
        english: currentTurn.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      });
    }

    return speakerGroups;
  }

  const totalChars = sentences.reduce((sum, s) => sum + s.text.length, 0);

  // Short readings remain 1 natural, comfortable paragraph (e.g. L1-L7)
  if (totalChars < 135 || sentences.length < 4) {
    return [
      {
        id: 0,
        sentences,
        english: sentences.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      },
    ];
  }

  // Evaluate candidate 3-paragraph splits for longer, multi-part readings
  let best3Splits: [number, number] | null = null;
  let best3Score = -999;

  for (let i = 1; i < sentences.length - 1; i++) {
    for (let j = i + 1; j < sentences.length; j++) {
      const len1 = i;
      const len2 = j - i;
      const len3 = sentences.length - j;

      const c1 = sentences.slice(0, i).reduce((sum, x) => sum + x.text.length, 0);
      const c2 = sentences.slice(i, j).reduce((sum, x) => sum + x.text.length, 0);
      const c3 = sentences.slice(j).reduce((sum, x) => sum + x.text.length, 0);

      // Avoid weak 1-line orphan fragments
      if (c1 < 25 || c2 < 25 || c3 < 25) continue;
      if (len1 === 1 && sentences[0].text.length < 25) continue;
      if (len3 === 1 && sentences[sentences.length - 1].text.length < 25) continue;

      const hasMarker1 = DISCOURSE_TRANSITIONS.test(sentences[i].text.trim());
      const hasMarker2 = DISCOURSE_TRANSITIONS.test(sentences[j].text.trim());

      if (!hasMarker1 && !hasMarker2) continue;

      const markerBonus = (hasMarker1 ? 15 : 0) + (hasMarker2 ? 15 : 0);
      const avgLen = sentences.length / 3;
      const balancePenalty = Math.abs(len1 - avgLen) + Math.abs(len2 - avgLen) + Math.abs(len3 - avgLen);
      const score = markerBonus - balancePenalty * 2;

      if (score > best3Score && (hasMarker1 || hasMarker2)) {
        best3Score = score;
        best3Splits = [i, j];
      }
    }
  }

  if (best3Splits && best3Score >= 20 && totalChars >= 150) {
    const [s1, s2] = best3Splits;
    const p1 = sentences.slice(0, s1);
    const p2 = sentences.slice(s1, s2);
    const p3 = sentences.slice(s2);
    return [
      {
        id: 0,
        sentences: p1,
        english: p1.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      },
      {
        id: 1,
        sentences: p2,
        english: p2.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      },
      {
        id: 2,
        sentences: p3,
        english: p3.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      },
    ];
  }

  // 2-paragraph split fallback for other longer readings
  let splitIndex = -1;
  let bestScore = -999;
  const mid = Math.floor(sentences.length / 2);

  for (let i = 2; i <= sentences.length - 2; i++) {
    const text = sentences[i].text.trim();
    const hasMarker = DISCOURSE_TRANSITIONS.test(text);
    const distFromMid = Math.abs(i - mid);
    const score = (hasMarker ? 15 : 0) - distFromMid * 2;
    if (score > bestScore) {
      bestScore = score;
      splitIndex = i;
    }
  }

  if (splitIndex > 0) {
    const p1 = sentences.slice(0, splitIndex);
    const p2 = sentences.slice(splitIndex);
    return [
      {
        id: 0,
        sentences: p1,
        english: p1.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      },
      {
        id: 1,
        sentences: p2,
        english: p2.map((s) => s.english?.trim()).filter(Boolean).join(' '),
      },
    ];
  }

  return [
    {
      id: 0,
      sentences,
      english: sentences.map((s) => s.english?.trim()).filter(Boolean).join(' '),
    },
  ];
}
