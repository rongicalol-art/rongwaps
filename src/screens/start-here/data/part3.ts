import type { StartHereLesson } from './types';

export const PART_3_LESSONS: StartHereLesson[] = [
  {
    id: 10, partId: 3, title: 'Tongue forward: z, c, s', minutes: 4,
    goal: 'Say z, c and s, and hear the special i that follows them.',
    screens: [
      {
        k: 'mouth', title: 'Keep your tongue forward', sounds: ['s', 'z', 'c'], first: 's',
        talk: ['[[m:s|s]] Start with the "s" you know.',
          '[[m:z|z]] Add a quick "t" before it, like in "cats".',
          '[[m:c|c]] Same place, but let out a strong *puff* of air.'],
      },
      {
        k: 'pairs', title: 'Feel the puff', headers: ['Little air', 'Strong puff'],
        talk: ['Hold your hand in front of your mouth as you repeat.'],
        rows: [
          { label: 'ai', cells: [{ text: 'zài', audio: 'zai4', sub: 'at' }, { text: 'cài', audio: 'cai4', sub: 'dish' }] },
          { label: 'i', cells: [{ text: 'zì', audio: 'zi4', sub: 'character' }, { text: 'cì', audio: 'ci4', sub: 'occasion' }] },
        ],
      },
      {
        k: 'word', title: 'This i sounds different', audio: 'si4', pinyin: 'sì', hanzi: '四', meaning: 'four',
        talk: ['After these three initials, the letter "i" sounds different.',
          'Keep your tongue where it is and add your voice. [[si4|sì]]',
          'Now hear the "ee" in this word. [[w:ni|nǐ]]'],
      },
      {
        k: 'question', title: 'Which initial do you hear?', audio: ['ci4'], contrast: ['zi4', 'ci4'],
        layout: 'two', isPinyinChoices: true, choices: [{ label: 'z', correct: false }, { label: 'c', correct: true }],
        feedback: { hanzi: '次', pinyin: 'cì', meaning: 'occasion. The initial has a strong puff.' },
      },
      {
        k: 'question', title: 'Which word ends with the “ee” sound?', audio: ['si4', 'w:ni'], layout: 'two',
        isPinyinChoices: true, choices: [{ label: 'sì', correct: false }, { label: 'nǐ', correct: true }],
        feedback: { hanzi: '你', pinyin: 'nǐ', meaning: 'you. Here i sounds like “ee”.' },
      },
      {
        k: 'chart', title: 'Three tongue-forward rows', talk: ['Tap a box and say the sound back.'],
        rows: ['z', 'c', 's'], cols: ['a', 'e', 'i', 'u', 'ai', 'ao', 'an', 'ang'], fresh: ['z', 'c', 's'],
      },
    ],
  },
  {
    id: 11, partId: 3, title: 'Tongue tip up: zh, ch, sh, r', minutes: 5,
    goal: 'Say zh, ch, sh and r, and know each is one initial.',
    screens: [
      {
        k: 'mouth', title: 'Lift the tip a little', sounds: ['s', 'sh'], first: 's',
        talk: ['[[m:s|s]] Start with your tongue forward.',
          '[[m:sh|sh]] Pull the tip back a little and lift it.',
          'A small lift is enough. Try both sounds yourself.'],
      },
      {
        k: 'mouth', title: 'Same place, different air', sounds: ['zh', 'ch', 'sh', 'r'], first: 'zh',
        talk: ['[[m:zh|zh]] Touch, then release with very little air.',
          '[[m:ch|ch]] Same place, with a stronger puff.',
          '[[m:r|r]] Add your voice and keep the sound smooth.'],
      },
      {
        k: 'tiles', title: 'Hear the initials in words',
        talk: ['Two letters can spell a single initial. [[zhe4|zhè]] [[cha2|chá]] [[shu1|shū]]',
          'The special "i" is back. Keep your tongue in place. [[zhi1|zhī]] [[chi1|chī]] [[w:shi|shì]] [[ri4|rì]]'],
        items: [
          { pinyin: 'zhè', hanzi: '這', meaning: 'this', audio: 'zhe4' },
          { pinyin: 'chá', hanzi: '茶', meaning: 'tea', audio: 'cha2' },
          { pinyin: 'shū', hanzi: '書', meaning: 'book', audio: 'shu1' },
          { pinyin: 'rén', hanzi: '人', meaning: 'person', audio: 'w:ren' },
        ],
      },
      {
        k: 'build', title: 'Build shì', target: ['sh', 'i', 4], audio: 'w:shi',
        inis: ['s', 'sh', 'ch'], fins: ['i', 'u'], tones: [1, 2, 4], doneText: 'shì, to be',
      },
      {
        k: 'question', title: 'Which initial do you hear?', audio: ['zhi1'], contrast: ['chi1', 'zhi1'],
        layout: 'two', isPinyinChoices: true, choices: [{ label: 'zh', correct: true }, { label: 'ch', correct: false }],
        feedback: { hanzi: '知', pinyin: 'zhī', meaning: 'to know. The initial has very little air.' },
      },
      {
        k: 'question', title: 'Which initial do you hear?', audio: ['w:shi'], contrast: ['si4', 'w:shi'],
        layout: 'two', isPinyinChoices: true, choices: [{ label: 's', correct: false }, { label: 'sh', correct: true }],
        feedback: { hanzi: '是', pinyin: 'shì', meaning: 'to be. The tongue tip is lifted back.' },
      },
      {
        k: 'chart', title: 'Four tongue-tip-up rows', talk: ['Find a box and listen for its starting sound.'],
        rows: ['zh', 'ch', 'sh', 'r'], cols: ['a', 'e', 'i', 'u', 'ai', 'ao', 'en', 'eng'], fresh: ['zh', 'ch', 'sh', 'r'],
      },
    ],
  },
  {
    id: 12,
    partId: 3,
    title: 'Tongue tip down, and smile: j, q, x',
    goal: 'Say j, q and x, and know that u after them is really ü.',
    minutes: 5,
    screens: [
      {
        k: 'word',
        title: 'A new sound',
        pinyin: 'xī',
        hanzi: '西',
        meaning: 'west',
        talk: [ 'A new sound.| Close to "sh",| but made in a different place.' ],
        audio: 'xi1'
      },
      {
        k: 'mouth',
        title: 'Tongue tip down, and smile',
        talk: [
          'Keep the *tip*^tipdown of your tongue down,| behind your bottom teeth.',
          'Lift the *middle*^mid of your tongue,| and smile. [[m:x|xī]]',
          'Now this one. [[m:sh|shī]] *Here*^tipup,| the tip goes up.'
        ],
        sounds: [ 'sh', 'x' ],
        first: 'x'
      },
      {
        k: 'mouthQuiz',
        title: '',
        ask: 'Where is the tongue tip for x?',
        options: [
          {
            label: 'Forward, near the top teeth',
            sound: 's',
            say: 'That makes s. For x the tip stays down.'
          },
          {
            label: 'Lifted, a little further back',
            sound: 'sh',
            say: 'That makes sh. For x the tip stays down.'
          },
          {
            label: 'Down, behind the bottom teeth',
            sound: 'x',
            right: true,
            say: 'Yes. Tip down, and smile.'
          }
        ]
      },
      {
        k: 'mouth',
        title: 'j and q are made in the same place',
        talk: [
          'Same place for both. [[m:j|j]] [[m:q|q]]',
          'The first has no air.| The second has a strong *puff*.'
        ],
        sounds: [ 'j', 'q', 'x' ],
        first: 'j'
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'qi1' ],
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'jī', correct: false },
          { label: 'qī', correct: true },
          { label: 'xī', correct: false }
        ],
        feedback: { hanzi: '七', pinyin: 'qī', meaning: 'seven' }
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'ji1' ],
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'jī', correct: true },
          { label: 'qī', correct: false },
          { label: 'xī', correct: false }
        ],
        feedback: { hanzi: '雞', pinyin: 'jī', meaning: 'chicken' }
      },
      {
        k: 'join',
        title: 'After j, q, x the u is really ü',
        left: 'q',
        right: 'ü',
        result: 'qù',
        droppedDots: true,
        caption: 'qù, to go',
        talk: [
          'After these three,| this letter is really the one with two dots.',
          "The dots just aren't written."
        ],
        audio: 'qu4'
      },
      {
        k: 'question',
        title: 'Which final is inside qù?',
        audio: [ 'qu4' ],
        prompt: { pinyin: 'qù' },
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'u', correct: false }, { label: 'ü', correct: true } ],
        feedback: { hanzi: '去', pinyin: 'qù', meaning: 'to go' }
      },
      {
        k: 'chart',
        title: 'Three new rows on your chart',
        talk: [ "Three new rows.| That's all twenty-one starting sounds." ],
        rows: [ 'j', 'q', 'x' ],
        cols: [ 'i', 'ü' ],
        fresh: [ 'j', 'q', 'x' ],
        spellOverrides: { 'jü': 'ju', 'qü': 'qu', 'xü': 'xu' }
      },
    ],
  },
  {
    id: 13, partId: 3, title: 'Tell them apart', minutes: 5,
    goal: 'Hear which of the three new families a sound belongs to.',
    screens: [
      {
        k: 'mouth', title: 'Three places for the tongue', sounds: ['s', 'sh', 'x'], first: 's',
        talk: ['[[m:s|s]] Tongue forward, near the top teeth.',
          '[[m:sh|sh]] Tip lifted a little farther back.',
          '[[m:x|x]] Tip behind the bottom teeth. Lift the middle and smile.'],
      },
      {
        k: 'pairs', title: 'Listen across each row', headers: ['z, c, s', 'zh, ch, sh', 'j, q, x'],
        talk: ['Listen across each row. Hear "ee" in the last sound.'],
        rows: [
          { label: 'Steady air', cells: [{ text: 'sī', audio: 'si1' }, { text: 'shī', audio: 'shi1' }, { text: 'xī', audio: 'xi1' }] },
          { label: 'Little air', cells: [{ text: 'zì', audio: 'zi4' }, { text: 'zhì', audio: 'zhi4' }, { text: 'jì', audio: 'ji4' }] },
          { label: 'Strong puff', cells: [{ text: 'cì', audio: 'ci4' }, { text: 'chì', audio: 'chi4' }, { text: 'qì', audio: 'qi4' }] },
        ],
      },
      {
        k: 'question', title: 'Which one do you hear?', audio: ['xi1'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'sī', correct: false }, { label: 'shī', correct: false }, { label: 'xī', correct: true }],
        feedback: { hanzi: '西', pinyin: 'xī', meaning: 'west. The tongue tip stays down.' },
      },
      {
        k: 'question', title: 'Which one do you hear?', audio: ['zhi4'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'zì', correct: false }, { label: 'zhì', correct: true }, { label: 'jì', correct: false }],
        feedback: { hanzi: '至', pinyin: 'zhì', meaning: 'to arrive. The tongue tip lifts back.' },
      },
      {
        k: 'question', title: 'Which one do you hear?', audio: ['ci4'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'cì', correct: true }, { label: 'chì', correct: false }, { label: 'qì', correct: false }],
        feedback: { hanzi: '次', pinyin: 'cì', meaning: 'occasion. The tongue stays forward.' },
      },
      {
        k: 'sort', title: 'Listen and sort by initial family', mode: 'audio',
        bins: [{ label: 'z, c, s' }, { label: 'zh, ch, sh' }, { label: 'j, q, x' }],
        items: [
          { label: 'zì', reveal: 'zì', audio: 'zi4', bin: 0 },
          { label: 'xī', reveal: 'xī', audio: 'xi1', bin: 2 },
          { label: 'chì', reveal: 'chì', audio: 'chi4', bin: 1 },
          { label: 'sī', reveal: 'sī', audio: 'si1', bin: 0 },
          { label: 'zhì', reveal: 'zhì', audio: 'zhi4', bin: 1 },
          { label: 'qì', reveal: 'qì', audio: 'qi4', bin: 2 },
          { label: 'shī', reveal: 'shī', audio: 'shi1', bin: 1 },
          { label: 'cì', reveal: 'cì', audio: 'ci4', bin: 0 },
          { label: 'jì', reveal: 'jì', audio: 'ji4', bin: 2 },
        ],
        doneText: 'Tongue forward, tip lifted back, or tip down and smiling.',
      },
      {
        k: 'question', title: 'Which one do you hear?', audio: ['ji4'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'zì', correct: false }, { label: 'zhì', correct: false }, { label: 'jì', correct: true }],
        feedback: { hanzi: '記', pinyin: 'jì', meaning: 'to remember. This initial goes with the “ee” sound.' },
      },
      {
        k: 'question', title: 'Which one do you hear?', audio: ['shi1'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'sī', correct: false }, { label: 'shī', correct: true }, { label: 'xī', correct: false }],
        feedback: { hanzi: '師', pinyin: 'shī', meaning: 'teacher. The tongue tip lifts back.' },
      },
      {
        k: 'question', title: 'Which one do you hear?', audio: ['zi4'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'zì', correct: true }, { label: 'zhì', correct: false }, { label: 'jì', correct: false }],
        feedback: { hanzi: '字', pinyin: 'zì', meaning: 'character. The tongue tip stays forward.' },
      },
    ],
  },
];
