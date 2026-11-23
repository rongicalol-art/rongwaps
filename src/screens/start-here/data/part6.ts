import type { StartHereLesson } from './types';

export const PART_6_LESSONS: StartHereLesson[] = [
  {
    id: 21, partId: 6, title: 'Look inside a character', minutes: 5,
    goal: 'Tell a stroke, a part, a character and a word apart.',
    screens: [
      {
        k: 'charParts', title: 'From strokes to parts',
        talk: ['One stroke is one movement of the pen.',
          'This character uses two strokes: left first, then right. [[w:ren|人]]',
          'On the left of another character, it takes less space. [[w:ren|亻]]'],
        items: [
          { hanzi: '人', pinyin: 'rén', meaning: 'person', audio: 'w:ren' },
          { hanzi: '亻', pinyin: 'rén', meaning: 'person part', audio: 'w:ren' },
          { hanzi: '你', pinyin: 'nǐ', meaning: 'you', audio: 'w:ni', highlightPart: '亻',
            breakdown: [{ glyph: '亻', role: 'meaning', hint: 'person' }, { glyph: '尔', role: 'part', hint: 'right-hand part' }] },
          { hanzi: '他', pinyin: 'tā', meaning: 'he', audio: 'w:ta', highlightPart: '亻',
            breakdown: [{ glyph: '亻', role: 'meaning', hint: 'person' }, { glyph: '也', role: 'part', hint: 'right-hand part' }] },
        ],
      },
      {
        k: 'charParts', title: 'Parts can hint at meaning and sound',
        talk: ['This part points to people. [[w:ren|亻]]',
          'The character for door gives this word ending its sound. [[men2|門]]',
          'The character for horse hints at the sound in mom. [[w:ma|馬]] [[ma1|媽]]'],
        items: [
          { hanzi: '門', pinyin: 'mén', meaning: 'door', audio: 'men2' },
          { hanzi: '們', pinyin: 'men', meaning: 'plural ending', audio: 'men5', highlightPart: '門',
            breakdown: [{ glyph: '亻', role: 'meaning', hint: 'person' }, { glyph: '門', role: 'sound', hint: 'sounds like mén with a lighter tone' }] },
          { hanzi: '馬', pinyin: 'mǎ', meaning: 'horse', audio: 'w:ma' },
          { hanzi: '媽', pinyin: 'mā', meaning: 'mom', audio: 'ma1', highlightPart: '馬',
            breakdown: [{ glyph: '女', role: 'meaning', hint: 'woman' }, { glyph: '馬', role: 'sound', hint: 'same syllable with a different tone' }] },
        ],
      },
      {
        k: 'charParts', title: 'Two characters can form one word',
        talk: ['Each character is one syllable. [[xue2|學]] [[sheng1|生]]',
          'Together, they make one word. [[w:xuesheng|學生]]',
          'These are the traditional characters used in Taiwan and your textbook.'],
        items: [
          { hanzi: '學', pinyin: 'xué', meaning: 'to study', audio: 'xue2' },
          { hanzi: '生', pinyin: 'shēng', meaning: 'to be born', audio: 'sheng1' },
          { hanzi: '學生', pinyin: 'xuéshēng', meaning: 'student', audio: 'w:xuesheng',
            breakdown: [{ glyph: '學', role: 'part', hint: 'study' }, { glyph: '生', role: 'part', hint: 'second character' }] },
        ],
      },
      {
        k: 'sort', title: 'Count the characters', mode: 'text',
        bins: [{ label: 'One character' }, { label: 'Two characters' }],
        items: [
          { label: '人', audio: 'w:ren', bin: 0 }, { label: '學生', audio: 'w:xuesheng', bin: 1 },
          { label: '媽', audio: 'ma1', bin: 0 }, { label: '老師', audio: 'w:laoshi', bin: 1 },
        ],
        doneText: 'A word can have more than one character.',
      },
      {
        k: 'question', title: 'Which part of this character hints at people?', audio: [], prompt: { hanzi: '們' },
        layout: 'two', choices: [{ label: '亻', correct: true }, { label: '門', correct: false }],
        feedback: { hanzi: '們', pinyin: 'men', meaning: 'plural ending. The person part is on the left.' },
      },
      {
        k: 'question', title: 'Which part gives this character a clue to its sound?', audio: ['ma1'],
        prompt: { hanzi: '媽' }, layout: 'two',
        choices: [{ label: '女', correct: false }, { label: '馬', correct: true }],
        feedback: { hanzi: '媽', pinyin: 'mā', meaning: 'mom. The right-hand part 馬 sounds like mǎ.' },
      },
    ],
  },
  {
    id: 22, partId: 6, title: 'I, you, he, and more than one', minutes: 5,
    goal: 'Recognize six words by sound, pinyin and character.',
    screens: [
      {
        k: 'vocabCards', title: 'Meet the pronouns',
        talk: ['These three words refer to one person. [[w:wo|我]] [[w:ni|你]] [[w:ta|他]]',
          'Add this light ending to refer to more than one. [[w:women|我們]]'],
        cardIds: ['B1L00-1-03', 'B1L00-1-04', 'B1L00-1-05', 'B1L00-1-07', 'B1L00-1-08', 'B1L00-1-09'],
      },
      {
        k: 'sort', title: 'One person or more?', mode: 'text',
        bins: [{ label: 'One person' }, { label: 'More than one' }],
        items: [
          { label: '你', audio: 'w:ni', bin: 0 }, { label: '我們', audio: 'w:women', bin: 1 },
          { label: '他們', audio: 'w:tamen', bin: 1 }, { label: '我', audio: 'w:wo', bin: 0 },
          { label: '你們', audio: 'w:nimen', bin: 1 }, { label: '他', audio: 'w:ta', bin: 0 },
        ],
        doneText: 'The ending 們 is the clue that it means more than one.',
      },
      {
        k: 'question', title: 'What does this word mean?', audio: ['w:nimen'], layout: 'three',
        choices: [{ label: 'You (one person)', correct: false }, { label: 'You (plural)', correct: true }, { label: 'We', correct: false }],
        feedback: { hanzi: '你們', pinyin: 'nǐmen', meaning: 'you (plural)' },
      },
      {
        k: 'question', title: 'Which word means “they”?', audio: ['w:tamen'], noAuto: true, layout: 'three',
        choices: [{ label: '他們', correct: true }, { label: '我們', correct: false }, { label: '你們', correct: false }],
        feedback: { hanzi: '他們', pinyin: 'tāmen', meaning: 'they' },
      },
    ],
  },
  {
    id: 23, partId: 6, title: 'People', minutes: 5,
    goal: 'Know four more words and understand a first sentence.',
    screens: [
      {
        k: 'vocabCards', title: 'People you meet in class',
        talk: ['Listen for teacher and student. [[w:laoshi|老師]] [[w:xuesheng|學生]]',
          'This word links a person to who they are. [[w:shi|是]]'],
        cardIds: ['B1L00-1-01', 'B1L00-1-02', 'B1L00-1-06', 'B1L00-1-10'],
      },
      {
        k: 'word', title: 'Say your first sentence', pinyin: 'Wǒ shì xuéshēng.', hanzi: '我是學生。',
        meaning: 'I am a student.', audio: 'w:wo+w:shi+w:xuesheng',
        talk: ['Put "I" first, then "am", then "student".',
          'Change the first word to say he is a student. [[w:ta+w:shi+w:xuesheng|他是學生。]]'],
      },
      {
        k: 'sentenceBuild', title: 'Build the sentence', english: 'I am a student.',
        audio: 'w:wo+w:shi+w:xuesheng',
        target: [{ hanzi: '我', pinyin: 'wǒ' }, { hanzi: '是', pinyin: 'shì' }, { hanzi: '學生', pinyin: 'xuéshēng' }],
        distractors: [{ hanzi: '他', pinyin: 'tā' }, { hanzi: '老師', pinyin: 'lǎoshī' }],
      },
      {
        k: 'question', title: 'Who do you hear?', audio: ['w:laoshi'], layout: 'two',
        choices: [{ label: 'Student', correct: false }, { label: 'Teacher', correct: true }],
        feedback: { hanzi: '老師', pinyin: 'lǎoshī', meaning: 'teacher' },
      },
      {
        k: 'question', title: 'Which sentence means “I am a student”?', audio: ['w:wo+w:shi+w:xuesheng'],
        noAuto: true,
        choices: [{ label: '我是學生。', correct: true }, { label: '我是老師。', correct: false }, { label: '他是學生。', correct: false }],
        feedback: { hanzi: '我是學生。', pinyin: 'Wǒ shì xuéshēng.', meaning: 'I am a student.' },
      },
    ],
  },
  {
    id: 24, partId: 6, title: 'Titles', minutes: 5,
    goal: 'Know the three titles Lesson 1 uses.',
    screens: [
      {
        k: 'vocabCards', title: 'Mr., Miss and Mrs.',
        talk: ['Hear two high notes here. [[w:xiansheng|先生]]',
          'Hear the first syllable rise here. [[w:xiaojie|小姐]]',
          'Hear the light ending here. [[w:taitai|太太]]'],
        cardIds: ['B1L00-1-11', 'B1L00-1-12', 'B1L00-1-13'],
      },
      {
        k: 'word', title: 'Family name first', pinyin: 'Wáng xiānshēng', hanzi: '王先生',
        meaning: 'Mr. Wang', audio: 'wang2+w:xiansheng',
        talk: ['Say the family name before the title. [[wang2+w:xiansheng|王先生]]'],
      },
      {
        k: 'question', title: 'Which title for “Miss” do you hear?', audio: ['w:xiaojie'], layout: 'three',
        choices: [{ label: '太太', correct: false }, { label: '先生', correct: false }, { label: '小姐', correct: true }],
        feedback: { hanzi: '小姐', pinyin: 'xiǎojiě', meaning: 'Miss' },
      },
      {
        k: 'question', title: 'Which title for “Mr.” do you hear?', audio: ['w:xiansheng'], layout: 'three',
        choices: [{ label: '先生', correct: true }, { label: '小姐', correct: false }, { label: '太太', correct: false }],
        feedback: { hanzi: '先生', pinyin: 'xiānshēng', meaning: 'Mr.' },
      },
      {
        k: 'question', title: 'Which title for “Mrs.” do you hear?', audio: ['w:taitai'], layout: 'three',
        choices: [{ label: '先生', correct: false }, { label: '太太', correct: true }, { label: '小姐', correct: false }],
        feedback: { hanzi: '太太', pinyin: 'tàitai', meaning: 'Mrs.' },
      },
    ],
  },
];
