export interface RubyItem {
  char: string;
  pinyin?: string;
  isPunctuation: boolean;
}

export interface PhraseChunk {
  text: string;
  start?: number;
  end?: number;
  isPunctuation: boolean;
  rubyItems: RubyItem[];
}

export const PUNCTUATION_REGEX = /^[，。？！、：；“”‘’（）《》〈〉…—\s,.?!:;"'()-]+$/;

// Punctuation that closes a phrase/clause. Used to split long aligned words
// (which Whisper sometimes merges into a single whole-sentence "word") back
// into tappable phrase chunks. Deliberately excludes marks that only appear
// *inside* a phrase, such as （ ） — and range dashes.
const PHRASE_TERMINATORS = new Set([...'，。！？、；：…', ...',.!?;:']);

// All 410 valid standard Mandarin pinyin base syllables (tone-free)
const ALL_VALID_BASES = new Set([
  'a', 'ai', 'an', 'ang', 'ao', 'ba', 'bai', 'ban', 'bang', 'bao', 'bei', 'ben', 'beng', 'bi', 'bian', 'biao', 'bie', 'bin', 'bing', 'bo', 'bu',
  'ca', 'cai', 'can', 'cang', 'cao', 'ce', 'cen', 'ceng', 'cha', 'chai', 'chan', 'chang', 'chao', 'che', 'chen', 'cheng', 'chi', 'chong', 'chou', 'chu', 'chua', 'chuai', 'chuan', 'chuang', 'chui', 'chun', 'chuo', 'ci', 'cong', 'cou', 'cu', 'cuan', 'cui', 'cun', 'cuo',
  'da', 'dai', 'dan', 'dang', 'dao', 'de', 'dei', 'den', 'deng', 'di', 'dia', 'dian', 'diao', 'die', 'ding', 'diu', 'dong', 'dou', 'du', 'duan', 'dui', 'dun', 'duo',
  'e', 'ei', 'en', 'eng', 'er', 'fa', 'fan', 'fang', 'fei', 'fen', 'feng', 'fo', 'fou', 'fu',
  'ga', 'gai', 'gan', 'gang', 'gao', 'ge', 'gei', 'gen', 'geng', 'gong', 'gou', 'gu', 'gua', 'guai', 'guan', 'guang', 'gui', 'gun', 'guo',
  'ha', 'hai', 'han', 'hang', 'hao', 'he', 'hei', 'hen', 'heng', 'hong', 'hou', 'hu', 'hua', 'huai', 'huan', 'huang', 'hui', 'hun', 'huo',
  'ji', 'jia', 'jian', 'jiang', 'jiao', 'jie', 'jin', 'jing', 'jiong', 'jiu', 'ju', 'juan', 'jue', 'jun',
  'ka', 'kai', 'kan', 'kang', 'kao', 'ke', 'kei', 'ken', 'keng', 'kong', 'kou', 'ku', 'kua', 'kuai', 'kuan', 'kuang', 'kui', 'kun', 'kuo',
  'la', 'lai', 'lan', 'lang', 'lao', 'le', 'lei', 'leng', 'li', 'lia', 'lian', 'liang', 'liao', 'lie', 'lin', 'ling', 'liu', 'lo', 'long', 'lou', 'lu', 'luan', 'lun', 'luo', 'lü', 'lüe',
  'ma', 'mai', 'man', 'mang', 'mao', 'me', 'mei', 'men', 'meng', 'mi', 'mian', 'miao', 'mie', 'min', 'ming', 'miu', 'mo', 'mou', 'mu',
  'na', 'nai', 'nan', 'nang', 'nao', 'ne', 'nei', 'nen', 'neng', 'ni', 'nian', 'niang', 'niao', 'nie', 'nin', 'ning', 'niu', 'nong', 'nou', 'nu', 'nuan', 'nun', 'nuo', 'nü', 'nüe',
  'o', 'ou', 'pa', 'pai', 'pan', 'pang', 'pao', 'pei', 'pen', 'peng', 'pi', 'pian', 'piao', 'pie', 'pin', 'ping', 'po', 'pou', 'pu',
  'qi', 'qia', 'qian', 'qiang', 'qiao', 'qie', 'qin', 'qing', 'qiong', 'qiu', 'qu', 'quan', 'que', 'qun',
  'ran', 'rang', 'rao', 're', 'ren', 'reng', 'ri', 'rong', 'rou', 'ru', 'ruan', 'rui', 'run', 'ruo',
  'sa', 'sai', 'san', 'sang', 'sao', 'se', 'sen', 'seng', 'sha', 'shai', 'shan', 'shang', 'shao', 'she', 'shei', 'shen', 'sheng', 'shi', 'shou', 'shu', 'shua', 'shuai', 'shuan', 'shuang', 'shui', 'shun', 'shuo', 'si', 'song', 'sou', 'su', 'suan', 'sui', 'sun', 'suo',
  'ta', 'tai', 'tan', 'tang', 'tao', 'te', 'teng', 'ti', 'tian', 'tiao', 'tie', 'ting', 'tong', 'tou', 'tu', 'tuan', 'tui', 'tun', 'tuo',
  'wa', 'wai', 'wan', 'wang', 'wei', 'wen', 'weng', 'wo', 'wu',
  'xi', 'xia', 'xian', 'xiang', 'xiao', 'xie', 'xin', 'xing', 'xiong', 'xiu', 'xu', 'xuan', 'xue', 'xun',
  'ya', 'yan', 'yang', 'yao', 'ye', 'yi', 'yin', 'ying', 'yo', 'yong', 'you', 'yu', 'yuan', 'yue', 'yun',
  'za', 'zai', 'zan', 'zang', 'zao', 'ze', 'zei', 'zen', 'zeng', 'zha', 'zhai', 'zhan', 'zhang', 'zhao', 'zhe', 'zhei', 'zhen', 'zheng', 'zhi', 'zhong', 'zhou', 'zhu', 'zhua', 'zhuai', 'zhuan', 'zhuang', 'zhui', 'zhun', 'zhuo', 'zi', 'zong', 'zou', 'zu', 'zuan', 'zui', 'zun', 'zuo'
]);

function stripTones(str: string): string {
  return str.toLowerCase()
    .replace(/[āáǎà]/g, 'a')
    .replace(/[ēéěè]/g, 'e')
    .replace(/[īíǐì]/g, 'i')
    .replace(/[ōóǒò]/g, 'o')
    .replace(/[ūúǔù]/g, 'u')
    .replace(/[ǖǘǚǜ]/g, 'ü');
}

/**
 * Splits compound pinyin words into individual syllables using official Mandarin phonotactics
 * (e.g. "kuànián" -> ["kuà", "nián"], "rènao" -> ["rè", "nao"], "piàoliàng" -> ["piào", "liàng"])
 */
export function splitPinyinWordToSyllables(word: string): string[] {
  if (!word) return [];
  if (/^[0-9]+$/.test(word)) return [word];
  if (word.includes("'") || word.includes("’")) {
    return word.split(/['’]/).flatMap(splitPinyinWordToSyllables).filter(Boolean);
  }

  // Handle Erhua: e.g. "diǎnr" -> ["diǎn", "r"]
  if (word.toLowerCase().endsWith('r') && word.length > 2 && !word.toLowerCase().startsWith('r') && !word.toLowerCase().startsWith('er')) {
    const withoutR = word.slice(0, -1);
    return [...splitPinyinWordToSyllables(withoutR), 'r'];
  }

  function solve(sub: string): string[] | null {
    if (!sub) return [];

    for (let len = Math.min(sub.length, 7); len >= 1; len--) {
      const candidate = sub.slice(0, len);
      const base = stripTones(candidate);
      if (ALL_VALID_BASES.has(base)) {
        const rest = sub.slice(len);
        if (!rest) return [candidate];

        // Standard orthography rule: if candidate ends in 'n' (not 'ng') and rest starts with a/o/e without apostrophe,
        // the 'n' is the initial of the next syllable (e.g. rè-nao, not rèn-ao).
        if (candidate.toLowerCase().endsWith('n') && !candidate.toLowerCase().endsWith('ng')) {
          const nextChar = rest[0]?.toLowerCase();
          if (nextChar === 'a' || nextChar === 'o' || nextChar === 'e') {
            continue;
          }
        }

        const restSolution = solve(rest);
        if (restSolution !== null) {
          return [candidate, ...restSolution];
        }
      }
    }
    return null;
  }

  const res = solve(word);
  return res ?? [word];
}

// Punctuation/whitespace stripped out of pinyin before word/syllable work.
const PINYIN_STRIP_REGEX = /[，。？！、：；“”‘’（）《》〈〉…—\s,.?!:;"'()-]/g;

/** Extracts all individual syllables from a pinyin sentence */
export function splitPinyinToSyllables(pinyinStr: string): string[] {
  if (!pinyinStr) return [];
  const clean = pinyinStr.replace(PINYIN_STRIP_REGEX, ' ');
  const words = clean.trim().split(/\s+/).filter(Boolean);
  const syllables: string[] = [];

  for (const word of words) {
    syllables.push(...splitPinyinWordToSyllables(word));
  }

  return syllables;
}

/**
 * Pairs each Chinese character 1-to-1 with its Pinyin syllable
 * while preserving natural punctuation and handling numeric tokens.
 */
export function alignRubyPinyin(text: string, pinyinStr: string): RubyItem[] {
  if (!text) return [];
  const syllables = splitPinyinToSyllables(pinyinStr);

  const items: RubyItem[] = [];
  let sylIndex = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (PUNCTUATION_REGEX.test(char)) {
      items.push({
        char,
        isPunctuation: true,
      });
      i++;
    } else if (/[0-9]/.test(char)) {
      // Group contiguous digits (e.g. "101")
      let numStr = '';
      while (i < text.length && /[0-9]/.test(text[i])) {
        numStr += text[i];
        i++;
      }
      // Consume the digit token from syllables if present
      if (sylIndex < syllables.length && /^[0-9]+$/.test(syllables[sylIndex])) {
        sylIndex++;
      }
      items.push({
        char: numStr,
        pinyin: undefined,
        isPunctuation: false,
      });
    } else {
      const pinyin = sylIndex < syllables.length ? syllables[sylIndex] : undefined;
      sylIndex++;
      items.push({
        char,
        pinyin,
        isPunctuation: false,
      });
      i++;
    }
  }

  return items;
}

/** Longest tappable phrase, in characters. Chunks above this are subdivided
 * at authored pinyin word boundaries (see splitPhraseWord). */
const MAX_PHRASE_CHARS = 12;

function charCountOf(seg: RubyItem[]): number {
  return seg.reduce((n, item) => n + item.char.length, 0);
}

/**
 * Packs pinyin words (a run of items split at `boundaries`) into phrase
 * chunks of at most MAX_PHRASE_CHARS characters, cutting only between words.
 */
function packWords(items: RubyItem[], boundaries: number[]): RubyItem[][] {
  const starts = [0, ...boundaries];
  const words: RubyItem[][] = [];
  for (let w = 0; w < starts.length; w += 1) {
    const from = starts[w];
    const to = w + 1 < starts.length ? starts[w + 1] : items.length;
    words.push(items.slice(from, to));
  }

  const parts: RubyItem[][] = [];
  let current: RubyItem[] = [];
  let currentChars = 0;
  for (const word of words) {
    const wordChars = charCountOf(word);
    if (currentChars > 0 && currentChars + wordChars > MAX_PHRASE_CHARS) {
      parts.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(...word);
    currentChars += wordChars;
  }
  if (current.length) parts.push(current);
  return parts;
}

/**
 * Splits an aligned word chunk into tappable phrase chunks when Whisper
 * merged several clauses into a single "word". Phrases close at clause/
 * sentence punctuation; each terminator run attaches to the phrase it closes
 * (so "……" and sentence-final marks stay with their clause). A phrase that
 * would still be longer than MAX_PHRASE_CHARS is further subdivided at the
 * authored pinyin word starts passed in `wordStarts` (positions into
 * `chunk.rubyItems`). Timestamps are interpolated across the word's
 * [start, end] proportionally to character count so every phrase stays
 * independently tappable and karaoke-highlightable.
 */
function splitPhraseWord(
  chunk: PhraseChunk,
  wordStarts?: ReadonlySet<number>,
): PhraseChunk[] {
  const { start, end, rubyItems } = chunk;
  if (typeof start !== 'number' || typeof end !== 'number' || rubyItems.length === 0) {
    return [chunk];
  }

  // Clause-level groups: a group closes after a run of clause/sentence
  // terminators, which attach to the group they close. Word starts are
  // recorded as positions into `rubyItems` (chunk-relative).
  type Group = { items: RubyItem[]; wordStarts: number[] };
  const raw: Group[] = [];
  let current: RubyItem[] = [];
  let i = 0;
  while (i < rubyItems.length) {
    const groupStart = i;
    while (i < rubyItems.length && !PHRASE_TERMINATORS.has(rubyItems[i].char)) {
      current.push(rubyItems[i]);
      i += 1;
    }
    while (i < rubyItems.length && PHRASE_TERMINATORS.has(rubyItems[i].char)) {
      current.push(rubyItems[i]);
      i += 1;
    }
    if (current.length) {
      const groupWordStarts: number[] = [];
      for (let k = 1; k < current.length; k += 1) {
        if (wordStarts?.has(groupStart + k)) groupWordStarts.push(groupStart + k);
      }
      raw.push({ items: current, wordStarts: groupWordStarts });
      current = [];
    }
  }

  // A leading phrase made only of punctuation (the aligner attached a
  // sentence-final mark to the start of this word) is not tappable on its
  // own — fold it into the phrase that follows.
  if (raw.length > 1 && raw[0].items.every((item) => item.isPunctuation)) {
    const lead = raw[0];
    const next = raw[1];
    next.items = [...lead.items, ...next.items];
    next.wordStarts = [...lead.wordStarts, ...next.wordStarts];
    raw.shift();
  }

  // Subdivide any clause group that is still too long at pinyin word starts,
  // then interpolate timestamps over the chunk's [start, end]. Only spoken
  // characters count toward the cap — trailing punctuation rides along.
  const parts: RubyItem[][] = [];
  let cursor = 0;
  for (const group of raw) {
    const groupStart = cursor;
    cursor += group.items.length;
    const spokenChars = group.items
      .filter((item) => !item.isPunctuation)
      .reduce((n, item) => n + item.char.length, 0);
    if (spokenChars > MAX_PHRASE_CHARS) {
      const boundaries: number[] = [];
      for (const pos of group.wordStarts) {
        const local = pos - groupStart;
        if (local > 0 && local < group.items.length) boundaries.push(local);
      }
      if (boundaries.length > 0) {
        parts.push(...packWords(group.items, boundaries));
        continue;
      }
    }
    parts.push(group.items);
  }

  if (parts.length === 1 && parts[0] === rubyItems) return [chunk];

  const totalChars = parts.reduce((sum, seg) => sum + charCountOf(seg), 0) || 1;
  const duration = Math.max(0, end - start);
  let consumed = 0;
  return parts.map((seg) => {
    const segStart = start + (consumed / totalChars) * duration;
    consumed += charCountOf(seg);
    const segEnd = start + (consumed / totalChars) * duration;
    return {
      text: seg.map((item) => item.char).join(''),
      isPunctuation: false as const,
      rubyItems: seg,
      start: segStart,
      end: segEnd,
    };
  });
}

/**
 * rubyItems partition the line text: every non-digit character is its own
 * item, while a run of digits is a single item whose `char` holds the whole
 * run. So an item's array index is NOT its character offset once a digit run
 * appears (e.g. "台北101大樓" groups "101" into one item and the rest of the
 * array shifts by two). Alignment words are indexed by character offset into
 * the authored text, so slices must be computed from each item's character
 * span rather than from raw array indexes.
 */
function itemCharStarts(rubyItems: RubyItem[]): number[] {
  const starts: number[] = [];
  let pos = 0;
  for (const item of rubyItems) {
    starts.push(pos);
    pos += item.char.length;
  }
  return starts;
}

/** Items fully contained in the character range [from, to). */
function sliceItemsByCharRange(
  rubyItems: RubyItem[],
  starts: number[],
  from: number,
  to: number,
): RubyItem[] {
  const out: RubyItem[] = [];
  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    if (starts[i] >= from && starts[i] + item.char.length <= to) out.push(item);
  }
  return out;
}

/** Absolute indexes of the items fully contained in [from, to). */
function containedItemIndexes(
  rubyItems: RubyItem[],
  starts: number[],
  from: number,
  to: number,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    if (starts[i] >= from && starts[i] + item.char.length <= to) out.push(i);
  }
  return out;
}

/** True for every ruby item that begins an authored pinyin word. */
function buildWordStartFlags(rubyItems: RubyItem[], pinyinStr: string): boolean[] {
  const flags = rubyItems.map(() => false);
  // Punctuation and whitespace carry no word boundary; the rest of the pinyin
  // string is a sequence of space-separated words.
  const words = pinyinStr
    .replace(PINYIN_STRIP_REGEX, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  let wordIndex = 0; // next pinyin word to consume from
  let queue: string[] = []; // syllables of the current pinyin word
  let queuePos = 0; // next syllable in `queue` to match

  // Loads the next non-numeric pinyin word's syllables; returns false when
  // the pinyin string is exhausted.
  const loadWord = (): boolean => {
    while (wordIndex < words.length) {
      const word = words[wordIndex];
      wordIndex += 1;
      if (/^[0-9]+$/.test(word)) continue; // numeric tokens pair with digit runs
      const syllables = splitPinyinWordToSyllables(word);
      if (syllables.length > 0) {
        queue = syllables.map((syllable) => stripTones(syllable));
        queuePos = 0;
        return true;
      }
    }
    queue = [];
    queuePos = 0;
    return false;
  };

  for (let i = 0; i < rubyItems.length; i += 1) {
    const item = rubyItems[i];
    if (item.isPunctuation) continue;

    if (/^[0-9]+$/.test(item.char)) {
      // A digit run begins a word only when the pinyin has a number here too.
      if (wordIndex < words.length && /^[0-9]+$/.test(words[wordIndex])) {
        flags[i] = true;
        wordIndex += 1; // consume the numeric token
      }
      continue;
    }

    if (queuePos >= queue.length) {
      if (!loadWord()) continue; // pinyin exhausted: no more word boundaries
      flags[i] = true;
    }

    const actual = stripTones(item.pinyin ?? '');
    // The item syllable sequence mirrors the pinyin string exactly (1:1
    // coverage), so matches always consume; on any drift we simply stall and
    // emit no further word boundaries — the chunk then stays whole rather
    // than being split at wrong places.
    if (queue[queuePos] !== undefined && actual === queue[queuePos]) {
      queuePos += 1;
    }
  }
  return flags;
}

/**
 * Groups a line of dialogue into interactive, tappable phrase chunks
 * using Whisper alignment timestamps.
 */
export function getPhraseChunks(
  text: string,
  pinyinStr: string,
  lineAlignment?: { words: Array<{ charStart?: number; charEnd?: number; start: number; end: number }> }
): PhraseChunk[] {
  const rubyItems = alignRubyPinyin(text, pinyinStr);
  if (!lineAlignment || !lineAlignment.words || lineAlignment.words.length === 0) {
    return [{
      text,
      isPunctuation: false,
      rubyItems,
    }];
  }

  const chunks: PhraseChunk[] = [];
  const itemStarts = itemCharStarts(rubyItems);
  const wordStartFlags = buildWordStartFlags(rubyItems, pinyinStr);
  let charIdx = 0;

  for (const word of lineAlignment.words) {
    if (typeof word.charStart !== 'number' || typeof word.charEnd !== 'number') continue;

    // Handle any punctuation or chars before this word
    if (charIdx < word.charStart) {
      const beforeText = text.slice(charIdx, word.charStart);
      const beforeRuby = sliceItemsByCharRange(rubyItems, itemStarts, charIdx, word.charStart);
      chunks.push({
        text: beforeText,
        isPunctuation: true,
        rubyItems: beforeRuby,
      });
    }

    // Word chunk — split into phrases when Whisper merged several clauses
    // into one long "word" (otherwise a whole utterance becomes a single
    // tappable chunk instead of phrase-by-phrase).
    const wordText = text.slice(word.charStart, word.charEnd);
    const wordIndexes = containedItemIndexes(rubyItems, itemStarts, word.charStart, word.charEnd);
    const wordRuby = wordIndexes.map((index) => rubyItems[index]);
    const firstWordIndex = wordIndexes[0];
    const wordStartsInChunk = new Set<number>();
    for (const index of wordIndexes) {
      if (wordStartFlags[index]) wordStartsInChunk.add(index - firstWordIndex);
    }
    chunks.push(...splitPhraseWord({
      text: wordText,
      start: word.start,
      end: word.end,
      isPunctuation: false,
      rubyItems: wordRuby,
    }, wordStartsInChunk));
    charIdx = word.charEnd;
  }

  // Any trailing text: when it is pure punctuation (e.g. a final ？。！),
  // fold it into the last word chunk so the sentence-final punctuation
  // lights up together with the last spoken phrase instead of never
  // highlighting. Real (un-aligned) text stays a separate inert chunk.
  if (charIdx < text.length) {
    const trailingText = text.slice(charIdx);
    const trailingRuby = sliceItemsByCharRange(rubyItems, itemStarts, charIdx, text.length);
    const last = chunks[chunks.length - 1];
    const canMerge = PUNCTUATION_REGEX.test(trailingText)
      && Boolean(last && !last.isPunctuation);
    if (canMerge) {
      last!.text += trailingText;
      last!.rubyItems.push(...trailingRuby);
    } else {
      chunks.push({
        text: trailingText,
        isPunctuation: true,
        rubyItems: trailingRuby,
      });
    }
  }

  return chunks;
}
