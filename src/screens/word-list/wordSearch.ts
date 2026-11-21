import { WORD_LIST_LEVELS, wordListPath, type WordListLevel } from '../../app/routes';
import { loadWordList } from './wordListData';
import { wordListInfo } from './wordListMeta';
import type { ListWord } from './wordListTypes';

export interface WordSearchHit {
  word: ListWord;
  entry: WordListLevel;
  /** The page of the level's list that shows this word. */
  path: string;
}

interface SearchableWord extends WordSearchHit {
  /** Pinyin without tones or spaces, lower case: `xuesheng`. */
  sound: string;
  meaning: string;
}

const HAN = /\p{Script=Han}/u;
const MOST_HITS = 40;
/** Tones, spaces and case aside, so `xuesheng`, `xué shēng` and `Xuesheng` all find 學生. */
export const plainPinyin = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Zü]/g, '').toLowerCase();

let everyWord: Promise<SearchableWord[]> | undefined;

/** Every level's words, downloaded once, the first time someone searches. */
export function loadSearchableWords(): Promise<SearchableWord[]> {
  everyWord ??= Promise.all(WORD_LIST_LEVELS.map(async (entry) => {
    const words = await loadWordList(entry.level);
    const { parts } = wordListInfo(entry);
    const size = Math.ceil(words.length / parts);
    return words.map((word, index): SearchableWord => ({
      word,
      entry,
      path: wordListPath(entry.slug, Math.floor(index / size) + 1),
      sound: plainPinyin(word[1]),
      meaning: word[2].toLowerCase(),
    }));
  })).then((levels) => levels.flat());
  return everyWord;
}

/**
 * Words matching what was typed: Chinese characters match the word, Latin letters match the
 * pinyin (tones optional) or a whole English word of the meaning. Closest matches first, lower
 * levels before higher ones.
 */
export function searchWords(words: readonly SearchableWord[], typed: string): WordSearchHit[] {
  const query = typed.trim();
  if (!query) return [];
  const scored: { hit: SearchableWord; score: number; order: number }[] = [];
  const add = (hit: SearchableWord, score: number) => scored.push({ hit, score, order: scored.length });
  if (HAN.test(query)) {
    for (const hit of words) {
      const hanzi = hit.word[0];
      if (hanzi === query) add(hit, 0);
      else if (hanzi.startsWith(query)) add(hit, 1);
      else if (hanzi.includes(query)) add(hit, 2);
    }
  } else {
    const sound = plainPinyin(query);
    const english = query.toLowerCase();
    const wholeWord = new RegExp(`(^|[^a-z])${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    for (const hit of words) {
      if (sound && hit.sound === sound) add(hit, 0);
      else if (english.length > 1 && wholeWord.test(hit.meaning)) add(hit, hit.meaning === english || hit.meaning === `to ${english}` ? 1 : 3);
      else if (sound.length > 1 && hit.sound.startsWith(sound)) add(hit, 2);
    }
  }
  // `words` runs from the lowest level up, so equal scores keep that order.
  return scored.sort((a, b) => a.score - b.score || a.order - b.order).slice(0, MOST_HITS).map(({ hit }) => hit);
}
