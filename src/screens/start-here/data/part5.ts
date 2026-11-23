import type { StartHereLesson } from './types';

export const PART_5_LESSONS: StartHereLesson[] = [
  {
    id: 18, partId: 5, title: 'Two syllables together', minutes: 5,
    goal: 'Say a two-syllable word as one word, with a low tone 3 and a light ending.',
    screens: [
      {
        k: 'tiles', title: 'Say the whole word',
        talk: ['Echo each word. Keep both syllables together.',
          'In this word, stay low before you go high. [[w:laoshi|lǎoshī]]',
          'Now listen for a rise before the high note. [[w:xuesheng|xuéshēng]]'],
        items: [
          { pinyin: 'lǎoshī', hanzi: '老師', meaning: 'teacher', audio: 'w:laoshi' },
          { pinyin: 'xuéshēng', hanzi: '學生', meaning: 'student', audio: 'w:xuesheng' },
          { pinyin: 'xiānshēng', hanzi: '先生', meaning: 'Mr.', audio: 'w:xiansheng' },
        ],
      },
      {
        k: 'tiles', title: 'A short, light second syllable',
        talk: ['Let the last syllable be short and light.',
          'In pinyin, a light syllable carries no tone mark.'],
        items: [
          { pinyin: 'nǐmen', hanzi: '你們', meaning: 'you (plural)', audio: 'w:nimen' },
          { pinyin: 'tāmen', hanzi: '他們', meaning: 'they', audio: 'w:tamen' },
          { pinyin: 'tàitai', hanzi: '太太', meaning: 'Mrs.', audio: 'w:taitai' },
          { pinyin: 'xièxie', hanzi: '謝謝', meaning: 'thank you', audio: 'w:xiexie' },
        ],
      },
      {
        k: 'sort', title: 'Listen and match the tune', mode: 'audio',
        bins: [{ label: 'Low, then high' }, { label: 'Rising, then high' }, { label: 'Falling, then light' }],
        items: [
          { label: 'xuéshēng', reveal: 'xuéshēng', audio: 'w:xuesheng', bin: 1 },
          { label: 'xièxie', reveal: 'xièxie', audio: 'w:xiexie', bin: 2 },
          { label: 'lǎoshī', reveal: 'lǎoshī', audio: 'w:laoshi', bin: 0 },
        ],
        doneText: 'Keep the two beats together as you repeat each word.',
      },
      {
        k: 'question', title: 'Which syllable is light?', audio: ['w:taitai'], layout: 'two',
        choices: [{ label: 'The first', correct: false }, { label: 'The second', correct: true }],
        feedback: { hanzi: '太太', pinyin: 'tàitai', meaning: 'Mrs. The second syllable is short and light.' },
      },
      {
        k: 'question', title: 'Which tune do you hear?', audio: ['w:laoshi'],
        choices: [{ label: 'Low, then high', correct: true }, { label: 'Rising, then high', correct: false },
          { label: 'High, then high', correct: false }],
        feedback: { hanzi: '老師', pinyin: 'lǎoshī', meaning: 'teacher. The first syllable stays low.' },
      },
    ],
  },
  {
    id: 19, partId: 5, title: 'Two low tones in a row', minutes: 4,
    goal: 'Hear and say the rise when two tone 3s meet.',
    screens: [
      {
        k: 'flip', kind: 't3t3', need: 2, title: 'Watch the first tone rise',
        talk: ['Put two low tones together. Listen to the first one rise.',
          'The pinyin keeps both low marks. Your voice goes rise, then low.'],
      },
      {
        k: 'tiles', title: 'Hear it in real words',
        talk: ['Listen to the first syllable in each word.',
          'Each starts with a rise, even though its mark shows low.'],
        items: [
          { pinyin: 'shuǐguǒ', hanzi: '水果', meaning: 'fruit', audio: 'w:shuiguo' },
          { pinyin: 'kěyǐ', hanzi: '可以', meaning: 'can', audio: 'w:keyi' },
          { pinyin: 'xiǎojiě', hanzi: '小姐', meaning: 'Miss', audio: 'w:xiaojie' },
        ],
      },
      {
        k: 'pairs', title: 'When does the first tone rise?', headers: ['Spoken tune'],
        talk: ['Before another low tone, the first one rises. [[w:shuiguo|shuǐguǒ]]',
          'Before other tones, the low tone stays low. [[w:laoshi|lǎoshī]] [[w:nimen|nǐmen]]'],
        rows: [
          { label: 'Rise, then low', cells: [{ text: 'shuǐguǒ', audio: 'w:shuiguo' }] },
          { label: 'Low, then high', cells: [{ text: 'lǎoshī', audio: 'w:laoshi' }] },
          { label: 'Low, then light', cells: [{ text: 'nǐmen', audio: 'w:nimen' }] },
        ],
      },
      {
        k: 'question', title: 'How do you say this pair of low tones?', noAuto: true, audio: ['ni2+hao3'],
        prompt: { hanzi: '你好', pinyin: 'nǐ hǎo' }, layout: 'two',
        choices: [{ label: 'Low, then low', correct: false }, { label: 'Rising, then low', correct: true }],
        feedback: { hanzi: '你好', pinyin: 'nǐ hǎo', meaning: 'hello. Say it with a rise on the first syllable.' },
      },
      {
        k: 'question', title: 'What does the first syllable do?', audio: ['w:shuiguo'], layout: 'two',
        choices: [{ label: 'It rises', correct: true }, { label: 'It stays low', correct: false }],
        feedback: { hanzi: '水果', pinyin: 'shuǐguǒ', meaning: 'fruit. Two low tones together make the first one rise.' },
      },
    ],
  },
  {
    id: 20,
    partId: 5,
    title: '不 and 一 change their tone',
    goal: 'Read bù and bú, and yī, yí and yì, and know why the mark changes.',
    minutes: 5,
    screens: [
      {
        k: 'toneIntro',
        title: '不 means "not"',
        tone: 4,
        pinyin: 'bù',
        meaning: 'not',
        hanzi: '不',
        talk: [ 'This means "not".| Alone,| it falls.' ],
        audio: 'bu4'
      },
      {
        k: 'flip',
        title: 'Put a word after 不',
        talk: [ 'Tap a word to put after it.| Watch its tone.', 'Before a falling tone, it rises. Otherwise it falls.' ],
        kind: 'bu',
        need: 2
      },
      {
        k: 'question',
        title: 'How is 不 said here?',
        audio: [ 'bu2', 'shi4' ],
        prompt: { hanzi: '不', pinyin: 'shì' },
        noAuto: true,
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'bù shì', correct: false }, { label: 'bú shì', correct: true } ],
        feedback: { hanzi: '不是', pinyin: 'bú shì', meaning: 'is not' }
      },
      {
        k: 'toneIntro',
        title: '一 means "one"',
        tone: 1,
        pinyin: 'yī',
        meaning: 'one',
        hanzi: '一',
        talk: [ `This means "one".| When you count,| it's high and flat.` ],
        audio: 'yi1'
      },
      {
        k: 'flip',
        title: 'Put a word after 一',
        talk: [ 'Now put a word after it.', 'Before a falling tone, it rises. Otherwise it falls.' ],
        kind: 'yi',
        need: 2
      },
      {
        k: 'question',
        title: 'Listen. Which tone does 一 have?',
        audio: [ 'w:yiqi' ],
        prompt: { hanzi: '一起' },
        choices: [
          { label: 'High', tone: 1, correct: false },
          { label: 'Rising', tone: 2, correct: false },
          { label: 'Falling', tone: 4, correct: true }
        ],
        feedback: { hanzi: '一起', pinyin: 'yìqǐ', meaning: 'together' }
      },
      {
        k: 'word',
        title: 'Just read the mark',
        pinyin: 'bú kèqì',
        hanzi: '不客氣',
        meaning: 'you are welcome',
        talk: [ "Don't work it out yourself.| The pinyin shows the tone you say." ],
        audio: 'w:bukeqi'
      },
    ],
  },
];
