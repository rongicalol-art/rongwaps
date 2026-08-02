import type { GrammarWordToken, InteractiveGrammarPage, InteractiveGrammarPart } from '../types/models';

const token = (
  id: string,
  traditional: string,
  pinyin: string,
  meaning: string,
  options: Partial<Pick<GrammarWordToken, 'simplified' | 'prefix' | 'suffix'>> = {},
): GrammarWordToken => ({ id, traditional, pinyin, meaning, ...options });

export const LESSON_ONE_GRAMMAR_FOUR: InteractiveGrammarPage = {
  id: 'B1L01-G04-P44',
  bookId: 1,
  lessonId: 1,
  partId: 2,
  lessonTitle: '新同學',
  lessonTitleEnglish: 'The New Classmate',
  grammarNumber: 4,
  titleTraditional: '呢',
  titleEnglish: 'Use 呢 to Say “And You?”',
  learnerPromise: 'Return an understood question without repeating the whole sentence.',
  printedPages: [44, 45],
  audioReference: '01-2-3',
  explanation:
    'When the topic is clear, 呢 passes the same question to another person. Say the new person or thing plus 呢; the listener recovers the missing question from context.',
  focusTerms: ['呢'],
  teachingGlossary: [
    token('g4-glossary-ne', '呢', 'ne', 'return-question particle; “and you?” when the earlier question is understood'),
    token('g4-glossary-ma', '嗎', 'ma', 'yes/no question particle that creates a new question', { simplified: '吗' }),
    token('g4-glossary-ni', '你', 'nǐ', 'you; the new person receiving the understood question'),
  ],
  pattern: 'Statement, + N + 呢',
  patternColumns: ['Statement', 'N', '呢'],
  patternAccentColumn: 2,
  patternMobileLayout: 'leading-wide',
  discoveryLab: {
    title: '呢 works like a conversation echo',
    description:
      'The short ending stays the same, but the understood question changes with the sentence immediately before it.',
    prompt: 'What topic are the speakers sharing?',
    choices: [
      {
        id: 'g4-discover-country',
        label: 'Country',
        traditional: '我是日本人，你呢？',
        simplified: '我是日本人，你呢？',
        pinyin: 'Wǒ shì Rìběn rén, nǐ ne?',
        english: 'I am Japanese. And you?',
        note: 'The hidden question is “Which country are you from?” The country topic carries across to 你.',
      },
      {
        id: 'g4-discover-name',
        label: 'Name',
        traditional: '我叫友美，你呢？',
        simplified: '我叫友美，你呢？',
        pinyin: 'Wǒ jiào Yǒuměi, nǐ ne?',
        english: 'My name is Youmei. And you?',
        note: 'Now the hidden question is “What is your name?” 呢 borrows the name topic instead of repeating it.',
      },
      {
        id: 'g4-discover-like',
        label: 'What you like',
        traditional: '我喜歡臺灣，你呢？',
        simplified: '我喜欢台湾，你呢？',
        pinyin: 'Wǒ xǐhuān Táiwān, nǐ ne?',
        english: 'I like Taiwan. How about you?',
        note: 'The listener understands “Do you like Taiwan?” because 喜歡臺灣 is the active topic.',
      },
      {
        id: 'g4-discover-repair',
        label: 'Needs context',
        traditional: '你呢？',
        simplified: '你呢？',
        pinyin: 'Nǐ ne?',
        english: 'And you?',
        note: 'This can work only when the previous sentence makes the missing question obvious. Without context, 呢 has nothing to echo.',
      },
    ],
    takeaway:
      'Think of 呢 as conversational copy-and-paste: keep the active question, change the person, and avoid repeating everything.',
  },
  patternRows: [
    {
      id: 'g4-pattern-1',
      subject: [
        token('g4-p1-i', '我', 'wǒ', 'I'),
        token('g4-p1-am', '是', 'shì', 'am'),
        token('g4-p1-taiwan', '臺灣', 'Táiwān', 'Taiwan', {
          simplified: '台湾',
        }),
        token('g4-p1-person', '人', 'rén', 'person', { suffix: '，' }),
      ],
      grammar: [token('g4-p1-you', '你', 'nǐ', 'you')],
      complement: [
        token('g4-p1-ne', '呢', 'ne', 'return-question particle', {
          suffix: '？',
        }),
      ],
      english: 'I am Taiwanese. How about you?',
    },
    {
      id: 'g4-pattern-2',
      subject: [
        token('g4-p2-yiwen', '宜文', 'Yíwén', 'Yiwen'),
        token('g4-p2-surname', '姓', 'xìng', 'to have the surname'),
        token('g4-p2-wang', '王', 'Wáng', 'surname Wang', { suffix: '，' }),
      ],
      grammar: [token('g4-p2-zhongming', '中明', 'Zhōngmíng', 'Zhongming')],
      complement: [
        token('g4-p2-ne', '呢', 'ne', 'return-question particle', {
          suffix: '？',
        }),
      ],
      english: "Yiwen's surname is Wang. How about Zhongming?",
    },
  ],
  contrast: {
    title: '嗎 or 呢?',
    description: 'Both appear at the end of questions, but they do different conversational jobs.',
    items: [
      {
        id: 'g4-contrast-ma',
        label: 'Ask a new yes/no question',
        traditional: '你是日本人嗎？',
        simplified: '你是日本人吗？',
        pinyin: 'Nǐ shì Rìběn rén ma?',
        english: 'Are you Japanese?',
        note: '嗎 turns the statement before it into a yes/no question.',
        particle: { id: 'g4-particle-ma', traditional: '嗎', simplified: '吗' },
      },
      {
        id: 'g4-contrast-ne',
        label: 'Return the established question',
        traditional: '我是日本人，你呢？',
        pinyin: 'Wǒ shì Rìběn rén, nǐ ne?',
        english: 'I am Japanese. How about you?',
        note: '呢 avoids repeating “Which country are you from?”',
        particle: { id: 'g4-particle-ne', traditional: '呢' },
      },
    ],
    microChecks: [
      {
        prompt: 'The first speaker already said where they are from. Which particle returns that question?',
        traditional: 'A：我是美國人，你___？',
        simplified: 'A：我是美国人，你___？',
        options: [
          { id: 'g4-check-1-ma', traditional: '嗎', simplified: '吗' },
          { id: 'g4-check-1-ne', traditional: '呢' },
        ],
        answerId: 'g4-check-1-ne',
        explanation: '呢 means “and you?” because the country question is already understood.',
      },
      {
        prompt: 'No nationality question has been asked yet. Which particle creates a new yes/no question?',
        traditional: '你是日本人___？',
        simplified: '你是日本人___？',
        options: [
          { id: 'g4-check-2-ma', traditional: '嗎', simplified: '吗' },
          { id: 'g4-check-2-ne', traditional: '呢' },
        ],
        answerId: 'g4-check-2-ma',
        explanation: '嗎 turns the complete statement into a new yes/no question.',
      },
    ],
  },
  examples: [
    {
      id: 'g4-example-1',
      number: 1,
      text: {
        traditional: 'A：我是日本人，你呢？ B：我是臺灣人。',
        simplified: 'A：我是日本人，你呢？ B：我是台湾人。',
        pinyin: 'A: Wǒ shì Rìběn rén, nǐ ne? B: Wǒ shì Táiwān rén.',
        english: 'A: I am Japanese. How about you? B: I am Taiwanese.',
        words: [
          token('g4-e1-i-a', '我', 'wǒ', 'I', { prefix: 'A：' }),
          token('g4-e1-am-a', '是', 'shì', 'am'),
          token('g4-e1-japan', '日本', 'Rìběn', 'Japan'),
          token('g4-e1-person-a', '人', 'rén', 'person', { suffix: '，' }),
          token('g4-e1-you', '你', 'nǐ', 'you'),
          token('g4-e1-ne', '呢', 'ne', 'how about; return-question particle', {
            suffix: '？',
          }),
          token('g4-e1-i-b', '我', 'wǒ', 'I', { prefix: 'B：' }),
          token('g4-e1-am-b', '是', 'shì', 'am'),
          token('g4-e1-taiwan', '臺灣', 'Táiwān', 'Taiwan', {
            simplified: '台湾',
          }),
          token('g4-e1-person-b', '人', 'rén', 'person', { suffix: '。' }),
        ],
      },
    },
    {
      id: 'g4-example-2',
      number: 2,
      text: {
        traditional: 'A：小林小姐叫友美，李先生呢？ B：他叫中明。',
        pinyin: 'A: Xiǎolín xiǎojiě jiào Yǒuměi, Lǐ xiānsheng ne? B: Tā jiào Zhōngmíng.',
        english: 'A: Miss Kobayashi is called Youmei. How about Mr. Li? B: He is called Zhongming.',
        words: [
          token('g4-e2-xiaolin', '小林', 'Xiǎolín', 'Kobayashi', {
            prefix: 'A：',
          }),
          token('g4-e2-miss', '小姐', 'xiǎojiě', 'Miss'),
          token('g4-e2-called-a', '叫', 'jiào', 'to be called'),
          token('g4-e2-youmei', '友美', 'Yǒuměi', 'Youmei', { suffix: '，' }),
          token('g4-e2-li', '李', 'Lǐ', 'surname Li'),
          token('g4-e2-mister', '先生', 'xiānsheng', 'Mr.'),
          token('g4-e2-ne', '呢', 'ne', 'how about; return-question particle', {
            suffix: '？',
          }),
          token('g4-e2-he', '他', 'tā', 'he', { prefix: 'B：' }),
          token('g4-e2-called-b', '叫', 'jiào', 'to be called'),
          token('g4-e2-zhongming', '中明', 'Zhōngmíng', 'Zhongming', {
            suffix: '。',
          }),
        ],
      },
    },
    {
      id: 'g4-example-3',
      number: 3,
      text: {
        traditional: 'A：王太太很累，王先生呢？ B：他不累。',
        simplified: 'A：王太太很累，王先生呢？ B：他不累。',
        pinyin: 'A: Wáng tàitai hěn lèi, Wáng xiānsheng ne? B: Tā bú lèi.',
        english: 'A: Mrs. Wang is tired. How about Mr. Wang? B: He is not tired.',
        words: [
          token('g4-e3-wang-a', '王', 'Wáng', 'surname Wang', {
            prefix: 'A：',
          }),
          token('g4-e3-mrs', '太太', 'tàitai', 'Mrs.'),
          token('g4-e3-very', '很', 'hěn', 'very; linking adverb'),
          token('g4-e3-tired-a', '累', 'lèi', 'tired', { suffix: '，' }),
          token('g4-e3-wang-b', '王', 'Wáng', 'surname Wang'),
          token('g4-e3-mister', '先生', 'xiānsheng', 'Mr.'),
          token('g4-e3-ne', '呢', 'ne', 'how about; return-question particle', {
            suffix: '？',
          }),
          token('g4-e3-he', '他', 'tā', 'he', { prefix: 'B：' }),
          token('g4-e3-not', '不', 'bú', 'not'),
          token('g4-e3-tired-b', '累', 'lèi', 'tired', { suffix: '。' }),
        ],
      },
    },
  ],
  exerciseTitle: 'Return the question',
  exercisePreview: 'Complete or answer the 呢 questions from pages 44–45.',
  exerciseInstruction:
    'Use the conversation before each blank. Some personal questions have more than one correct answer.',
  exerciseNote: 'Adapted from the exercise spanning printed pages 44–45.',
  exerciseCues: [
    {
      id: 'g4-cue-busy',
      label: '他 · 忙',
      pinyin: 'tā · máng',
      detail:
        'The printed picture establishes that the office worker is busy; your own reply may be positive or negative.',
    },
  ],
  questions: [
    {
      id: 'g4-question-1',
      number: 1,
      segments: [
        {
          type: 'text',
          traditional: 'A：我是美國人，',
          simplified: 'A：我是美国人，',
        },
        {
          type: 'blank',
          id: 'g4-q1-return',
          answer: '你呢',
          hint: 'Return the country question to the other speaker.',
        },
        { type: 'text', traditional: '？ B：我是印尼人。' },
      ],
      tiles: [
        { id: 'g4-q1-you-ne', traditional: '你呢' },
        { id: 'g4-q1-you-ma', traditional: '你嗎', simplified: '你吗' },
      ],
      correctFeedback: '呢 carries the understood question “Which country are you from?” over to the other speaker.',
      repairFeedback: 'The country topic is already established, so return it with 你呢—not a new 嗎 question.',
    },
    {
      id: 'g4-question-2',
      number: 2,
      segments: [
        { type: 'text', traditional: 'A：我姓李，你呢？ B：' },
        {
          type: 'blank',
          id: 'g4-q2-reply',
          answer: '我姓小林',
          acceptedAnswers: ['我姓王'],
          hint: 'Reply with 我 + 姓 + a family name.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'g4-q2-xiaolin', traditional: '我姓小林' },
        { id: 'g4-q2-wang', traditional: '我姓王' },
        { id: 'g4-q2-called', traditional: '我叫姓王' },
      ],
      correctFeedback: 'Both surname replies are valid: 呢 asks you to answer the same surname question.',
      repairFeedback: 'Answer the implied surname question with 我姓… .',
    },
    {
      id: 'g4-question-3',
      number: 3,
      segments: [
        { type: 'text', traditional: 'A：他很忙，' },
        {
          type: 'blank',
          id: 'g4-q3-return',
          answer: '你呢',
          hint: 'Ask how the other person compares.',
        },
        { type: 'text', traditional: '？ B：' },
        {
          type: 'blank',
          id: 'g4-q3-reply',
          answer: '我很忙',
          acceptedAnswers: ['我不忙'],
          hint: 'Choose either truthful state: busy or not busy.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'g4-q3-you-ne', traditional: '你呢' },
        { id: 'g4-q3-he-ne', traditional: '他呢' },
        { id: 'g4-q3-busy', traditional: '我很忙' },
        { id: 'g4-q3-not-busy', traditional: '我不忙' },
      ],
      correctFeedback: 'You returned the same state question with 呢, then gave a complete personal answer.',
      repairFeedback: 'First return the question to “you”; then answer about yourself with 我很忙 or 我不忙.',
    },
  ],
};

export const LESSON_ONE_GRAMMAR_FIVE: InteractiveGrammarPage = {
  id: 'B1L01-G05-P45',
  bookId: 1,
  lessonId: 1,
  partId: 2,
  lessonTitle: '新同學',
  lessonTitleEnglish: 'The New Classmate',
  grammarNumber: 5,
  titleTraditional: '主語 + 動詞 + 受詞',
  titleEnglish: 'Build Chinese from Left to Right',
  learnerPromise: 'Build a complete sentence by saying who, what they do, and who or what receives it.',
  printedPages: [45],
  audioReference: '01-2-3',
  explanation:
    'Build the idea from left to right: who → action or feeling → person or thing affected. This is Subject–Verb–Object.',
  focusTerms: [
    'Left to Right',
    'Subject–Verb–Object',
    'who → does what → to whom or what',
    '不',
    '喜歡',
    '喜欢',
    '愛',
    '爱',
  ],
  teachingGlossary: [
    token('g5-glossary-bu', '不', 'bù', 'not; placed directly before the action or feeling verb'),
    token('g5-glossary-xihuan', '喜歡', 'xǐhuān', 'to like; the feeling verb in this sentence pattern', {
      simplified: '喜欢',
    }),
    token('g5-glossary-ai', '愛', 'ài', 'to love; an action or feeling verb', {
      simplified: '爱',
    }),
    token('g5-glossary-shi', '是', 'shì', 'identity-linking “to be”; do not insert it before an action verb'),
    token('g5-glossary-wo', '我', 'wǒ', 'I; the subject doing or feeling the action'),
  ],
  pattern: 'S + (Neg)V + O',
  patternColumns: ['Who', 'Does / feels', 'Who or what'],
  patternColumnDetails: ['S', '(Neg)V', 'O'],
  discoveryLab: {
    title: 'Let the sentence grow one meaning block at a time',
    description:
      'Chinese listeners build the message in the same order that they hear it. Each step answers one more question.',
    prompt: 'How complete is the message?',
    choices: [
      {
        id: 'g5-discover-who',
        label: '1 · Who?',
        traditional: '我⋯',
        simplified: '我⋯',
        pinyin: 'Wǒ…',
        english: 'I…',
        note: 'The listener knows who the sentence is about, but still waits for the action or feeling.',
      },
      {
        id: 'g5-discover-feeling',
        label: '2 · Does what?',
        traditional: '我喜歡⋯',
        simplified: '我喜欢⋯',
        pinyin: 'Wǒ xǐhuān…',
        english: 'I like…',
        note: 'Now the feeling is clear. The listener still needs to know who or what is liked.',
      },
      {
        id: 'g5-discover-target',
        label: '3 · What?',
        traditional: '我喜歡臺灣。',
        simplified: '我喜欢台湾。',
        pinyin: 'Wǒ xǐhuān Táiwān.',
        english: 'I like Taiwan.',
        note: 'The target 臺灣 completes the thought: who → feeling → what is liked.',
      },
      {
        id: 'g5-discover-repair',
        label: 'Repair · no 是',
        traditional: '我是喜歡臺灣。 → 我喜歡臺灣。',
        simplified: '我是喜欢台湾。 → 我喜欢台湾。',
        pinyin: 'Wǒ shì xǐhuān Táiwān. → Wǒ xǐhuān Táiwān.',
        english: 'Repair it: I like Taiwan.',
        note: '喜歡 is already the feeling verb. Do not insert 是 before it in this beginner sentence pattern.',
        isCorrection: true,
      },
    ],
    takeaway:
      'Build the meaning train in order: who → action or feeling → target. Put 不 directly before the action or feeling when the meaning is negative.',
  },
  sentenceSpine: {
    title: 'Now switch the meaning without rebuilding the sentence',
    description: 'Keep the three slots in place and attach 不 directly to the feeling verb.',
    subject: {
      role: 'S',
      label: 'Who',
      traditional: '我',
      pinyin: 'wǒ',
      english: 'I',
    },
    verb: {
      role: '(Neg)V',
      label: 'Does / feels',
      traditional: '喜歡',
      simplified: '喜欢',
      pinyin: 'xǐhuān',
      english: 'like',
    },
    object: {
      role: 'O',
      label: 'Who or what',
      traditional: '他。',
      pinyin: 'tā',
      english: 'him',
    },
    negation: {
      label: 'Negative',
      traditional: '不',
      pinyin: 'bù',
    },
    positiveEnglish: 'I like him.',
    negativeEnglish: "I don't like him.",
    notes: ['不 stays directly before the verb: 不喜歡.', 'Action verbs such as 喜歡 and 愛 do not need 是.'],
  },
  patternRows: [
    {
      id: 'g5-pattern-1',
      subject: [token('g5-p1-i', '我', 'wǒ', 'I')],
      grammar: [
        token('g5-p1-not', '（不）', '(bù)', '(not)'),
        token('g5-p1-like', '喜歡', 'xǐhuān', 'to like', {
          simplified: '喜欢',
        }),
      ],
      complement: [token('g5-p1-him', '他', 'tā', 'him', { suffix: '。' })],
      english: "I (don't) like him.",
    },
  ],
  examples: [
    {
      id: 'g5-example-1',
      number: 1,
      teachingNote: '我 continues after the comma.',
      text: {
        traditional: '我喜歡李小姐，不喜歡王小姐。',
        simplified: '我喜欢李小姐，不喜欢王小姐。',
        pinyin: 'Wǒ xǐhuān Lǐ xiǎojiě, bù xǐhuān Wáng xiǎojiě.',
        english: 'I like Miss Li, but I do not like Miss Wang.',
        words: [
          token('g5-e1-i', '我', 'wǒ', 'I'),
          token('g5-e1-like-a', '喜歡', 'xǐhuān', 'to like', {
            simplified: '喜欢',
          }),
          token('g5-e1-li', '李', 'Lǐ', 'surname Li'),
          token('g5-e1-miss-a', '小姐', 'xiǎojiě', 'Miss', { suffix: '，' }),
          token('g5-e1-not', '不', 'bù', 'not'),
          token('g5-e1-like-b', '喜歡', 'xǐhuān', 'to like', {
            simplified: '喜欢',
          }),
          token('g5-e1-wang', '王', 'Wáng', 'surname Wang'),
          token('g5-e1-miss-b', '小姐', 'xiǎojiě', 'Miss', { suffix: '。' }),
        ],
      },
    },
    {
      id: 'g5-example-2',
      number: 2,
      teachingNote: '什麼 fills the object slot.',
      text: {
        traditional: '你喜歡什麼？',
        simplified: '你喜欢什么？',
        pinyin: 'Nǐ xǐhuān shénme?',
        english: 'What do you like?',
        words: [
          token('g5-e2-you', '你', 'nǐ', 'you'),
          token('g5-e2-like', '喜歡', 'xǐhuān', 'to like', {
            simplified: '喜欢',
          }),
          token('g5-e2-what', '什麼', 'shénme', 'what', {
            simplified: '什么',
            suffix: '？',
          }),
        ],
      },
    },
    {
      id: 'g5-example-3',
      number: 3,
      teachingNote: 'One verb can have two objects.',
      text: {
        traditional: '我愛爸爸、媽媽。',
        simplified: '我爱爸爸、妈妈。',
        pinyin: 'Wǒ ài bàba, māma.',
        english: 'I love Dad and Mom.',
        words: [
          token('g5-e3-i', '我', 'wǒ', 'I'),
          token('g5-e3-love', '愛', 'ài', 'to love', { simplified: '爱' }),
          token('g5-e3-dad', '爸爸', 'bàba', 'dad', { suffix: '、' }),
          token('g5-e3-mom', '媽媽', 'māma', 'mom', {
            simplified: '妈妈',
            suffix: '。',
          }),
        ],
      },
    },
  ],
  exerciseTitle: 'Build meaning in order',
  exercisePreview: 'Build the S–V–O pattern, then answer the book questions.',
  exerciseInstruction:
    'Place compact tiles into the sentence slots. Personal questions may have more than one correct response.',
  exerciseNote: 'Questions 3–5 adapt the exercise on printed page 45.',
  completionRecap: {
    title: 'Keep the sentence spine',
    correct: {
      traditional: '我不喜歡王小姐。',
      simplified: '我不喜欢王小姐。',
      explanation: 'Who → 不 + feeling → target.',
    },
    avoid: [
      {
        traditional: '我是喜歡王小姐。',
        simplified: '我是喜欢王小姐。',
        explanation: 'Do not insert 是 before an action or feeling verb.',
      },
      {
        traditional: '我喜歡不王小姐。',
        simplified: '我喜欢不王小姐。',
        explanation: '不 belongs immediately before the verb, not the object.',
      },
    ],
  },
  exerciseCues: [
    {
      id: 'g5-cue-couple',
      label: '王先生 · 王太太',
      pinyin: 'Wáng xiānsheng · Wáng tàitai',
      detail: 'The printed thought illustration presents Mrs. Wang as the person Mr. Wang loves.',
    },
  ],
  questions: [
    {
      id: 'g5-question-1',
      number: 1,
      sectionLabel: 'Round 1 · Build the structure',
      segments: [
        {
          type: 'blank',
          id: 'g5-q1-subject',
          answer: '我',
          hint: 'Start with who.',
        },
        {
          type: 'blank',
          id: 'g5-q1-verb',
          answer: '喜歡',
          answerSimplified: '喜欢',
          hint: 'Put the feeling/action second.',
        },
        {
          type: 'blank',
          id: 'g5-q1-object',
          answer: '臺灣',
          answerSimplified: '台湾',
          hint: 'End with what is liked.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'g5-q1-taiwan', traditional: '臺灣', simplified: '台湾' },
        { id: 'g5-q1-i', traditional: '我' },
        { id: 'g5-q1-like', traditional: '喜歡', simplified: '喜欢' },
      ],
      correctFeedback: 'Who → feeling → what: 我 + 喜歡 + 臺灣.',
      repairFeedback: 'Use the three meaning slots in order: who, does/feels, who or what.',
    },
    {
      id: 'g5-question-2',
      number: 2,
      segments: [
        {
          type: 'blank',
          id: 'g5-q2-subject',
          answer: '我',
          hint: 'Start with who.',
        },
        {
          type: 'blank',
          id: 'g5-q2-negation',
          answer: '不',
          hint: 'Place negation directly before the verb.',
        },
        {
          type: 'blank',
          id: 'g5-q2-verb',
          answer: '喜歡',
          answerSimplified: '喜欢',
          hint: 'The feeling verb follows 不.',
        },
        {
          type: 'blank',
          id: 'g5-q2-object',
          answer: '王小姐',
          hint: 'End with the person receiving the feeling.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        { id: 'g5-q2-object-tile', traditional: '王小姐' },
        { id: 'g5-q2-not', traditional: '不' },
        { id: 'g5-q2-like', traditional: '喜歡', simplified: '喜欢' },
        { id: 'g5-q2-subject-tile', traditional: '我' },
      ],
      correctFeedback: '不 stays attached to 喜歡 in the verb slot: 我 + 不喜歡 + 王小姐.',
      repairFeedback: 'Keep 不 immediately before 喜歡, after the subject and before the object.',
    },
    {
      id: 'g5-question-3',
      number: 3,
      sectionLabel: 'Round 2 · Answer with meaning',
      segments: [
        {
          type: 'text',
          traditional: 'A：你喜歡臺灣嗎？ B：',
          simplified: 'A：你喜欢台湾吗？ B：',
        },
        {
          type: 'blank',
          id: 'g5-q3-reply',
          answer: '我喜歡臺灣',
          answerSimplified: '我喜欢台湾',
          acceptedAnswers: ['我不喜歡臺灣'],
          acceptedAnswersSimplified: ['我不喜欢台湾'],
          hint: 'Choose a complete S–V–O answer that matches your opinion.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        {
          id: 'g5-q3-positive',
          traditional: '我喜歡臺灣',
          simplified: '我喜欢台湾',
        },
        {
          id: 'g5-q3-negative',
          traditional: '我不喜歡臺灣',
          simplified: '我不喜欢台湾',
        },
        {
          id: 'g5-q3-missing-subject',
          traditional: '喜歡臺灣',
          simplified: '喜欢台湾',
        },
      ],
      correctFeedback:
        'Your opinion can be positive or negative; both answers preserve the complete sentence structure.',
      repairFeedback: 'Give a complete answer with subject 我, then 喜歡 or 不喜歡, then object 臺灣.',
    },
    {
      id: 'g5-question-4',
      number: 4,
      segments: [
        {
          type: 'text',
          traditional: 'A：你喜歡誰？ B：',
          simplified: 'A：你喜欢谁？ B：',
        },
        {
          type: 'blank',
          id: 'g5-q4-reply',
          answer: '我喜歡友美',
          answerSimplified: '我喜欢友美',
          acceptedAnswers: ['我喜歡中明', '我喜歡爸爸、媽媽'],
          acceptedAnswersSimplified: ['我喜欢中明', '我喜欢爸爸、妈妈'],
          hint: 'Choose any complete S–V–O reply.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        {
          id: 'g5-q4-youmei',
          traditional: '我喜歡友美',
          simplified: '我喜欢友美',
        },
        {
          id: 'g5-q4-zhongming',
          traditional: '我喜歡中明',
          simplified: '我喜欢中明',
        },
        {
          id: 'g5-q4-parents',
          traditional: '我喜歡爸爸、媽媽',
          simplified: '我喜欢爸爸、妈妈',
        },
      ],
      correctFeedback: '誰 asks for a person as the object; each choice gives a complete answer.',
      repairFeedback: 'Answer 誰 with a person after 我喜歡.',
    },
    {
      id: 'g5-question-5',
      number: 5,
      segments: [
        {
          type: 'text',
          traditional: 'A：王先生愛王太太嗎？ B：',
          simplified: 'A：王先生爱王太太吗？ B：',
        },
        {
          type: 'blank',
          id: 'g5-q5-reply',
          answer: '他愛王太太',
          answerSimplified: '他爱王太太',
          hint: 'Use the positive relationship shown in the source illustration.',
        },
        { type: 'text', traditional: '。' },
      ],
      tiles: [
        {
          id: 'g5-q5-positive',
          traditional: '他愛王太太',
          simplified: '他爱王太太',
        },
        {
          id: 'g5-q5-negative',
          traditional: '他不愛王太太',
          simplified: '他不爱王太太',
        },
        {
          id: 'g5-q5-wrong-subject',
          traditional: '王太太愛他',
          simplified: '王太太爱他',
        },
      ],
      correctFeedback: 'The illustration supports the positive S–V–O answer: 他 + 愛 + 王太太.',
      repairFeedback: 'Keep Mr. Wang as 他, use positive 愛, and place 王太太 as the object.',
    },
  ],
};

export const LESSON_ONE_PART_TWO: InteractiveGrammarPart = {
  id: 'B1L01-P02-D02',
  bookId: 1,
  lessonId: 1,
  partId: 2,
  title: 'Grammar 4–5 · Pages 44–45',
  grammarPages: [LESSON_ONE_GRAMMAR_FOUR, LESSON_ONE_GRAMMAR_FIVE],
  dialogue: {
    id: 'B1L01-D02',
    title: '對話二 · Dialogue 2',
    setting: '在教室 · In the classroom',
    printedPages: [41, 42],
    audioReference: '01-2-1',
    grammarFocus: ['呢', '喜歡', '愛', '不'],
    lines: [
      {
        id: 'd2-l1',
        speaker: '中明',
        text: {
          traditional: '妳好！我是李中明，請問妳叫什麼名字？',
          simplified: '妳好！我是李中明，请问妳叫什么名字？',
          pinyin: 'Nǐ hǎo! Wǒ shì Lǐ Zhōngmíng, qǐngwèn nǐ jiào shénme míngzi?',
          english: 'Hi, my name is Li Zhongming. May I ask what your name is?',
        },
      },
      {
        id: 'd2-l2',
        speaker: '友美',
        text: {
          traditional: '我姓小林，叫友美。',
          pinyin: 'Wǒ xìng Xiǎolín, jiào Yǒuměi.',
          english: 'My surname is Xiaolin. My first name is Youmei.',
        },
      },
      {
        id: 'd2-l3',
        speaker: '中明',
        text: {
          traditional: '請問妳是哪國人？',
          simplified: '请问妳是哪国人？',
          pinyin: 'Qǐngwèn nǐ shì nǎ guó rén?',
          english: 'May I ask where you are from?',
        },
      },
      {
        id: 'd2-l4',
        speaker: '友美',
        text: {
          traditional: '我是日本人，你呢？',
          pinyin: 'Wǒ shì Rìběn rén, nǐ ne?',
          english: 'I am from Japan. How about you?',
        },
      },
      {
        id: 'd2-l5',
        speaker: '中明',
        text: {
          traditional: '我是印尼人。妳喜歡台灣嗎？',
          simplified: '我是印尼人。妳喜欢台湾吗？',
          pinyin: 'Wǒ shì Yìnní rén. Nǐ xǐhuān Táiwān ma?',
          english: 'I am from Indonesia. Do you like Taiwan?',
        },
      },
      {
        id: 'd2-l6',
        speaker: '友美',
        text: {
          traditional: '我喜歡台灣。',
          simplified: '我喜欢台湾。',
          pinyin: 'Wǒ xǐhuān Táiwān.',
          english: 'I like Taiwan.',
        },
      },
    ],
    comprehension: {
      prompt: '友美喜歡台灣嗎？',
      options: ['她喜歡台灣', '她不喜歡台灣', '她不知道'],
      answer: '她喜歡台灣',
      hint: 'Look at Youmei’s final reply.',
    },
  },
  completionTitle: 'Part 2 complete — you can return a question and share what you like.',
  completionDescription:
    'You used 呢 to keep a conversation moving and built positive and negative subject–verb–object sentences with 喜歡 and 愛.',
  nextBookLabel: 'Next in the book · Review the lesson patterns.',
};
