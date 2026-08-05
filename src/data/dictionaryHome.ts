export interface BeginnerDictionaryTerm {
  traditional: string;
  pinyin: string;
  meaning: string;
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
