export interface CourseMeasureWord {
  char: string;
  pinyin: string;
}

const MEASURE_NOTE = /\s*\(M:\s*([^)]*)\)/;
const MEASURE_ITEM = /^([\u3400-\u9fff]+)\s+(\S+)$/;

/**
 * Splits a course meaning's measure-word note out of the gloss:
 * "newspaper (M: 份 fèn)" → "newspaper" + [份 fèn]. The meaning is returned
 * unchanged unless every listed item is a clean "<hanzi> <pinyin>" pair.
 */
export function splitCourseMeasureWords(meaning: string): { meaning: string; measureWords: CourseMeasureWord[] } {
  const match = MEASURE_NOTE.exec(meaning);
  if (!match) return { meaning, measureWords: [] };

  const measureWords: CourseMeasureWord[] = [];
  for (const item of match[1].split(',')) {
    const parts = MEASURE_ITEM.exec(item.trim());
    if (!parts) return { meaning, measureWords: [] };
    measureWords.push({ char: parts[1], pinyin: parts[2] });
  }

  const gloss = meaning.replace(MEASURE_NOTE, '').replace(/\s+([;,])/g, '$1').trim();
  return gloss ? { meaning: gloss, measureWords } : { meaning, measureWords: [] };
}
