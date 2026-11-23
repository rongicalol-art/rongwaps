import type { StartHereLesson } from './types';

const chartRows = ['', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'z', 'c', 's', 'zh', 'ch', 'sh', 'r', 'j', 'q', 'x'];
const iFinals = ['ia', 'ie', 'iao', 'iu', 'ian', 'iang', 'iong'];
const uFinals = ['ua', 'uo', 'uai', 'ui', 'uan', 'un', 'uang', 'ueng'];
const roundedFrontFinals = ['üe', 'üan', 'ün'];

const iSpellings = { i: 'yi', ia: 'ya', ie: 'ye', iao: 'yao', iu: 'you', ian: 'yan', in: 'yin', iang: 'yang', ing: 'ying', iong: 'yong' };
const uSpellings = { u: 'wu', ua: 'wa', uo: 'wo', uai: 'wai', ui: 'wei', uan: 'wan', un: 'wen', uang: 'wang', ueng: 'weng' };
const roundedFrontSpellings = {
  'ü': 'yu', 'üe': 'yue', 'üan': 'yuan', 'ün': 'yun',
  'jü': 'ju', 'jüe': 'jue', 'jüan': 'juan', 'jün': 'jun',
  'qü': 'qu', 'qüe': 'que', 'qüan': 'quan', 'qün': 'qun',
  'xü': 'xu', 'xüe': 'xue', 'xüan': 'xuan', 'xün': 'xun',
};

export const PART_4_LESSONS: StartHereLesson[] = [
  {
    id: 14, partId: 4, title: 'Finals that start with i', minutes: 5,
    goal: 'Read finals like ie, iao, ian and iu, and their spellings with y.',
    screens: [
      {
        k: 'tiles', title: 'Start with a quick “ee”',
        talk: ['Start with a quick "ee" and slide into the rest.',
          'In the first word, the second vowel sounds like "yes". [[xie4|xiè]]',
          'In this one, the ending sounds close to "yen". [[xian1|xiān]]'],
        items: [
          { pinyin: 'xiè', hanzi: '謝', meaning: 'to thank', audio: 'xie4' },
          { pinyin: 'xiǎo', hanzi: '小', meaning: 'small', audio: 'w:xiao' },
          { pinyin: 'xiān', hanzi: '先', meaning: 'first', audio: 'xian1' },
          { pinyin: 'liù', hanzi: '六', meaning: 'six', audio: 'liu4' },
        ],
      },
      {
        k: 'spelling', title: 'What changes when there is no initial?',
        talk: ['At the start, the first vowel is often written with "y".',
          'In the last two rows, keep the first vowel letter too.',
          'With an initial, pinyin shortens "i-o-u" to "i-u". [[liu4|liù]]'],
        rows: [
          { from: 'ie', to: 'ye', example: 'yě, also', audio: 'ye3' },
          { from: 'iao', to: 'yao', example: 'yào, to want', audio: 'yao4' },
          { from: 'iu', to: 'you', example: 'yǒu, to have', audio: 'you3' },
          { from: 'in', addedPrefix: 'y', to: 'yin', example: 'yīn, sound', audio: 'yin1' },
          { from: 'ing', addedPrefix: 'y', to: 'ying', example: 'yīng, eagle', audio: 'ying1' },
        ],
      },
      {
        k: 'question', title: 'Which final do you hear?', audio: ['xie4'], layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'ian', correct: false }, { label: 'ie', correct: true }, { label: 'iao', correct: false }],
        feedback: { hanzi: '謝', pinyin: 'xiè', meaning: 'to thank. In ie, the second vowel sounds like “yes”.' },
      },
      {
        k: 'build', title: 'Build xiān', target: ['x', 'ian', 1], audio: 'xian1',
        inis: ['x', 'j', 'q'], fins: ['ie', 'iao', 'ian'], tones: [1, 2, 3], doneText: 'xiān, first',
      },
      { k: 'split', title: 'Find the pieces in xiǎo', initial: 'x', final: 'iao', tone: 3, audio: 'w:xiao' },
      { k: 'split', title: 'Find the pieces in jiě', initial: 'j', final: 'ie', tone: 3, audio: 'jie3' },
      {
        k: 'question', title: 'Which final is spelled you on its own?', audio: ['you3'],
        prompt: { pinyin: 'yǒu' }, layout: 'three', isPinyinChoices: true,
        choices: [{ label: 'iao', correct: false }, { label: 'iu', correct: true }, { label: 'ian', correct: false }],
        feedback: { hanzi: '有', pinyin: 'yǒu', meaning: 'to have. With an initial, the final is written iu.' },
      },
      {
        k: 'chart', title: 'More finals in the i family',
        talk: ['Try the last column with your lips rounded. [[xiong1|xiōng]]'],
        rows: chartRows, cols: iFinals, fresh: iFinals, spellOverrides: iSpellings,
      },
    ],
  },
  {
    id: 15, partId: 4, title: 'Finals that start with u', minutes: 5,
    goal: 'Read finals like uo, ui, un and uan, and their spellings with w.',
    screens: [
      {
        k: 'pairs', title: 'Start with rounded lips', headers: ['On its own', 'With an initial'],
        talk: ['Start with "oo", then slide into the next sound.',
          'Listen for the shared final in the first row.'],
        rows: [
          { label: 'uo', cells: [{ text: 'wǒ', audio: 'w:wo', sub: 'I' }, { text: 'guó', audio: 'guo2', sub: 'country' }] },
          { label: 'ua', cells: [{ text: 'wā', audio: 'wa1', sub: 'to dig' }, { text: 'huā', audio: 'hua1', sub: 'flower' }] },
          { label: 'uai', cells: [{ text: 'wài', audio: 'wai4', sub: 'outside' }, { text: 'kuài', audio: 'kuai4', sub: 'fast' }] },
        ],
      },
      {
        k: 'spelling', title: 'Long and short spellings',
        talk: ['On their own, these finals start with "w".',
          'The first two get a longer spelling with no initial.'],
        rows: [
          { from: 'ui', to: 'wei', example: 'wèi, for', audio: 'wei4' },
          { from: 'un', to: 'wen', example: 'wèn, to ask', audio: 'wen4' },
          { from: 'uan', to: 'wan', example: 'wān, bay', audio: 'wan1' },
          { from: 'uang', to: 'wang', example: 'wáng, a family name', audio: 'wang2' },
        ],
      },
      {
        k: 'build', title: 'Build duì', target: ['d', 'ui', 4], audio: 'dui4',
        inis: ['d', 't', 'g'], fins: ['ui', 'un', 'uo'], tones: [2, 3, 4], doneText: 'duì, correct',
      },
      {
        k: 'build', title: 'Build wǒ', target: ['', 'uo', 3], audio: 'w:wo', displayPinyin: 'wǒ',
        inis: ['', 'g', 'h'], fins: ['u', 'uo', 'un'], tones: [2, 3, 4], doneText: 'wǒ, I',
      },
      {
        k: 'question', title: 'What is ui short for in duì?', audio: ['dui4'], prompt: { pinyin: 'duì' },
        layout: 'two', isPinyinChoices: true,
        choices: [{ label: 'u + ei', correct: true }, { label: 'u + i', correct: false }],
        feedback: { hanzi: '對', pinyin: 'duì', meaning: 'correct. The mark goes on the i in ui.' },
      },
      {
        k: 'question', title: 'Which sounds are in the final of wèn?', audio: ['wen4'], prompt: { pinyin: 'wèn' },
        layout: 'two', isPinyinChoices: true,
        choices: [{ label: 'u + an', correct: false }, { label: 'u + en', correct: true }],
        feedback: { hanzi: '問', pinyin: 'wèn', meaning: 'to ask. With an initial, u + en is written un.' },
      },
      {
        k: 'chart', title: 'More finals in the u family', talk: ['Find a final and compare two rows.'],
        rows: chartRows, cols: uFinals, fresh: uFinals, spellOverrides: uSpellings,
      },
    ],
  },
  {
    id: 16, partId: 4, title: 'Finals with ü', minutes: 4,
    goal: 'Find the hidden ü in spellings like xué and yuè.',
    screens: [
      {
        k: 'spelling', title: 'Find the missing dots',
        talk: ['Keep your tongue forward and your lips rounded. [[m:ü|ü]]',
          'After "j", "q", "x" or "y", the two dots disappear. [[xue2|xué]] [[yue4|yuè]]',
          'In the first row, the second vowel sounds like "yes".'],
        rows: [
          { from: 'üe', to: 'yue', addedPrefix: 'y', droppedDots: true, example: 'yuè, month', audio: 'yue4' },
          { from: 'üan', to: 'yuan', addedPrefix: 'y', droppedDots: true, example: 'yuán, dollar', audio: 'yuan2' },
          { from: 'ün', to: 'yun', addedPrefix: 'y', droppedDots: true, example: 'yún, cloud', audio: 'yun2' },
        ],
      },
      {
        k: 'pairs', title: 'Same rounded lips, different tongue', headers: ['u', 'ü'],
        talk: ['After "n" or "l", the dots stay. [[w:nv|nǚ]] [[lü4|lǜ]]',
          'Listen to the tongue shift forward in the right column.',
          'In the top right, the middle vowel sounds like "pen".'],
        rows: [
          { label: 'Long final', cells: [{ text: 'guān', audio: 'guan1', sub: 'to close' }, { text: 'quán', audio: 'quan2', sub: 'whole' }] },
          { label: 'Single vowel', cells: [{ text: 'lù', audio: 'w:lu', sub: 'to record' }, { text: 'lǜ', audio: 'lü4', sub: 'green' }] },
        ],
      },
      {
        k: 'sort', title: 'Sort by the sound of the written u', mode: 'text',
        bins: [{ label: 'u' }, { label: 'ü' }],
        items: [
          { label: 'lù', audio: 'w:lu', bin: 0 }, { label: 'qù', audio: 'qu4', bin: 1 },
          { label: 'gǔ', audio: 'gu3', bin: 0 }, { label: 'lǜ', audio: 'lü4', bin: 1 },
          { label: 'zhù', audio: 'zhu4', bin: 0 }, { label: 'jù', audio: 'ju4', bin: 1 },
          { label: 'wǔ', audio: 'wu3', bin: 0 }, { label: 'yǔ', audio: 'w:yu', bin: 1 },
        ],
        doneText: 'After j, q, x and y, a written u stands for ü.',
      },
      {
        k: 'build', title: 'Build xué', target: ['x', 'üe', 2], audio: 'xue2',
        inis: ['x', 'j', 'q'], fins: ['üe', 'uo', 'ün'], tones: [1, 2, 4],
        displayPinyin: 'xué', dropDots: true, doneText: 'xué, to study',
      },
      {
        k: 'question', title: 'Which vowel starts the final in yún?', audio: ['yun2'],
        prompt: { pinyin: 'yún' }, layout: 'two', isPinyinChoices: true,
        choices: [{ label: 'u', correct: false }, { label: 'ü', correct: true }],
        feedback: { hanzi: '雲', pinyin: 'yún', meaning: 'cloud. The final is ün, with the dots left off.' },
      },
      {
        k: 'chart', title: 'More finals in the ü family', talk: ['Find the final in the word for month. [[yue4|yuè]]'],
        rows: ['', 'n', 'l', 'j', 'q', 'x'], cols: roundedFrontFinals, fresh: roundedFrontFinals,
        spellOverrides: roundedFrontSpellings,
      },
    ],
  },
  {
    id: 17, partId: 4, title: 'The whole pinyin chart', minutes: 5,
    goal: 'Read a syllable in pieces and find it on the chart.',
    screens: [
      {
        k: 'word', title: 'One last final: er', audio: 'er4', pinyin: 'èr', hanzi: '二', meaning: 'two',
        talk: ['Start with a relaxed "uh". Lift the tongue tip slightly back.',
          'This final stands on its own. [[er4|èr]]'],
      },
      {
        k: 'chart', title: 'Find the sound on the full chart', fullChart: true, rows: chartRows,
        cols: ['a', 'o', 'e', 'i', 'u', 'ü', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'in', 'ang', 'eng', 'ing', 'ong',
          ...iFinals, ...uFinals, ...roundedFrontFinals, 'er'],
        fresh: ['er'], spellOverrides: { ...iSpellings, ...uSpellings, ...roundedFrontSpellings },
        talk: ['Find the tone mark, then look for the initial and final.',
          'A vowel, "y" or "w" at the start uses the first row.',
          'Pick a box, then switch to the tone you need.'],
        huntTargets: [
          { syllable: 'xue', tone: 2, audio: 'xue2', label: 'xué' },
          { syllable: 'sheng', tone: 1, audio: 'sheng1', label: 'shēng' },
          { syllable: 'lao', tone: 3, audio: 'w:lao', label: 'lǎo' },
          { syllable: 'wo', tone: 3, audio: 'w:wo', label: 'wǒ' },
        ],
      },
      { k: 'split', title: 'Find the pieces in shēng', initial: 'sh', final: 'eng', tone: 1, audio: 'sheng1' },
      { k: 'split', title: 'Find the pieces in wǒ', initial: '', final: 'uo', tone: 3, audio: 'w:wo' },
      { k: 'split', title: 'Find the pieces in xiǎo', initial: 'x', final: 'iao', tone: 3, audio: 'w:xiao' },
    ],
  },
];
