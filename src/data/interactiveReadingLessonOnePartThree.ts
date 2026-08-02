import type { InteractiveReadingPart } from '../types/models';
import { LESSON_TWO_PART_THREE_READING } from './interactiveReadingLessonTwoPartThree';

export const LESSON_ONE_PART_THREE_READING: InteractiveReadingPart = {
  id: 'B1L01-P03-R01',
  bookId: 1,
  lessonId: 1,
  partId: 3,
  titleTraditional: '自我介紹',
  titleEnglish: 'Introduce yourself',
  printedPages: [46, 47, 48, 49],
  audioReference: '01-3-1',
  introduction: 'Follow Youmei’s introduction as it grows from hello to identity, connection, and personal tastes.',
  chunks: [
    {
      id: 'greeting',
      role: 'Open',
      traditional: '大家好！',
      simplified: '大家好！',
      pinyin: 'Dàjiā hǎo!',
      english: 'Hi, everyone!',
    },
    {
      id: 'identity',
      role: 'Name',
      traditional: '我姓小林，叫友美，我是日本人。',
      simplified: '我姓小林，叫友美，我是日本人。',
      pinyin: 'Wǒ xìng Xiǎolín, jiào Yǒuměi, wǒ shì Rìběn rén.',
      english: 'My surname is Xiaolin, my given name is Youmei, and I am Japanese.',
    },
    {
      id: 'connection',
      role: 'Connect',
      traditional: '我喜歡臺灣，臺灣朋友很可愛。',
      simplified: '我喜欢台湾，台湾朋友很可爱。',
      pinyin: 'Wǒ xǐhuān Táiwān, Táiwān péngyǒu hěn kěài.',
      english: 'I like Taiwan. Taiwanese friends are lovely.',
    },
    {
      id: 'favorites',
      role: 'Favorites',
      traditional: '我愛吃水果，愛喝珍珠奶茶。',
      simplified: '我爱吃水果，爱喝珍珠奶茶。',
      pinyin: 'Wǒ ài chī shuǐguǒ, ài hē zhēnzhū nǎichá.',
      english: 'I love eating fruit and drinking bubble milk tea.',
    },
    {
      id: 'closing',
      role: 'Close',
      traditional: '謝謝大家！',
      simplified: '谢谢大家！',
      pinyin: 'Xièxie dàjiā!',
      english: 'Thank you, everyone!',
    },
  ],
  countries: [
    { id: 'jp', traditional: '日本', simplified: '日本', pinyin: 'Rìběn', english: 'Japan' },
    { id: 'tw', traditional: '臺灣', simplified: '台湾', pinyin: 'Táiwān', english: 'Taiwan' },
    { id: 'us', traditional: '美國', simplified: '美国', pinyin: 'Měiguó', english: 'the USA' },
    { id: 'id', traditional: '印尼', simplified: '印尼', pinyin: 'Yìnní', english: 'Indonesia' },
  ],
  likes: [
    { id: 'taiwan', traditional: '臺灣', simplified: '台湾', pinyin: 'Táiwān', english: 'Taiwan' },
    { id: 'chinese', traditional: '中文', simplified: '中文', pinyin: 'Zhōngwén', english: 'Chinese' },
    { id: 'music', traditional: '音樂', simplified: '音乐', pinyin: 'yīnyuè', english: 'music' },
  ],
  foods: [
    { id: 'fruit', traditional: '水果', simplified: '水果', pinyin: 'shuǐguǒ', english: 'fruit' },
    { id: 'dumplings', traditional: '餃子', simplified: '饺子', pinyin: 'jiǎozi', english: 'dumplings' },
    { id: 'noodles', traditional: '麵', simplified: '面', pinyin: 'miàn', english: 'noodles' },
  ],
  drinks: [
    { id: 'bubble-tea', traditional: '珍珠奶茶', simplified: '珍珠奶茶', pinyin: 'zhēnzhū nǎichá', english: 'bubble milk tea' },
    { id: 'tea', traditional: '茶', simplified: '茶', pinyin: 'chá', english: 'tea' },
    { id: 'water', traditional: '水', simplified: '水', pinyin: 'shuǐ', english: 'water' },
  ],
};

export const INTERACTIVE_READING_PARTS = [
  LESSON_ONE_PART_THREE_READING,
  LESSON_TWO_PART_THREE_READING,
];

export function getInteractiveReadingPart(partId: string) {
  return INTERACTIVE_READING_PARTS.find((part) => part.id === partId);
}

export function getInteractiveReadingPartsForLesson(bookId: number, lessonId: number) {
  return INTERACTIVE_READING_PARTS.filter(
    (part) => part.bookId === bookId && part.lessonId === lessonId,
  );
}
