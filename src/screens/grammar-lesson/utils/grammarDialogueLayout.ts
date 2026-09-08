import type { GrammarLessonText, GrammarWordToken } from '../../../types/models';

export interface DialogueTurn {
  speaker: string;
  raw: string;
  words: GrammarWordToken[];
  pinyin: string;
  english: string;
}

export interface SplitDialogueResult {
  isDialogue: boolean;
  turns: DialogueTurn[];
  aRaw: string;
  bRaw: string;
  aWords: GrammarWordToken[];
  bWords: GrammarWordToken[];
  pinyinA: string;
  pinyinB: string;
  englishA: string;
  englishB: string;
}

/**
 * Detects if a grammar example text contains a speaker dialogue (e.g. A: ... B: ...)
 * and cleanly splits it into separate speaker turns for words, pinyin, and English.
 */
export function splitDialogueText(
  text: GrammarLessonText | null | undefined,
  characterPreference: 'traditional' | 'simplified' = 'traditional',
): SplitDialogueResult | null {
  if (!text) return null;

  const rawText = characterPreference === 'simplified' && text.simplified
    ? text.simplified
    : text.traditional;

  if (!rawText) return null;

  const speakerRegex = /(?:^|\s*)([A-Z][:：])\s*/g;
  const matches = [...rawText.matchAll(speakerRegex)];
  if (matches.length < 2) return null;

  const turns: DialogueTurn[] = [];
  for (let i = 0; i < matches.length; i++) {
    const speaker = matches[i][1].replace('：', ':');
    const startIndex = (matches[i].index ?? 0) + matches[i][0].length;
    const endIndex = i + 1 < matches.length ? (matches[i + 1].index ?? rawText.length) : rawText.length;
    const raw = rawText.slice(startIndex, endIndex).trim();
    turns.push({ speaker, raw, words: [], pinyin: '', english: '' });
  }

  // Pinyin
  if (text.pinyin) {
    const pMatches = [...text.pinyin.matchAll(speakerRegex)];
    if (pMatches.length >= turns.length) {
      for (let i = 0; i < turns.length; i++) {
        const start = (pMatches[i].index ?? 0) + pMatches[i][0].length;
        const end = i + 1 < pMatches.length ? (pMatches[i + 1].index ?? text.pinyin.length) : text.pinyin.length;
        turns[i].pinyin = text.pinyin.slice(start, end).trim();
      }
    } else {
      const pParts = text.pinyin.split(/\s+(?=[B-Z][:：])/);
      turns.forEach((turn, i) => {
        if (pParts[i]) {
          turn.pinyin = pParts[i].replace(/^[A-Z][:：]\s*/, '').trim();
        }
      });
    }
  }

  // English
  if (text.english) {
    const eMatches = [...text.english.matchAll(speakerRegex)];
    if (eMatches.length >= turns.length) {
      for (let i = 0; i < turns.length; i++) {
        const start = (eMatches[i].index ?? 0) + eMatches[i][0].length;
        const end = i + 1 < eMatches.length ? (eMatches[i + 1].index ?? text.english.length) : text.english.length;
        turns[i].english = text.english.slice(start, end).trim();
      }
    } else {
      const eParts = text.english.split(/\s+(?=[B-Z][:：])/);
      turns.forEach((turn, i) => {
        if (eParts[i]) {
          turn.english = eParts[i].replace(/^[A-Z][:：]\s*/, '').trim();
        }
      });
    }
  }

  // Words
  if (text.words && text.words.length > 0) {
    let remainingWords = text.words.map((w, i) => {
      if (i === 0 && w.prefix) {
        const clean = w.prefix.replace(/^[A-Z][:：]\s*/, '');
        return { ...w, prefix: clean || undefined };
      }
      return { ...w };
    });

    for (let t = 1; t < turns.length; t++) {
      const bIndex = remainingWords.findIndex((w, i) => i > 0 && w.prefix && /[B-Z][:：]/.test(w.prefix));

      if (bIndex !== -1) {
        const bWord = remainingWords[bIndex];
        const pMatch = bWord.prefix?.match(/^(.*?)\s*([B-Z][:：])\s*(.*)$/);
        const trailingPunct = pMatch ? pMatch[1] : '';
        const restPrefix = pMatch ? pMatch[3] : '';

        const prevTurnWords = remainingWords.slice(0, bIndex);
        if (trailingPunct && prevTurnWords.length > 0) {
          const lastPrev = prevTurnWords[prevTurnWords.length - 1];
          lastPrev.suffix = (lastPrev.suffix || '') + trailingPunct;
        }
        turns[t - 1].words = prevTurnWords;

        const bCleanFirst: GrammarWordToken = {
          ...bWord,
          prefix: restPrefix || undefined,
        };
        remainingWords = [bCleanFirst, ...remainingWords.slice(bIndex + 1)];
      } else {
        const punctIdx = remainingWords.findIndex(
          (w, i) => i < remainingWords.length - 1 && w.suffix && /[？?。.]/.test(w.suffix),
        );
        if (punctIdx !== -1) {
          turns[t - 1].words = remainingWords.slice(0, punctIdx + 1);
          remainingWords = remainingWords.slice(punctIdx + 1);
        } else {
          const cleanTurn = turns[t - 1].raw.replace(/[^\u4E00-\u9FFF]/g, '');
          let count = 0;
          let splitIdx = 1;
          for (let i = 0; i < remainingWords.length; i++) {
            const wordText = characterPreference === 'simplified' && remainingWords[i].simplified
              ? remainingWords[i].simplified
              : remainingWords[i].traditional;
            const cChars = (wordText ?? '').replace(/[^\u4E00-\u9FFF]/g, '').length;
            count += cChars;
            if (count >= cleanTurn.length) {
              splitIdx = i + 1;
              break;
            }
          }
          turns[t - 1].words = remainingWords.slice(0, splitIdx);
          remainingWords = remainingWords.slice(splitIdx);
        }
      }
    }
    turns[turns.length - 1].words = remainingWords;
  }

  return {
    isDialogue: true,
    turns,
    aRaw: turns[0]?.raw ?? '',
    bRaw: turns[1]?.raw ?? '',
    aWords: turns[0]?.words ?? [],
    bWords: turns[1]?.words ?? [],
    pinyinA: turns[0]?.pinyin ?? '',
    pinyinB: turns[1]?.pinyin ?? '',
    englishA: turns[0]?.english ?? '',
    englishB: turns[1]?.english ?? '',
  };
}
