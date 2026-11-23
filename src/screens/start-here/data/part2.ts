import type { StartHereLesson } from './types';

export const PART_2_LESSONS: StartHereLesson[] = [
  {
    id: 6,
    partId: 2,
    title: 'Air or no air: b p, d t, g k',
    goal: 'Make and hear the difference inside each pair.',
    minutes: 5,
    screens: [
      {
        k: 'word',
        title: 'Hold your hand in front of your mouth',
        pinyin: 'pā',
        meaning: 'lie face down',
        talk: [ 'Hand in front of your mouth,| and say it.| Feel the *puff*?' ],
        audio: 'pa1'
      },
      {
        k: 'word',
        title: 'Now this one',
        pinyin: 'bā',
        meaning: 'eight',
        talk: [ 'Now this one.| Almost *no* air.' ],
        audio: 'ba1'
      },
      {
        k: 'mouth',
        title: 'Same lips, different air',
        talk: [
          'Both are made with the *lips*^b.',
          'Watch the paper. [[m:b|b]] [[m:p|p]] Only the second one moves it.'
        ],
        sounds: [ 'b', 'p' ],
        first: 'b'
      },
      {
        k: 'pairs',
        title: 'Three pairs, one rule',
        headers: [ 'No air', 'Air' ],
        rows: [
          { label: 'Lips', cells: [ { text: 'b', audio: 'ba1' }, { text: 'p', audio: 'pa1' } ] },
          { label: 'Tongue tip', cells: [ { text: 'd', audio: 'da1' }, { text: 't', audio: 'ta1' } ] },
          {
            label: 'Back of tongue',
            cells: [ { text: 'g', audio: 'ge1' }, { text: 'k', audio: 'ke1' } ]
          }
        ],
        talk: [ 'Each pair is made in one place.| Listen for the air.' ]
      },
      {
        k: 'mouth',
        title: 'Where each pair is made',
        talk: [
          'These two use the tongue *tip*^d. [[m:d|d]] [[m:t|t]]',
          'These two use the *back*^g of the tongue. [[m:g|g]] [[m:k|k]]'
        ],
        sounds: [ 'd', 't', 'g', 'k' ],
        first: 'd'
      },
      {
        k: 'sort',
        title: 'Air or no air?',
        mode: 'audio',
        bins: [ { label: 'Air', icon: 'air' }, { label: 'No air', icon: 'noair' } ],
        items: [
          { audio: 'da1', label: 'dā', reveal: 'dā', bin: 1 },
          { audio: 'ta1', label: 'tā', reveal: 'tā', bin: 0 },
          { audio: 'ke1', label: 'kē', reveal: 'kē', bin: 0 },
          { audio: 'ge1', label: 'gē', reveal: 'gē', bin: 1 },
          { audio: 'ti1', label: 'tī', reveal: 'tī', bin: 0 },
          { audio: 'du1', label: 'dū', reveal: 'dū', bin: 1 }
        ],
        doneText: 'You heard it yourself: t and k have air. d and g do not.'
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'ta1' ],
        contrast: [ 'da1', 'ta1' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'dā', correct: false }, { label: 'tā', correct: true } ],
        feedback: { hanzi: '他', pinyin: 'tā', meaning: 'he' }
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'ge1' ],
        contrast: [ 'ke1', 'ge1' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'gē', correct: true }, { label: 'kē', correct: false } ],
        feedback: { hanzi: '哥', pinyin: 'gē', meaning: 'older brother' }
      },
      {
        k: 'chart',
        title: 'Six new rows on your chart',
        talk: [ 'Six new rows.| Tap a box to hear it.', "An empty box is a sound| that doesn't exist." ],
        rows: [
          '',  'b', 'p',
          'd', 't', 'g',
          'k'
        ],
        cols: [ 'a', 'o', 'e', 'i', 'u', 'ü' ],
        fresh: [ 'b', 'p', 'd', 't', 'g', 'k' ]
      },
    ],
  },
  {
    id: 7,
    partId: 2,
    title: 'Five easy ones: m, f, n, l, h',
    goal: 'Say and recognise m, f, n, l and h.',
    minutes: 4,
    screens: [
      {
        k: 'mouth',
        title: 'Lips and teeth',
        talk: [
          'These two use your lips and teeth.',
          '[[m:m|m]] Close your *lips*^m,| and hum.',
          '[[m:f|f]] Top teeth on your *bottom*^f lip,| and blow.'
        ],
        sounds: [ 'm', 'f' ],
        first: 'm'
      },
      {
        k: 'mouth',
        title: 'The tongue tip, and the back',
        talk: [
          'Both use the tongue *tip*^n. [[m:n|n]] [[m:l|l]]',
          'The first goes through your nose.| The second goes around the sides.',
          '[[m:h|h]] Breathe out gently,| from the *back*^h.'
        ],
        sounds: [ 'n', 'l', 'h' ],
        first: 'n'
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'la4' ],
        contrast: [ 'na4', 'la4' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'nà', correct: false }, { label: 'là', correct: true } ],
        feedback: { hanzi: '辣', pinyin: 'là', meaning: 'spicy' }
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'na4' ],
        contrast: [ 'la4', 'na4' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'nà', correct: true }, { label: 'là', correct: false } ],
        feedback: { hanzi: '那', pinyin: 'nà', meaning: 'that' }
      },
      {
        k: 'question',
        title: 'Which one do you hear?',
        audio: [ 'fa1' ],
        contrast: [ 'ha1', 'fa1' ],
        layout: 'two',
        isPinyinChoices: true,
        choices: [ { label: 'fā', correct: true }, { label: 'hā', correct: false } ],
        feedback: { hanzi: '發', pinyin: 'fā', meaning: 'to send out' }
      },
      {
        k: 'chart',
        title: 'Five more rows',
        talk: [ "Five more rows.| That's eleven of twenty-one." ],
        rows: [ 'm', 'f', 'n', 'l', 'h' ],
        cols: [ 'a', 'o', 'e', 'i' ],
        fresh: [ 'm', 'f', 'n', 'l', 'h' ]
      },
    ],
  },
  {
    id: 8, partId: 2, title: 'Finals that glide: ai, ei, ao, ou', minutes: 4,
    goal: 'Say two-letter finals as one smooth beat.',
    screens: [
      {
        k: 'tiles', title: 'Two vowel sounds, one beat',
        talk: ['Slide from one vowel to the next in *one* beat.',
          'Tap once as you say each word.'],
        items: [
          { pinyin: 'tài', hanzi: '太', meaning: 'too much', audio: 'tai4' },
          { pinyin: 'bēi', hanzi: '杯', meaning: 'cup', audio: 'bei1' },
          { pinyin: 'lǎo', hanzi: '老', meaning: 'old', audio: 'w:lao' },
          { pinyin: 'hǎo', hanzi: '好', meaning: 'good', audio: 'w:hao' },
          { pinyin: 'kǒu', hanzi: '口', meaning: 'mouth', audio: 'w:kou' },
        ],
      },
      {
        k: 'pairs', title: 'Feel where the vowel ends', headers: ['Listen'],
        talk: ['Hear the slide toward "ee" in these two. [[tai4|tài]] [[bei1|bēi]]',
          'Now listen for the slide toward "oo". [[w:hao|hǎo]] [[w:kou|kǒu]]'],
        rows: [
          { label: 'ai', cells: [{ text: 'tài', audio: 'tai4' }] },
          { label: 'ei', cells: [{ text: 'bēi', audio: 'bei1' }] },
          { label: 'ao', cells: [{ text: 'hǎo', audio: 'w:hao' }] },
          { label: 'ou', cells: [{ text: 'kǒu', audio: 'w:kou' }] },
        ],
      },
      {
        k: 'build', title: 'Build lǎo', audio: 'w:lao', target: ['l', 'ao', 3],
        inis: ['l', 'h', 'n'], fins: ['ai', 'ao', 'ou'], tones: [1, 3, 4], doneText: 'lǎo, old',
      },
      {
        k: 'question', title: 'Which final do you hear?', audio: ['tai4'], isPinyinChoices: true,
        choices: [{ label: 'ai', correct: true }, { label: 'ei', correct: false }, { label: 'ao', correct: false }],
        feedback: { hanzi: '太', pinyin: 'tài', meaning: 'too much' },
      },
      {
        k: 'question', title: 'Which final do you hear?', audio: ['w:hao'], isPinyinChoices: true,
        choices: [{ label: 'ou', correct: false }, { label: 'ai', correct: false }, { label: 'ao', correct: true }],
        feedback: { hanzi: '好', pinyin: 'hǎo', meaning: 'good' },
      },
      {
        k: 'chart', title: 'Four new finals', talk: ['Tap a box. Keep each final to one beat.'],
        rows: ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h'],
        cols: ['ai', 'ei', 'ao', 'ou'], fresh: ['ai', 'ei', 'ao', 'ou'],
      },
    ],
  },
  {
    id: 9, partId: 2, title: 'Finals that end in the nose: -n and -ng', minutes: 5,
    goal: 'Finish a syllable with -n or with -ng and know which is which.',
    screens: [
      {
        k: 'mouth', title: 'Two ways to end with a hum', sounds: ['-n', '-ng'], first: '-n',
        talk: ['[[m:-n|-n]] Touch your tongue tip behind your top teeth.',
          '[[m:-ng|-ng]] Keep the tip down and lift the back.',
          'Hum through your nose. There is no separate "g" sound.'],
      },
      {
        k: 'pairs', title: 'Freeze at the end', headers: ['-n', '-ng'],
        talk: ['Say each pair and freeze. Which part of your tongue touches?',
          'In Taiwan these two endings can sound very close.'],
        rows: [
          { label: 'an / ang', cells: [{ text: 'bān', audio: 'ban1' }, { text: 'bāng', audio: 'bang1' }] },
          { label: 'en / eng', cells: [{ text: 'fēn', audio: 'fen1' }, { text: 'fēng', audio: 'feng1' }] },
          { label: 'in / ing', cells: [{ text: 'lín', audio: 'lin2' }, { text: 'líng', audio: 'ling2' }] },
        ],
      },
      {
        k: 'word', title: 'Round your lips for ong', audio: 'dong1', pinyin: 'dōng', hanzi: '東', meaning: 'east',
        talk: ['Start with a short, rounded "oo".', 'Then lift the back of your tongue. [[dong1|dōng]]'],
      },
      {
        k: 'sort', title: 'Sort by the written ending', mode: 'text',
        bins: [{ label: '-n' }, { label: '-ng' }],
        items: [
          { label: 'fēn', audio: 'fen1', bin: 0 }, { label: 'líng', audio: 'ling2', bin: 1 },
          { label: 'dōng', audio: 'dong1', bin: 1 }, { label: 'lín', audio: 'lin2', bin: 0 },
          { label: 'fēng', audio: 'feng1', bin: 1 },
        ],
        doneText: 'For -n, use the tip. For -ng, lift the back.',
      },
      {
        k: 'question', title: 'Which ending do you hear?', audio: ['bang1'], contrast: ['ban1', 'bang1'],
        layout: 'two', isPinyinChoices: true,
        choices: [{ label: '-n', correct: false }, { label: '-ng', correct: true }],
        feedback: { hanzi: '幫', pinyin: 'bāng', meaning: 'to help' },
      },
      {
        k: 'question', title: 'Which ending do you hear?', audio: ['ban1'], contrast: ['bang1', 'ban1'],
        layout: 'two', isPinyinChoices: true,
        choices: [{ label: '-n', correct: true }, { label: '-ng', correct: false }],
        feedback: { hanzi: '班', pinyin: 'bān', meaning: 'a class' },
      },
      {
        k: 'chart', title: 'Finals with nasal endings', talk: ['Find two boxes that differ only in their ending.'],
        rows: ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h'],
        cols: ['an', 'en', 'in', 'ang', 'eng', 'ing', 'ong'],
        fresh: ['an', 'en', 'in', 'ang', 'eng', 'ing', 'ong'],
      },
    ],
  },
];
