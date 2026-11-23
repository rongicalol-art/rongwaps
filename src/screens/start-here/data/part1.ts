import type { StartHereLesson } from './types';

export const PART_1_LESSONS: StartHereLesson[] = [
  {
    id: 1,
    partId: 1,
    title: 'Hear it, then read it',
    goal: 'Say a first word and name the three pieces of a syllable.',
    minutes: 4,
    screens: [
      {
        k: 'word',
        title: 'Your first word',
        pinyin: 'nǐ',
        hanzi: '你',
        meaning: 'you',
        talk: [ "That's your first word.| It means *you*." ],
        audio: 'w:ni'
      },
      {
        k: 'word',
        title: 'This is a character',
        pinyin: 'nǐ',
        hanzi: '你',
        meaning: 'you',
        spotlight: 'zh',
        talk: [ 'Each *character* is one beat of sound.' ],
        audio: 'w:ni'
      },
      {
        k: 'word',
        title: 'This is pinyin',
        pinyin: 'nǐ',
        hanzi: '你',
        meaning: 'you',
        spotlight: 'py',
        talk: [
          '*Pinyin* spells that sound in letters.',
          'So you can read a word| before you know its character.'
        ],
        audio: 'w:ni'
      },
      {
        k: 'pieces',
        title: 'The three pieces of a syllable',
        initial: 'n',
        final: 'i',
        tone: 3,
        audio: 'w:ni',
        noAuto: true,
        lines: [
          'Tap each piece.',
          'The initial is the sound it starts with.',
          'The final is the rest of the sound.',
          'The tone mark shows how your voice moves.'
        ]
      },
      {
        k: 'build',
        title: 'Build nǐ',
        audio: 'w:ni',
        target: [ 'n', 'i', 3 ],
        inis: [ 't', 'n', 'm' ],
        fins: [ 'a', 'i' ],
        tones: [ 1, 3 ],
        doneText: 'nǐ, you'
      },
      {
        k: 'word',
        title: 'A new word, the same three pieces',
        pinyin: 'tā',
        hanzi: '他',
        meaning: 'he',
        spotlight: 'py',
        talk: [
          'This is a new word.| It means *he*.',
          'Same three pieces.| The flat line means a high, flat voice.'
        ],
        audio: 'ta1'
      },
      { k: 'split', title: 'Find the pieces', initial: 't', final: 'a', tone: 1, audio: 'ta1' },
      { k: 'split', title: 'One more: mā', initial: 'm', final: 'a', tone: 1, audio: 'ma1' },
      {
        k: 'question',
        title: 'What does the mark on top tell you?',
        audio: [ 'ta1' ],
        prompt: { pinyin: 'tā' },
        noAuto: true,
        choices: [
          { label: 'How your voice moves', correct: true },
          { label: 'How loud to say it', correct: false },
          { label: 'Where the word ends', correct: false }
        ],
        feedback: { pinyin: 'tā', meaning: 'the flat line means a high, flat voice' }
      },
    ],
  },
  {
    id: 2,
    partId: 1,
    title: 'High and falling: tones 1 and 4',
    goal: 'Hear and say tone 1 and tone 4.',
    minutes: 4,
    screens: [
      {
        k: 'tiles',
        title: 'Same letters, different tune',
        items: [
          { pinyin: 'bā', meaning: 'eight', audio: 'ba1', tone: 1 },
          { pinyin: 'bà', meaning: 'dad', audio: 'ba4', tone: 4 }
        ],
        autoPlayAll: true,
        talk: [
          'Same letters,| but a different tune.',
          'That tune is a *tone*.| A new tone makes a new word.'
        ]
      },
      {
        k: 'toneIntro',
        title: 'Tone 1 is high and flat',
        tone: 1,
        pinyin: 'bā',
        meaning: 'eight',
        talk: [ 'Tone one is *high*,| and flat.', 'Start high,| and hold it,| like singing one note.' ],
        audio: 'ba1'
      },
      {
        k: 'trace',
        title: 'Trace it while you say bā',
        tone: 1,
        audio: 'ba1',
        doneText: 'High and flat'
      },
      {
        k: 'toneIntro',
        title: 'Tone 4 falls',
        tone: 4,
        pinyin: 'bà',
        meaning: 'dad',
        talk: [ 'Tone four *falls*.', 'Start high,| and drop fast,| like a firm "No!"' ],
        audio: 'ba4'
      },
      {
        k: 'trace',
        title: 'Trace it while you say bà',
        tone: 4,
        audio: 'ba4',
        doneText: 'High, then straight down'
      },
      {
        k: 'markCompare',
        title: 'The mark is a small picture of the tune',
        tones: [ 1, 4 ],
        talk: [ 'The mark is a picture of the tune.', 'Flat for tone one.| Going down for tone four.' ]
      },
      {
        k: 'question',
        title: 'High or falling?',
        audio: [ 'da1' ],
        contrast: [ 'da4', 'da1' ],
        choices: [ { label: 'High', tone: 1, correct: true }, { label: 'Falling', tone: 4, correct: false } ],
        feedback: { hanzi: '搭', pinyin: 'dā', meaning: 'to take (a ride)' }
      },
      {
        k: 'question',
        title: 'High or falling?',
        audio: [ 'da4' ],
        contrast: [ 'da1', 'da4' ],
        choices: [ { label: 'High', tone: 1, correct: false }, { label: 'Falling', tone: 4, correct: true } ],
        feedback: { hanzi: '大', pinyin: 'dà', meaning: 'big' }
      },
      {
        k: 'question',
        title: 'High or falling?',
        audio: [ 'la4' ],
        contrast: [ 'la1', 'la4' ],
        choices: [ { label: 'High', tone: 1, correct: false }, { label: 'Falling', tone: 4, correct: true } ],
        feedback: { hanzi: '辣', pinyin: 'là', meaning: 'spicy' }
      },
      {
        k: 'question',
        title: 'High or falling?',
        audio: [ 'ma1' ],
        contrast: [ 'ma4', 'ma1' ],
        choices: [ { label: 'High', tone: 1, correct: true }, { label: 'Falling', tone: 4, correct: false } ],
        feedback: { hanzi: '媽', pinyin: 'mā', meaning: 'mom' }
      },
    ],
  },
  {
    id: 3,
    partId: 1,
    title: 'Rising and low: tones 2 and 3',
    goal: 'Tell tone 2 from tone 3, and read all four tone marks.',
    minutes: 5,
    screens: [
      {
        k: 'toneIntro',
        title: 'Tone 2 rises',
        tone: 2,
        pinyin: 'má',
        meaning: 'hemp',
        hanzi: '麻',
        talk: [ 'Tone two *rises*.', 'Start in the middle,| and go up,| like asking "What?"' ],
        audio: 'ma2'
      },
      {
        k: 'trace',
        title: 'Trace it while you say má',
        tone: 2,
        audio: 'ma2',
        doneText: 'From the middle, up'
      },
      {
        k: 'toneIntro',
        title: 'Tone 3 is the low tone',
        tone: 3,
        pinyin: 'mǎ',
        meaning: 'horse',
        hanzi: '馬',
        talk: [
          'Tone three is the *low* tone.',
          'Take your voice down low,| and stay there.',
          'It may rise a bit at the end.| In speech,| it stays low.'
        ],
        audio: 'w:ma'
      },
      {
        k: 'trace',
        title: 'Trace it while you say mǎ',
        tone: 3,
        audio: 'w:ma',
        doneText: 'Low, and stay low'
      },
      {
        k: 'tiles',
        title: 'One sound, four words',
        items: [
          { pinyin: 'mā', meaning: 'mom', audio: 'ma1', tone: 1 },
          { pinyin: 'má', meaning: 'hemp', audio: 'ma2', tone: 2 },
          { pinyin: 'mǎ', meaning: 'horse', audio: 'ma3', tone: 3 },
          { pinyin: 'mà', meaning: 'to scold', audio: 'ma4', tone: 4 }
        ],
        autoPlayAll: true,
        talk: [ 'One sound,| four different words.| Tap each one.' ]
      },
      {
        k: 'question',
        title: 'Rising or low?',
        audio: [ 'ni2' ],
        contrast: [ 'ni3', 'ni2' ],
        choices: [ { label: 'Rising', tone: 2, correct: true }, { label: 'Low', tone: 3, correct: false } ],
        feedback: { hanzi: '泥', pinyin: 'ní', meaning: 'mud' }
      },
      {
        k: 'question',
        title: 'Rising or low?',
        audio: [ 'yu3' ],
        contrast: [ 'yu2', 'yu3' ],
        choices: [ { label: 'Rising', tone: 2, correct: false }, { label: 'Low', tone: 3, correct: true } ],
        feedback: { hanzi: '雨', pinyin: 'yǔ', meaning: 'rain' }
      },
      {
        k: 'question',
        title: 'Rising or low?',
        audio: [ 'wu2' ],
        contrast: [ 'wu3', 'wu2' ],
        choices: [ { label: 'Rising', tone: 2, correct: true }, { label: 'Low', tone: 3, correct: false } ],
        feedback: { hanzi: '無', pinyin: 'wú', meaning: 'without' }
      },
      {
        k: 'question',
        title: 'Rising or low?',
        audio: [ 'qi3' ],
        contrast: [ 'qi2', 'qi3' ],
        choices: [ { label: 'Rising', tone: 2, correct: false }, { label: 'Low', tone: 3, correct: true } ],
        feedback: { hanzi: '起', pinyin: 'qǐ', meaning: 'to get up' }
      },
      {
        k: 'question',
        title: 'Which tone is it?',
        audio: [ 'lai2' ],
        choices: [
          { label: 'High', tone: 1, correct: false },
          { label: 'Rising', tone: 2, correct: true },
          { label: 'Low', tone: 3, correct: false },
          { label: 'Falling', tone: 4, correct: false }
        ],
        feedback: { hanzi: '來', pinyin: 'lái', meaning: 'to come' }
      },
    ],
  },
  {
    id: 4,
    partId: 1,
    title: 'Open sounds: a, o, e',
    goal: 'Say and hear the finals a, o and e.',
    minutes: 4,
    screens: [
      {
        k: 'mouth',
        title: 'Three open sounds',
        talk: [
          '[[m:a|a]] Open your mouth *wide*,| like at the doctor.',
          '[[m:o|o]] Round your lips,| and hold one short sound.',
          '[[m:e|e]] Relax your lips,| and say "uh" from the *back*^e.'
        ],
        sounds: [ 'a', 'o', 'e' ],
        first: 'a'
      },
      {
        k: 'tiles',
        title: 'Hear them in words',
        items: [
          { pinyin: 'bà', meaning: 'dad', audio: 'ba4' },
          { pinyin: 'bō', meaning: 'wave', audio: 'bo1' },
          { pinyin: 'gē', meaning: 'older brother', audio: 'ge1' },
          { pinyin: 'hē', meaning: 'to drink', audio: 'he1' }
        ],
        autoPlayAll: true,
        talk: [ 'Listen to how each word ends.', 'The first sounds get their own lessons soon.' ]
      },
      {
        k: 'question',
        title: 'Which final do you hear?',
        audio: [ 'he1' ],
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'a', correct: false },
          { label: 'o', correct: false },
          { label: 'e', correct: true }
        ],
        feedback: { hanzi: '喝', pinyin: 'hē', meaning: 'to drink' }
      },
      {
        k: 'question',
        title: 'Which final do you hear?',
        audio: [ 'ba4' ],
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'a', correct: true },
          { label: 'o', correct: false },
          { label: 'e', correct: false }
        ],
        feedback: { hanzi: '爸', pinyin: 'bà', meaning: 'dad' }
      },
      {
        k: 'question',
        title: 'Which final do you hear?',
        audio: [ 'po1' ],
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'a', correct: false },
          { label: 'o', correct: true },
          { label: 'e', correct: false }
        ],
        feedback: { hanzi: '坡', pinyin: 'pō', meaning: 'slope' }
      },
      {
        k: 'question',
        title: 'Which final do you hear?',
        audio: [ 'ke4' ],
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'a', correct: false },
          { label: 'o', correct: false },
          { label: 'e', correct: true }
        ],
        feedback: { hanzi: '課', pinyin: 'kè', meaning: 'class' }
      },
    ],
  },
  {
    id: 5,
    partId: 1,
    title: 'Smile and round: i, u, ü',
    goal: 'Say i, u and ü, and recognise yi, wu and yu.',
    minutes: 5,
    screens: [
      {
        k: 'mouth',
        title: 'Smile and round',
        talk: [
          '[[m:i|i]] *Smile*,| and say "ee".',
          '[[m:u|u]] Make a small circle with your lips,| and say "oo".',
          'Say "ee",| keep your tongue *there*^i,| and round your lips. [[m:ü|ü]]'
        ],
        sounds: [ 'i', 'u', 'ü' ],
        first: 'i'
      },
      {
        k: 'spelling',
        title: 'Spelled on their own',
        rows: [
          { from: 'i', addedPrefix: 'y', to: 'yi', example: 'yī, one', audio: 'yi1' },
          { from: 'u', addedPrefix: 'w', to: 'wu', example: 'wǔ, five', audio: 'wu3' },
          {
            from: 'ü',
            addedPrefix: 'y',
            to: 'yu',
            droppedDots: true,
            example: 'yǔ, rain',
            audio: 'w:yu'
          }
        ],
        talk: [
          'When a word starts with these,| pinyin adds a letter in front.',
          "The sounds don't change.| Only the spelling.",
          'The last one keeps its rounded sound,| not "oo".| The dots just drop.'
        ]
      },
      {
        k: 'tiles',
        title: 'Two different sounds',
        items: [
          { pinyin: 'wú', meaning: 'without', audio: 'wu2' },
          { pinyin: 'yú', meaning: 'fish', audio: 'yu2' }
        ],
        autoPlayAll: true,
        talk: [
          'The first is "oo",| tongue pulled *back*.',
          'The second is the rounded sound,| tongue *forward*.'
        ]
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'yu2' ],
        contrast: [ 'wu2', 'yu2' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'wú', correct: false }, { label: 'yú', correct: true } ],
        feedback: { hanzi: '魚', pinyin: 'yú', meaning: 'fish' }
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'wu4' ],
        contrast: [ 'yu4', 'wu4' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'wù', correct: true }, { label: 'yù', correct: false } ],
        feedback: { hanzi: '霧', pinyin: 'wù', meaning: 'fog' }
      },
      {
        k: 'question',
        title: 'Which final is inside yǔ?',
        audio: [ 'w:yu' ],
        prompt: { pinyin: 'yǔ' },
        layout: 'three',
        isPinyinChoices: true,
        choices: [
          { label: 'i', correct: false },
          { label: 'u', correct: false },
          { label: 'ü', correct: true }
        ],
        feedback: { hanzi: '雨', pinyin: 'yǔ', meaning: 'rain' }
      },
      {
        k: 'build',
        title: 'Build yǔ',
        audio: 'w:yu',
        target: [ '', 'ü', 3 ],
        inis: [ '', 'l', 'n' ],
        fins: [ 'i', 'u', 'ü' ],
        tones: [ 2, 3, 4 ],
        displayPinyin: 'yǔ',
        dropDots: true,
        doneText: 'yǔ, rain'
      },
      {
        k: 'chart',
        title: 'Your first row',
        talk: [ 'Your first row of the pinyin chart.| Tap a box to hear it.' ],
        rows: [ '' ],
        cols: [ 'a', 'o', 'e', 'i', 'u', 'ü' ],
        fresh: [ '' ]
      },
    ],
  },
];
