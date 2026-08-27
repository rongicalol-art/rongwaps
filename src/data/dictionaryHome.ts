export interface BeginnerDictionaryTerm {
  traditional: string;
  pinyin: string;
  meaning: string;
  /** Audio file in the vocabulary-audio bucket (book recording when available). */
  audio?: string;
}

export const BEGINNER_DICTIONARY_TERMS: BeginnerDictionaryTerm[] = [
  { traditional: '你好', pinyin: 'nǐ hǎo', meaning: 'hello' },
  { traditional: '謝謝', pinyin: 'xiè xie', meaning: 'thank you' },
  { traditional: '請問', pinyin: 'qǐng wèn', meaning: 'excuse me' },
  { traditional: '可以', pinyin: 'kě yǐ', meaning: 'can; may' },
  { traditional: '多少錢', pinyin: 'duō shǎo qián', meaning: 'how much?' },
];

export const FEATURED_DICTIONARY_TERMS: BeginnerDictionaryTerm[] = [
  { traditional: '好', pinyin: 'hǎo', meaning: 'Good' },
  { traditional: '我', pinyin: 'wǒ', meaning: 'I; me' },
  { traditional: '你', pinyin: 'nǐ', meaning: 'You' },
  { traditional: '一', pinyin: 'yī', meaning: 'One' },
  { traditional: '二', pinyin: 'èr', meaning: 'Two' },
  { traditional: '三', pinyin: 'sān', meaning: 'Three' },
];

/**
 * Single characters rotated as the daily character. Pinyin and meaning are
 * static so the card renders instantly; the decomposition parts load from
 * the runtime decomposition service on top of the character.
 */
export const DAILY_CHARACTERS: BeginnerDictionaryTerm[] = [
  { traditional: '學', pinyin: 'xué', meaning: 'to learn; study' },
  { traditional: '謝', pinyin: 'xiè', meaning: 'to thank' },
  { traditional: '國', pinyin: 'guó', meaning: 'country; nation' },
  { traditional: '朋', pinyin: 'péng', meaning: 'friend' },
  { traditional: '友', pinyin: 'yǒu', meaning: 'friend' },
  { traditional: '明', pinyin: 'míng', meaning: 'bright' },
  { traditional: '中', pinyin: 'zhōng', meaning: 'middle; center' },
  { traditional: '水', pinyin: 'shuǐ', meaning: 'water' },
  { traditional: '火', pinyin: 'huǒ', meaning: 'fire' },
  { traditional: '木', pinyin: 'mù', meaning: 'wood; tree' },
  { traditional: '山', pinyin: 'shān', meaning: 'mountain' },
  { traditional: '口', pinyin: 'kǒu', meaning: 'mouth' },
  { traditional: '日', pinyin: 'rì', meaning: 'sun; day' },
  { traditional: '月', pinyin: 'yuè', meaning: 'moon; month' },
  { traditional: '天', pinyin: 'tiān', meaning: 'sky; day' },
  { traditional: '人', pinyin: 'rén', meaning: 'person' },
  { traditional: '大', pinyin: 'dà', meaning: 'big' },
  { traditional: '小', pinyin: 'xiǎo', meaning: 'small' },
];
