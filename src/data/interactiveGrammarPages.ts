import type { InteractiveGrammarPage, InteractiveGrammarPart } from '../types/models';
import { LESSON_ONE_PART_TWO } from './interactiveGrammarLessonOnePartTwo';
import { LESSON_TWO_PART_ONE } from './grammar/lessonTwoPartOne';
import { LESSON_TWO_PART_TWO } from './grammar/lessonTwoPartTwo';
import { LESSON_THREE_PART_ONE } from './grammar/lessonThreePartOne';
import { LESSON_THREE_PART_TWO } from './grammar/lessonThreePartTwo';
import { LESSON_FOUR_PART_ONE } from './grammar/lessonFourPartOne';
import { LESSON_FOUR_PART_TWO } from './grammar/lessonFourPartTwo';
import { LESSON_FIVE_PART_ONE } from './grammar/lessonFivePartOne';
import { LESSON_FIVE_PART_TWO } from './grammar/lessonFivePartTwo';
import { LESSON_SIX_PART_ONE } from './grammar/lessonSixPartOne';
import { LESSON_SIX_PART_TWO } from './grammar/lessonSixPartTwo';
import { LESSON_SEVEN_PART_ONE, LESSON_SEVEN_PART_TWO } from './grammar/lessonSeven';
import { LESSON_EIGHT_PART_ONE, LESSON_EIGHT_PART_TWO } from './grammar/lessonEight';
import { LESSON_NINE_PART_ONE, LESSON_NINE_PART_TWO } from './grammar/lessonNine';
import { LESSON_TEN_PART_ONE, LESSON_TEN_PART_TWO } from './grammar/lessonTen';
import { LESSON_ELEVEN_PART_ONE, LESSON_ELEVEN_PART_TWO } from './grammar/lessonEleven';
import { LESSON_TWELVE_PART_ONE, LESSON_TWELVE_PART_TWO } from './grammar/lessonTwelve';
import { LESSON_THIRTEEN_PART_ONE, LESSON_THIRTEEN_PART_TWO } from './grammar/lessonThirteen';
import { LESSON_FOURTEEN_PART_ONE, LESSON_FOURTEEN_PART_TWO } from './grammar/lessonFourteen';

export {
  LESSON_ONE_GRAMMAR_FOUR,
  LESSON_ONE_GRAMMAR_FIVE,
  LESSON_ONE_PART_TWO,
} from './interactiveGrammarLessonOnePartTwo';

export const LESSON_ONE_GRAMMAR_ONE: InteractiveGrammarPage = {
  id: 'B1L01-G01-P38',
  bookId: 1,
  lessonId: 1,
  partId: 1,
  lessonTitle: '新同學',
  lessonTitleEnglish: 'The New Classmate',
  grammarNumber: 1,
  titleTraditional: '叫、姓、是',
  titleEnglish: 'Use 叫, 姓, and 是 to Identify Someone',
  learnerPromise: 'Introduce someone by name, surname, or identity.',
  printedPages: [38, 39],
  audioReference: '01-1-3',
  explanation: 'Choose the clue you want to give: 叫 for a name, 姓 for a family name only, and 是 for an identity.',
  focusTerms: ['叫', '姓', '是'],
  teachingGlossary: [
    { id: 'g1-glossary-jiao', traditional: '叫', pinyin: 'jiào', meaning: 'to be called; introduces a given or full name' },
    { id: 'g1-glossary-xing', traditional: '姓', pinyin: 'xìng', meaning: 'to have the surname; introduces a family name' },
    { id: 'g1-glossary-shi', traditional: '是', pinyin: 'shì', meaning: 'to be; links someone to an identity or category' },
    { id: 'g1-glossary-zhang', traditional: '張', simplified: '张', pinyin: 'Zhāng', meaning: 'Zhang; a family name' },
    { id: 'g1-glossary-zhang-xiaoming', traditional: '張小明', simplified: '张小明', pinyin: 'Zhāng Xiǎomíng', meaning: 'Zhang Xiaoming; a full name' },
  ],
  pattern: 'Person + identity verb + name or identity',
  patternColumns: ['Person', 'Name or identity verb', 'Name or identity'],
  patternColumnDetails: ['Who?', '叫 · 姓 · 是', 'What clue?'],
  patternAccentColumn: 1,
  discoveryLab: {
    title: 'Change the verb, change the identity clue',
    description: 'All three sentences introduce the same person, but each verb answers a different question.',
    prompt: 'What do you want the listener to learn?',
    choices: [
      {
        id: 'g1-called',
        label: 'Her name',
        traditional: '她叫小林友美。',
        simplified: '她叫小林友美。',
        pinyin: 'Tā jiào Xiǎolín Yǒuměi.',
        english: 'Her name is Xiaolin Youmei.',
        note: '叫 can introduce a given name or the complete name someone uses.',
      },
      {
        id: 'g1-surname',
        label: 'Her surname',
        traditional: '她姓小林。',
        simplified: '她姓小林。',
        pinyin: 'Tā xìng Xiǎolín.',
        english: 'Her surname is Xiaolin.',
        note: '姓 points only to the family-name part. Do not put the full name after it.',
      },
      {
        id: 'g1-identity',
        label: 'Who she is',
        traditional: '她是新同學。',
        simplified: '她是新同学。',
        pinyin: 'Tā shì xīn tóngxué.',
        english: 'She is the new classmate.',
        note: '是 links a person to an identity or category, not directly to a personal name.',
      },
    ],
    takeaway: 'Ask yourself: name, family name, or identity? That choice tells you whether to use 叫、姓, or 是.',
  },
  ruleContrast: {
    title: 'Family name only after 姓',
    description: 'A full name needs 叫. 姓 stops after the family-name part.',
    examples: [
      {
        id: 'g1-rule-wrong-full-name',
        status: 'incorrect',
        label: 'Full name after 姓',
        traditional: '她姓張小明。',
        simplified: '她姓张小明。',
        explanation: '張小明 is the complete name, so 姓 is too narrow.',
      },
      {
        id: 'g1-rule-called-full-name',
        status: 'correct',
        label: 'Full name',
        traditional: '她叫張小明。',
        simplified: '她叫张小明。',
        explanation: '叫 introduces the complete name.',
      },
      {
        id: 'g1-rule-surname',
        status: 'correct',
        label: 'Family name',
        traditional: '她姓張。',
        simplified: '她姓张。',
        explanation: '姓 introduces only 張, the family name.',
      },
    ],
  },
  patternRows: [
    {
      id: 'pattern-1',
      subject: [{ id: 'p1-he', traditional: '他', pinyin: 'tā', meaning: 'he' }],
      grammar: [{ id: 'p1-called', traditional: '叫', pinyin: 'jiào', meaning: 'to be called' }],
      complement: [{ id: 'p1-zhongming', traditional: '中明', pinyin: 'Zhōngmíng', meaning: 'Zhongming', suffix: '。' }],
      english: 'His name is Zhongming.',
    },
    {
      id: 'pattern-2',
      subject: [{ id: 'p2-who', traditional: '誰', simplified: '谁', pinyin: 'shéi', meaning: 'who' }],
      grammar: [{ id: 'p2-surname', traditional: '姓', pinyin: 'xìng', meaning: 'to have the surname' }],
      complement: [{ id: 'p2-li', traditional: '李', pinyin: 'Lǐ', meaning: 'Li', suffix: '？' }],
      english: 'Whose surname is Li?',
    },
    {
      id: 'pattern-3',
      subject: [{ id: 'p3-he', traditional: '他', pinyin: 'tā', meaning: 'he' }],
      grammar: [
        { id: 'p3-not', traditional: '不', pinyin: 'bú', meaning: 'not' },
        { id: 'p3-is', traditional: '是', pinyin: 'shì', meaning: 'is / am / are' },
      ],
      complement: [
        { id: 'p3-taiwan', traditional: '臺灣', simplified: '台湾', pinyin: 'Táiwān', meaning: 'Taiwan' },
        { id: 'p3-person', traditional: '人', pinyin: 'rén', meaning: 'person', suffix: '。' },
      ],
      english: 'He is not Taiwanese.',
    },
  ],
  examples: [
    {
      id: 'example-1',
      number: 1,
      text: {
        traditional: 'A：她是誰？ B：她是新同學。',
        simplified: 'A：她是谁？ B：她是新同学。',
        pinyin: 'A: Tā shì shéi?  B: Tā shì xīn tóngxué.',
        english: 'A: Who is she? B: She is a new classmate.',
        words: [
          { id: 'e1-she-a', traditional: '她', pinyin: 'tā', meaning: 'she', prefix: 'A：', alignmentId: 'e1-question-she' },
          { id: 'e1-is-a', traditional: '是', pinyin: 'shì', meaning: 'is / am / are', alignmentId: 'e1-question-is' },
          { id: 'e1-who', traditional: '誰', simplified: '谁', pinyin: 'shéi', meaning: 'who', suffix: '？', alignmentId: 'e1-question-who' },
          { id: 'e1-she-b', traditional: '她', pinyin: 'tā', meaning: 'she', prefix: 'B：', alignmentId: 'e1-answer-she' },
          { id: 'e1-is-b', traditional: '是', pinyin: 'shì', meaning: 'is / am / are', alignmentId: 'e1-answer-is' },
          { id: 'e1-new', traditional: '新', pinyin: 'xīn', meaning: 'new', alignmentId: 'e1-answer-role' },
          { id: 'e1-classmate', traditional: '同學', simplified: '同学', pinyin: 'tóngxué', meaning: 'classmate', suffix: '。', alignmentId: 'e1-answer-role' },
        ],
        translationSegments: [
          { id: 'e1-t1', text: 'A: ' },
          { id: 'e1-t2', text: 'Who', alignmentId: 'e1-question-who' },
          { id: 'e1-t3', text: ' is ', alignmentId: 'e1-question-is' },
          { id: 'e1-t4', text: 'she', alignmentId: 'e1-question-she' },
          { id: 'e1-t5', text: '? B: ' },
          { id: 'e1-t6', text: 'She', alignmentId: 'e1-answer-she' },
          { id: 'e1-t7', text: ' is ', alignmentId: 'e1-answer-is' },
          { id: 'e1-t8', text: 'a new classmate', alignmentId: 'e1-answer-role' },
          { id: 'e1-t9', text: '.' },
        ],
      },
    },
    {
      id: 'example-2',
      number: 2,
      text: {
        traditional: '她是日本人，她不是台灣人。',
        simplified: '她是日本人，她不是台湾人。',
        pinyin: 'Tā shì Rìběn rén, tā bú shì Táiwān rén.',
        english: 'She is Japanese. She is not Taiwanese.',
        words: [
          { id: 'e2-she-a', traditional: '她', pinyin: 'tā', meaning: 'she', alignmentId: 'e2-she-a' },
          { id: 'e2-is-a', traditional: '是', pinyin: 'shì', meaning: 'is / am / are', alignmentId: 'e2-is-a' },
          { id: 'e2-japan', traditional: '日本', pinyin: 'Rìběn', meaning: 'Japan', alignmentId: 'e2-japanese' },
          { id: 'e2-person-a', traditional: '人', pinyin: 'rén', meaning: 'person', suffix: '，', alignmentId: 'e2-japanese' },
          { id: 'e2-she-b', traditional: '她', pinyin: 'tā', meaning: 'she', alignmentId: 'e2-she-b' },
          { id: 'e2-not', traditional: '不', pinyin: 'bú', meaning: 'not', alignmentId: 'e2-not' },
          { id: 'e2-is-b', traditional: '是', pinyin: 'shì', meaning: 'is / am / are', alignmentId: 'e2-is-b' },
          { id: 'e2-taiwan', traditional: '臺灣', simplified: '台湾', pinyin: 'Táiwān', meaning: 'Taiwan', alignmentId: 'e2-taiwanese' },
          { id: 'e2-person-b', traditional: '人', pinyin: 'rén', meaning: 'person', suffix: '。', alignmentId: 'e2-taiwanese' },
        ],
        translationSegments: [
          { id: 'e2-t1', text: 'She', alignmentId: 'e2-she-a' },
          { id: 'e2-t2', text: ' is ', alignmentId: 'e2-is-a' },
          { id: 'e2-t3', text: 'Japanese', alignmentId: 'e2-japanese' },
          { id: 'e2-t4', text: '. ' },
          { id: 'e2-t5', text: 'She', alignmentId: 'e2-she-b' },
          { id: 'e2-t6', text: ' is ', alignmentId: 'e2-is-b' },
          { id: 'e2-t7', text: 'not ', alignmentId: 'e2-not' },
          { id: 'e2-t8', text: 'Taiwanese', alignmentId: 'e2-taiwanese' },
          { id: 'e2-t9', text: '.' },
        ],
      },
    },
    {
      id: 'example-3',
      number: 3,
      text: {
        traditional: '她不姓李，她姓小林，叫小林友美。',
        simplified: '她不姓李，她姓小林，叫小林友美。',
        pinyin: 'Tā bú xìng Lǐ, tā xìng Xiǎolín, jiào Xiǎolín Yǒuměi.',
        english: 'Her surname is not Li. Her surname is Kobayashi, and her name is Kobayashi Youmei.',
        words: [
          { id: 'e3-she-a', traditional: '她', pinyin: 'tā', meaning: 'she' },
          { id: 'e3-not', traditional: '不', pinyin: 'bú', meaning: 'not' },
          { id: 'e3-surname-a', traditional: '姓', pinyin: 'xìng', meaning: 'to have the surname' },
          { id: 'e3-li', traditional: '李', pinyin: 'Lǐ', meaning: 'Li', suffix: '，' },
          { id: 'e3-she-b', traditional: '她', pinyin: 'tā', meaning: 'she' },
          { id: 'e3-surname-b', traditional: '姓', pinyin: 'xìng', meaning: 'to have the surname' },
          { id: 'e3-xiaolin-a', traditional: '小林', pinyin: 'Xiǎolín', meaning: 'Kobayashi', suffix: '，' },
          { id: 'e3-called', traditional: '叫', pinyin: 'jiào', meaning: 'to be called' },
          { id: 'e3-xiaolin-b', traditional: '小林', pinyin: 'Xiǎolín', meaning: 'Kobayashi' },
          { id: 'e3-youmei', traditional: '友美', pinyin: 'Yǒuměi', meaning: 'Youmei', suffix: '。' },
        ],
      },
    },
  ],
  profiles: [
    {
      id: 'youmei',
      avatar: 'youmei',
      countryCode: 'JP',
      surname: '小林',
      givenName: '友美',
      fullNamePinyin: 'Xiǎolín Yǒuměi',
      country: '日本人',
      countryPinyin: 'Rìběn rén',
    },
    {
      id: 'jiale',
      avatar: 'jiale',
      countryCode: 'GB',
      surname: '高',
      givenName: '家樂',
      fullNamePinyin: 'Gāo Jiālè',
      country: '英國人',
      countryPinyin: 'Yīngguó rén',
    },
    {
      id: 'yiwen',
      avatar: 'yiwen',
      countryCode: 'US',
      surname: '王',
      givenName: '宜文',
      fullNamePinyin: 'Wáng Yíwén',
      country: '美國人',
      countryPinyin: 'Měiguó rén',
    },
    {
      id: 'zhongming',
      avatar: 'zhongming',
      countryCode: 'ID',
      surname: '李',
      givenName: '中明',
      fullNamePinyin: 'Lǐ Zhōngmíng',
      country: '印尼人',
      countryPinyin: 'Yìnní rén',
    },
  ],
  exerciseTitle: 'Complete the profiles',
  exercisePreview: 'Use the four profiles to complete the sentences.',
  exerciseInstruction: 'Drag or tap the correct tiles into the blanks.',
  exerciseNote: 'Questions 3–4 continue at the top of printed page 39.',
  questions: [
    {
      id: 'question-1',
      number: 1,
      segments: [
        { type: 'text', traditional: 'A：誰是新學生？ B：', simplified: 'A：谁是新学生？ B：' },
        { type: 'blank', id: 'q1-name', answer: '友美', hint: 'Look for the Japanese new classmate.' },
        { type: 'text', traditional: '是新學生，她是日本人。', simplified: '是新学生，她是日本人。' },
      ],
      tiles: [
        { id: 'q1-youmei', traditional: '友美' },
        { id: 'q1-yiwen', traditional: '宜文' },
        { id: 'q1-jiale', traditional: '家樂', simplified: '家乐' },
        { id: 'q1-zhongming', traditional: '中明' },
      ],
    },
    {
      id: 'question-2',
      number: 2,
      segments: [
        { type: 'text', traditional: '家樂（Jiālè）是', simplified: '家乐（Jiālè）是' },
        { type: 'blank', id: 'q2-country', answer: '英國', answerSimplified: '英国', hint: 'Use the country shown beside 高家樂.' },
        { type: 'text', traditional: '人，他姓' },
        { type: 'blank', id: 'q2-surname', answer: '高', hint: '姓 introduces the family name.' },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'q2-uk', traditional: '英國', simplified: '英国' },
        { id: 'q2-usa', traditional: '美國', simplified: '美国' },
        { id: 'q2-gao', traditional: '高' },
        { id: 'q2-li', traditional: '李' },
      ],
    },
    {
      id: 'question-3',
      number: 3,
      segments: [
        { type: 'text', traditional: '王（Wáng）小姐是' },
        { type: 'blank', id: 'q3-country', answer: '美國', answerSimplified: '美国', hint: 'Use the country shown beside 王宜文.' },
        { type: 'text', traditional: '人，她叫' },
        { type: 'blank', id: 'q3-name', answer: '宜文', hint: '叫 introduces the given name.' },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'q3-usa', traditional: '美國', simplified: '美国' },
        { id: 'q3-uk', traditional: '英國', simplified: '英国' },
        { id: 'q3-yiwen', traditional: '宜文' },
        { id: 'q3-youmei', traditional: '友美' },
      ],
    },
    {
      id: 'question-4',
      number: 4,
      segments: [
        { type: 'text', traditional: '印尼（Yìnní）學生', simplified: '印尼（Yìnní）学生' },
        { type: 'blank', id: 'q4-surname', answer: '姓', hint: 'Use the verb for a family name.' },
        { type: 'text', traditional: '李（Lǐ），' },
        { type: 'blank', id: 'q4-name', answer: '叫', hint: 'Use the verb for a given or full name.' },
        { type: 'text', traditional: '中明（Zhōngmíng）。' },
      ],
      tiles: [
        { id: 'q4-xing', traditional: '姓' },
        { id: 'q4-jiao', traditional: '叫' },
        { id: 'q4-shi', traditional: '是' },
        { id: 'q4-bu', traditional: '不' },
      ],
    },
  ],
};

export const LESSON_ONE_GRAMMAR_TWO: InteractiveGrammarPage = {
  id: 'B1L01-G02-P39',
  bookId: 1,
  lessonId: 1,
  partId: 1,
  lessonTitle: '新同學',
  lessonTitleEnglish: 'The New Classmate',
  grammarNumber: 2,
  titleTraditional: '很／不',
  titleEnglish: 'Describe a State with 很 or 不',
  learnerPromise: 'Say that someone is or is not busy, tired, pretty, or cute.',
  printedPages: [39],
  audioReference: '01-1-3',
  explanation: '漂亮, 忙, and 累 already describe a state. Use 很 for a positive state or 不 for a negative one. Do not place 是 before the description.',
  focusTerms: ['很', '不', '是'],
  teachingGlossary: [
    { id: 'g2-glossary-hen', traditional: '很', pinyin: 'hěn', meaning: 'links a subject to a positive state; often softer than English “very”' },
    { id: 'g2-glossary-bu', traditional: '不', pinyin: 'bù', meaning: 'not; makes the following state negative' },
    { id: 'g2-glossary-shi', traditional: '是', pinyin: 'shì', meaning: 'identity-linking “to be”; not used before this kind of state description' },
    { id: 'g2-glossary-piaoliang', traditional: '漂亮', pinyin: 'piàoliang', meaning: 'pretty; describes a state or quality' },
    { id: 'g2-glossary-mang', traditional: '忙', pinyin: 'máng', meaning: 'busy; describes a state' },
    { id: 'g2-glossary-lei', traditional: '累', pinyin: 'lèi', meaning: 'tired; describes a state' },
    { id: 'g2-glossary-keai', traditional: '可愛', simplified: '可爱', pinyin: "kě'ài", meaning: 'cute; lovely; describes a quality' },
  ],
  pattern: 'S + 很/不 + Vs',
  patternColumns: ['S', '很／不', 'Vs'],
  discoveryLab: {
    title: 'Keep the description lane free of 是',
    description: 'Tap the middle word and watch how the meaning changes. The describing word already does the job that English gives to “is.”',
    prompt: 'How does the speaker see her?',
    choices: [
      {
        id: 'g2-positive',
        label: 'Positive · 很',
        traditional: '她很可愛。',
        simplified: '她很可爱。',
        pinyin: "Tā hěn kě'ài.",
        english: 'She is cute.',
        note: '很 creates the normal positive description pattern. In everyday sentences, it may sound softer than a strong English “very.”',
      },
      {
        id: 'g2-negative',
        label: 'Negative · 不',
        traditional: '她不可愛。',
        simplified: '她不可爱。',
        pinyin: "Tā bù kě'ài.",
        english: 'She is not cute.',
        note: '不 replaces 很 and sits directly before the state: 不 + 可愛.',
      },
      {
        id: 'g2-repair',
        label: 'Repair · no 是',
        traditional: '她是可愛。 → 她很可愛。',
        simplified: '她是可爱。 → 她很可爱。',
        pinyin: "Tā shì kě'ài. → Tā hěn kě'ài.",
        english: 'Repair it: She is cute.',
        note: 'For this beginner description pattern, remove 是. 是 links identities; 可愛 already describes her state.',
        isCorrection: true,
      },
    ],
    takeaway: 'Identity uses 是; description uses 很／不 + state. That single split prevents the most common beginner mistake.',
  },
  patternRows: [
    {
      id: 'g2-pattern-1',
      subject: [{ id: 'g2-p1-she', traditional: '她', pinyin: 'tā', meaning: 'she' }],
      grammar: [{ id: 'g2-p1-very', traditional: '很', pinyin: 'hěn', meaning: 'very; linking adverb before a state verb' }],
      complement: [{ id: 'g2-p1-pretty', traditional: '漂亮', pinyin: 'piàoliang', meaning: 'pretty', suffix: '。' }],
      english: 'She is (very) pretty.',
    },
  ],
  examples: [
    {
      id: 'g2-example-1',
      number: 1,
      text: {
        traditional: '她很可愛。',
        simplified: '她很可爱。',
        pinyin: "Tā hěn kě'ài.",
        english: 'She is very cute.',
        words: [
          { id: 'g2-e1-she', traditional: '她', pinyin: 'tā', meaning: 'she' },
          { id: 'g2-e1-very', traditional: '很', pinyin: 'hěn', meaning: 'very; linking adverb before a state verb' },
          { id: 'g2-e1-cute', traditional: '可愛', simplified: '可爱', pinyin: "kě'ài", meaning: 'cute; lovely', suffix: '。' },
        ],
      },
    },
    {
      id: 'g2-example-2',
      number: 2,
      text: {
        traditional: '王先生很忙。',
        pinyin: 'Wáng xiānsheng hěn máng.',
        english: 'Mr. Wang is very busy.',
        words: [
          { id: 'g2-e2-wang', traditional: '王', pinyin: 'Wáng', meaning: 'surname Wang' },
          { id: 'g2-e2-mister', traditional: '先生', pinyin: 'xiānsheng', meaning: 'Mr.; gentleman' },
          { id: 'g2-e2-very', traditional: '很', pinyin: 'hěn', meaning: 'very; linking adverb before a state verb' },
          { id: 'g2-e2-busy', traditional: '忙', pinyin: 'máng', meaning: 'busy', suffix: '。' },
        ],
      },
    },
    {
      id: 'g2-example-3',
      number: 3,
      text: {
        traditional: '我們不累，王太太很累。',
        simplified: '我们不累，王太太很累。',
        pinyin: 'Wǒmen bú lèi, Wáng tàitai hěn lèi.',
        english: 'We are not tired; Mrs. Wang is very tired.',
        words: [
          { id: 'g2-e3-we', traditional: '我們', simplified: '我们', pinyin: 'wǒmen', meaning: 'we' },
          { id: 'g2-e3-not', traditional: '不', pinyin: 'bú', meaning: 'not' },
          { id: 'g2-e3-tired-a', traditional: '累', pinyin: 'lèi', meaning: 'tired', suffix: '，' },
          { id: 'g2-e3-wang', traditional: '王', pinyin: 'Wáng', meaning: 'surname Wang' },
          { id: 'g2-e3-mrs', traditional: '太太', pinyin: 'tàitai', meaning: 'Mrs.; wife' },
          { id: 'g2-e3-very', traditional: '很', pinyin: 'hěn', meaning: 'very; linking adverb before a state verb' },
          { id: 'g2-e3-tired-b', traditional: '累', pinyin: 'lèi', meaning: 'tired', suffix: '。' },
        ],
      },
    },
  ],
  exerciseTitle: 'Choose 很 or 不',
  exercisePreview: 'Use the three picture cues to complete the book exercise.',
  exerciseInstruction: 'Tap 很 or 不, then place it in the blank.',
  exerciseNote: 'Adapted from the illustrated exercise on printed page 39.',
  exerciseCues: [
    { id: 'g2-cue-1', label: '友美 · 漂亮', pinyin: 'Yǒuměi · piàoliang', detail: 'The printed picture presents Youmei as pretty.' },
    { id: 'g2-cue-2', label: '他 · 忙', pinyin: 'tā · máng', detail: 'The printed picture shows a busy office worker.' },
    { id: 'g2-cue-3', label: '王太太累；中明不累', pinyin: 'Wáng tàitai lèi; Zhōngmíng bú lèi', detail: 'The printed picture contrasts tired Mrs. Wang with Zhongming.' },
  ],
  questions: [
    {
      id: 'g2-question-1',
      number: 1,
      segments: [
        { type: 'text', traditional: '友美（Yǒuměi）' },
        { type: 'blank', id: 'g2-q1-adverb', answer: '很', hint: 'The picture presents Youmei as pretty.' },
        { type: 'text', traditional: '漂亮。' },
      ],
      tiles: [
        { id: 'g2-q1-hen', traditional: '很' },
        { id: 'g2-q1-bu', traditional: '不' },
      ],
    },
    {
      id: 'g2-question-2',
      number: 2,
      segments: [
        { type: 'text', traditional: '他' },
        { type: 'blank', id: 'g2-q2-adverb', answer: '很', hint: 'The office worker is surrounded by work.' },
        { type: 'text', traditional: '忙（máng）。' },
      ],
      tiles: [
        { id: 'g2-q2-hen', traditional: '很' },
        { id: 'g2-q2-bu', traditional: '不' },
      ],
    },
    {
      id: 'g2-question-3',
      number: 3,
      segments: [
        { type: 'text', traditional: '她很累，中明（Zhōngmíng）' },
        { type: 'blank', id: 'g2-q3-adverb', answer: '不', hint: 'The picture contrasts tired Mrs. Wang with Zhongming.' },
        { type: 'text', traditional: '累（lèi）。' },
      ],
      tiles: [
        { id: 'g2-q3-hen', traditional: '很' },
        { id: 'g2-q3-bu', traditional: '不' },
      ],
    },
  ],
};

export const LESSON_ONE_GRAMMAR_THREE: InteractiveGrammarPage = {
  id: 'B1L01-G03-P40',
  bookId: 1,
  lessonId: 1,
  partId: 1,
  lessonTitle: '新同學',
  lessonTitleEnglish: 'The New Classmate',
  grammarNumber: 3,
  titleTraditional: '嗎',
  titleEnglish: 'Turn a Statement into a 嗎 Question',
  learnerPromise: 'Turn a statement into a natural yes-or-no question.',
  printedPages: [40],
  audioReference: '01-1-3',
  explanation: 'Keep the complete statement in its original order, then add 嗎 at the end. The listener can now answer yes or no; nothing inside the statement needs to move.',
  focusTerms: ['嗎', '吗'],
  teachingGlossary: [
    { id: 'g3-glossary-ma', traditional: '嗎', simplified: '吗', pinyin: 'ma', meaning: 'yes/no question particle placed at the end of a statement' },
    { id: 'g3-glossary-shi', traditional: '是', pinyin: 'shì', meaning: 'to be; links someone to an identity or category' },
    { id: 'g3-glossary-hen', traditional: '很', pinyin: 'hěn', meaning: 'links a subject to a positive state' },
  ],
  pattern: 'Statement + 嗎',
  patternColumns: ['S', 'Predicate', '嗎'],
  patternAccentColumn: 2,
  patternMobileLayout: 'middle-wide',
  discoveryLab: {
    title: 'One small ending flips the listener’s job',
    description: 'The people, verb, and description stay exactly where they were. Only the ending changes.',
    prompt: 'Are you telling or checking?',
    choices: [
      {
        id: 'g3-tell',
        label: 'Tell · statement',
        traditional: '她很可愛。',
        simplified: '她很可爱。',
        pinyin: "Tā hěn kě'ài.",
        english: 'She is cute.',
        note: 'A full stop tells the listener that you are giving information.',
      },
      {
        id: 'g3-check',
        label: 'Check · + 嗎',
        traditional: '她很可愛嗎？',
        simplified: '她很可爱吗？',
        pinyin: "Tā hěn kě'ài ma?",
        english: 'Is she cute?',
        note: 'Add 嗎 after the untouched statement. The word order does not flip as it does in English.',
      },
      {
        id: 'g3-repair',
        label: 'Avoid English order',
        traditional: '嗎她很可愛？ → 她很可愛嗎？',
        simplified: '吗她很可爱？ → 她很可爱吗？',
        pinyin: "Ma tā hěn kě'ài? → Tā hěn kě'ài ma?",
        english: 'Move 嗎 to the end.',
        note: '嗎 never starts this question. Build the statement first, then place 嗎 at the finish line.',
        isCorrection: true,
      },
    ],
    takeaway: 'Statement first, 嗎 last. If the statement works by itself, the yes/no question is almost finished.',
  },
  patternRows: [
    {
      id: 'g3-pattern-1',
      subject: [{ id: 'g3-p1-he', traditional: '他', pinyin: 'tā', meaning: 'he' }],
      grammar: [
        { id: 'g3-p1-is', traditional: '是', pinyin: 'shì', meaning: 'is / am / are' },
        { id: 'g3-p1-taiwan', traditional: '臺灣', simplified: '台湾', pinyin: 'Táiwān', meaning: 'Taiwan' },
        { id: 'g3-p1-person', traditional: '人', pinyin: 'rén', meaning: 'person' },
      ],
      complement: [{ id: 'g3-p1-ma', traditional: '嗎', simplified: '吗', pinyin: 'ma', meaning: 'yes/no question particle', suffix: '？' }],
      english: 'Is he Taiwanese?',
    },
    {
      id: 'g3-pattern-2',
      subject: [{ id: 'g3-p2-she', traditional: '她', pinyin: 'tā', meaning: 'she' }],
      grammar: [{ id: 'g3-p2-pretty', traditional: '漂亮', pinyin: 'piàoliang', meaning: 'pretty' }],
      complement: [{ id: 'g3-p2-ma', traditional: '嗎', simplified: '吗', pinyin: 'ma', meaning: 'yes/no question particle', suffix: '？' }],
      english: 'Is she pretty?',
    },
  ],
  examples: [
    {
      id: 'g3-example-1',
      number: 1,
      text: {
        traditional: 'A：他是日本人嗎？ B：他不是日本人，他是台灣人。',
        simplified: 'A：他是日本人吗？ B：他不是日本人，他是台湾人。',
        pinyin: 'A: Tā shì Rìběn rén ma? B: Tā bú shì Rìběn rén, tā shì Táiwān rén.',
        english: 'A: Is he Japanese? B: No, he is not Japanese. He is Taiwanese.',
        words: [
          { id: 'g3-e1-he-a', traditional: '他', pinyin: 'tā', meaning: 'he', prefix: 'A：' },
          { id: 'g3-e1-is-a', traditional: '是', pinyin: 'shì', meaning: 'is / am / are' },
          { id: 'g3-e1-japan-a', traditional: '日本', pinyin: 'Rìběn', meaning: 'Japan' },
          { id: 'g3-e1-person-a', traditional: '人', pinyin: 'rén', meaning: 'person' },
          { id: 'g3-e1-ma', traditional: '嗎', simplified: '吗', pinyin: 'ma', meaning: 'yes/no question particle', suffix: '？' },
          { id: 'g3-e1-he-b', traditional: '他', pinyin: 'tā', meaning: 'he', prefix: 'B：' },
          { id: 'g3-e1-not', traditional: '不', pinyin: 'bú', meaning: 'not' },
          { id: 'g3-e1-is-b', traditional: '是', pinyin: 'shì', meaning: 'is / am / are' },
          { id: 'g3-e1-japan-b', traditional: '日本', pinyin: 'Rìběn', meaning: 'Japan' },
          { id: 'g3-e1-person-b', traditional: '人', pinyin: 'rén', meaning: 'person', suffix: '，' },
          { id: 'g3-e1-he-c', traditional: '他', pinyin: 'tā', meaning: 'he' },
          { id: 'g3-e1-is-c', traditional: '是', pinyin: 'shì', meaning: 'is / am / are' },
          { id: 'g3-e1-taiwan', traditional: '臺灣', simplified: '台湾', pinyin: 'Táiwān', meaning: 'Taiwan' },
          { id: 'g3-e1-person-c', traditional: '人', pinyin: 'rén', meaning: 'person', suffix: '。' },
        ],
      },
    },
    {
      id: 'g3-example-2',
      number: 2,
      text: {
        traditional: '高先生叫家樂嗎？',
        simplified: '高先生叫家乐吗？',
        pinyin: 'Gāo xiānsheng jiào Jiālè ma?',
        english: 'Is Mr. Gao called Jiale?',
        words: [
          { id: 'g3-e2-gao', traditional: '高', pinyin: 'Gāo', meaning: 'surname Gao' },
          { id: 'g3-e2-mister', traditional: '先生', pinyin: 'xiānsheng', meaning: 'Mr.; gentleman' },
          { id: 'g3-e2-called', traditional: '叫', pinyin: 'jiào', meaning: 'to be called' },
          { id: 'g3-e2-jiale', traditional: '家樂', simplified: '家乐', pinyin: 'Jiālè', meaning: 'Jiale' },
          { id: 'g3-e2-ma', traditional: '嗎', simplified: '吗', pinyin: 'ma', meaning: 'yes/no question particle', suffix: '？' },
        ],
      },
    },
    {
      id: 'g3-example-3',
      number: 3,
      text: {
        traditional: '他忙嗎？',
        simplified: '他忙吗？',
        pinyin: 'Tā máng ma?',
        english: 'Is he busy?',
        words: [
          { id: 'g3-e3-he', traditional: '他', pinyin: 'tā', meaning: 'he' },
          { id: 'g3-e3-busy', traditional: '忙', pinyin: 'máng', meaning: 'busy' },
          { id: 'g3-e3-ma', traditional: '嗎', simplified: '吗', pinyin: 'ma', meaning: 'yes/no question particle', suffix: '？' },
        ],
      },
    },
  ],
  exerciseTitle: 'Complete the 嗎 questions',
  exercisePreview: 'Finish the three question-and-answer exchanges from page 40.',
  exerciseInstruction: 'Tap a tile, then place it in the matching blank.',
  exerciseNote: 'Question 3 uses the heart illustration printed beside the exercise.',
  exerciseCues: [
    { id: 'g3-cue-1', label: '她 · 可愛', pinyin: "tā · kě'ài", detail: 'The printed heart illustration presents her as cute.' },
  ],
  questions: [
    {
      id: 'g3-question-1',
      number: 1,
      segments: [
        { type: 'text', traditional: 'A：中明（Zhōngmíng）姓王（Wáng）' },
        { type: 'blank', id: 'g3-q1-particle', answer: '嗎', answerSimplified: '吗', hint: 'Add the yes/no question particle at the end.' },
        { type: 'text', traditional: '？ B：他不姓王（Wáng），他姓李（Lǐ）。' },
      ],
      tiles: [
        { id: 'g3-q1-ma', traditional: '嗎', simplified: '吗' },
        { id: 'g3-q1-ne', traditional: '呢' },
      ],
    },
    {
      id: 'g3-question-2',
      number: 2,
      segments: [
        { type: 'text', traditional: 'A：李（Lǐ）小姐是' },
        { type: 'blank', id: 'g3-q2-question', answer: '日本人嗎', answerSimplified: '日本人吗', hint: 'Her reply says she is Taiwanese, so ask whether she is Japanese.' },
        { type: 'text', traditional: '？ B：不是，她是臺灣人。', simplified: '？ B：不是，她是台湾人。' },
      ],
      tiles: [
        { id: 'g3-q2-japan', traditional: '日本人嗎', simplified: '日本人吗' },
        { id: 'g3-q2-taiwan', traditional: '臺灣人嗎', simplified: '台湾人吗' },
        { id: 'g3-q2-us', traditional: '美國人嗎', simplified: '美国人吗' },
      ],
    },
    {
      id: 'g3-question-3',
      number: 3,
      segments: [
        { type: 'text', traditional: 'A：她可愛', simplified: 'A：她可爱' },
        { type: 'blank', id: 'g3-q3-particle', answer: '嗎', answerSimplified: '吗', hint: 'Turn the statement into a yes/no question.' },
        { type: 'text', traditional: '？ B：她' },
        { type: 'blank', id: 'g3-q3-answer', answer: '很可愛', answerSimplified: '很可爱', hint: 'The heart illustration gives a positive description.' },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'g3-q3-ma', traditional: '嗎', simplified: '吗' },
        { id: 'g3-q3-ne', traditional: '呢' },
        { id: 'g3-q3-cute', traditional: '很可愛', simplified: '很可爱' },
        { id: 'g3-q3-not-cute', traditional: '不可愛', simplified: '不可爱' },
      ],
    },
  ],
};

const INTERACTIVE_GRAMMAR_PAGES = [
  LESSON_ONE_GRAMMAR_ONE,
  LESSON_ONE_GRAMMAR_TWO,
  LESSON_ONE_GRAMMAR_THREE,
];

export const LESSON_ONE_PART_ONE: InteractiveGrammarPart = {
  id: 'B1L01-P01-D01',
  bookId: 1,
  lessonId: 1,
  partId: 1,
  title: 'Grammar 1–3 · Pages 38–40',
  grammarPages: INTERACTIVE_GRAMMAR_PAGES,
  dialogue: {
    id: 'B1L01-D01',
    title: '對話一 · Dialogue 1',
    setting: '在教室 · In the classroom',
    printedPages: [34, 35],
    audioReference: '01-1-1',
    grammarFocus: ['叫', '姓', '是', '很', '不', '嗎'],
    lines: [
      { id: 'd1-l1', speaker: '中明', text: { traditional: '宜文，她是誰？', simplified: '宜文，她是谁？', pinyin: 'Yíwén, tā shì shéi?', english: 'Yiwen, who is she?' } },
      { id: 'd1-l2', speaker: '宜文', text: { traditional: '她是新同學，叫友美。她很可愛。', simplified: '她是新同学，叫友美。她很可爱。', pinyin: 'Tā shì xīn tóngxué, jiào Yǒuměi. Tā hěn kěài.', english: 'She is our new classmate. Her name is Youmei. She is cute.' } },
      { id: 'd1-l3', speaker: '中明', text: { traditional: '她是哪國人？妳知道嗎？', simplified: '她是哪国人？妳知道吗？', pinyin: 'Tā shì nǎ guó rén? Nǐ zhīdào ma?', english: 'Which country is she from? Do you know?' } },
      { id: 'd1-l4', speaker: '宜文', text: { traditional: '我知道，她是日本人。', pinyin: 'Wǒ zhīdào, tā shì Rìběn rén.', english: 'Yes, I do. She is from Japan.' } },
      { id: 'd1-l5', speaker: '中明', text: { traditional: '她很漂亮。', pinyin: 'Tā hěn piàoliàng.', english: 'She is very pretty.' } },
    ],
    comprehension: {
      prompt: '中明覺得友美怎麼樣？',
      options: ['很漂亮', '很忙', '很累'],
      answer: '很漂亮',
      hint: 'Listen to Zhongming’s last description of Youmei.',
    },
  },
  completionTitle: 'Part 1 complete — you can introduce, describe, and ask.',
  completionDescription: 'You practiced identity with 叫、姓、是, described states with 很、不, and formed yes/no questions with 嗎.',
  nextBookLabel: 'Next in the book · Page 41.',
};

export const INTERACTIVE_GRAMMAR_PARTS = [
  LESSON_ONE_PART_ONE,
  LESSON_ONE_PART_TWO,
  LESSON_TWO_PART_ONE,
  LESSON_TWO_PART_TWO,
  LESSON_THREE_PART_ONE,
  LESSON_THREE_PART_TWO,
  LESSON_FOUR_PART_ONE,
  LESSON_FOUR_PART_TWO,
  LESSON_FIVE_PART_ONE,
  LESSON_FIVE_PART_TWO,
  LESSON_SIX_PART_ONE,
  LESSON_SIX_PART_TWO,
  LESSON_SEVEN_PART_ONE,
  LESSON_SEVEN_PART_TWO,
  LESSON_EIGHT_PART_ONE,
  LESSON_EIGHT_PART_TWO,
  LESSON_NINE_PART_ONE,
  LESSON_NINE_PART_TWO,
  LESSON_TEN_PART_ONE,
  LESSON_TEN_PART_TWO,
  LESSON_ELEVEN_PART_ONE,
  LESSON_ELEVEN_PART_TWO,
  LESSON_TWELVE_PART_ONE,
  LESSON_TWELVE_PART_TWO,
  LESSON_THIRTEEN_PART_ONE,
  LESSON_THIRTEEN_PART_TWO,
  LESSON_FOURTEEN_PART_ONE,
  LESSON_FOURTEEN_PART_TWO,
];

export function getInteractiveGrammarPart(partId: string) {
  return INTERACTIVE_GRAMMAR_PARTS.find((part) => part.id === partId);
}

export function getInteractiveGrammarPartsForLesson(bookId: number, lessonId: number) {
  return INTERACTIVE_GRAMMAR_PARTS.filter(
    (part) => part.bookId === bookId && part.lessonId === lessonId,
  );
}
