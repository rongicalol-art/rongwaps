import type { ReadyCheckQuestion } from './types';

export const READY_CHECK_PASS = 11;

export const READY_CHECK_QUESTIONS: ReadyCheckQuestion[] = [
  {
    id: 'falling-tone', partId: 1, k: 'question', title: 'Which tone do you hear?', audio: ['ba4'],
    contrast: ['ba1', 'ba4'], layout: 'two',
    choices: [{ label: 'High and flat', tone: 1, correct: false }, { label: 'Falling', tone: 4, correct: true }],
    feedback: { hanzi: '爸', pinyin: 'bà', meaning: 'dad. Tone 4 starts high and falls quickly.' },
  },
  {
    id: 'low-tone', partId: 1, k: 'question', title: 'Rising or low?', audio: ['w:ma'],
    contrast: ['ma2', 'w:ma'], layout: 'two',
    choices: [{ label: 'Rising', tone: 2, correct: false }, { label: 'Low', tone: 3, correct: true }],
    feedback: { hanzi: '馬', pinyin: 'mǎ', meaning: 'horse. Tone 3 goes down low.' },
  },
  {
    id: 'rounded-final', partId: 1, k: 'question', title: 'Which final is inside this syllable?', audio: ['w:yu'],
    prompt: { pinyin: 'yǔ' }, layout: 'three', isPinyinChoices: true,
    choices: [{ label: 'ü', correct: true }, { label: 'u', correct: false }, { label: 'i', correct: false }],
    feedback: { hanzi: '雨', pinyin: 'yǔ', meaning: 'rain. The tongue stays forward while the lips round.' },
  },
  {
    id: 'gliding-final', partId: 2, k: 'question', title: 'Which final do you hear?', audio: ['bei1'],
    layout: 'three', isPinyinChoices: true,
    choices: [{ label: 'ai', correct: false }, { label: 'ei', correct: true }, { label: 'ou', correct: false }],
    feedback: { hanzi: '杯', pinyin: 'bēi', meaning: 'cup. The two vowels glide together in one beat.' },
  },
  {
    id: 'nasal-ending', partId: 2, k: 'question', title: 'Which ending do you hear?', audio: ['ban1'],
    contrast: ['bang1', 'ban1'], layout: 'two', isPinyinChoices: true,
    choices: [{ label: '-n', correct: true }, { label: '-ng', correct: false }],
    feedback: { hanzi: '班', pinyin: 'bān', meaning: 'a class. The tongue tip rises for the -n ending.' },
  },
  {
    id: 'initial-family', partId: 3, k: 'question', title: 'Which family starts this syllable?', audio: ['chi4'],
    layout: 'three', isPinyinChoices: true,
    choices: [{ label: 'z, c, s', correct: false }, { label: 'j, q, x', correct: false }, { label: 'zh, ch, sh', correct: true }],
    feedback: { hanzi: '翅', pinyin: 'chì', meaning: 'wing. The tongue tip lifts back for ch.' },
  },
  {
    id: 'tongue-tip', partId: 3, k: 'question', title: 'Where is your tongue tip for this initial?', audio: ['qu4'],
    prompt: { pinyin: 'qù' },
    choices: [{ label: 'Down behind the bottom teeth', correct: true }, { label: 'Lifted back', correct: false },
      { label: 'Forward near the top teeth', correct: false }],
    feedback: { hanzi: '去', pinyin: 'qù', meaning: 'to go. For q, the tongue tip stays down.' },
  },
  {
    id: 'w-spelling', partId: 4, k: 'question', title: 'Which sounds make up this final?', audio: ['wen4'],
    prompt: { pinyin: 'wèn' }, layout: 'three', isPinyinChoices: true,
    choices: [{ label: 'u + an', correct: false }, { label: 'u + ei', correct: false }, { label: 'u + en', correct: true }],
    feedback: { hanzi: '問', pinyin: 'wèn', meaning: 'to ask. With an initial, this final is written un.' },
  },
  {
    id: 'hidden-dots', partId: 4, k: 'question', title: 'Which pieces make up this syllable?', audio: ['xue2'],
    prompt: { pinyin: 'xué' }, layout: 'three', isPinyinChoices: true,
    choices: [{ label: 'x + üe', correct: true }, { label: 'x + uo', correct: false }, { label: 'x + ie', correct: false }],
    feedback: { hanzi: '學', pinyin: 'xué', meaning: 'to study. The dots are left off after x.' },
  },
  {
    id: 'two-low-tones', partId: 5, k: 'question', title: 'How does the first syllable sound?', audio: ['w:keyi'],
    prompt: { pinyin: 'kěyǐ' }, layout: 'two',
    choices: [{ label: 'It stays low', correct: false }, { label: 'It rises', correct: true }],
    feedback: { hanzi: '可以', pinyin: 'kěyǐ', meaning: 'can. Two low tones together make the first one rise.' },
  },
  {
    id: 'not-changes', partId: 5, k: 'question', title: 'Which tone does the first syllable have?', audio: ['w:bukeqi'],
    prompt: { hanzi: '不客氣' }, layout: 'three',
    choices: [{ label: 'Falling', tone: 4, correct: false }, { label: 'High and flat', tone: 1, correct: false },
      { label: 'Rising', tone: 2, correct: true }],
    feedback: { hanzi: '不客氣', pinyin: 'bú kèqì', meaning: 'you are welcome. Here 不 rises before a falling tone.' },
  },
  {
    id: 'plural-pronoun', partId: 6, k: 'question', title: 'What does this word mean?', audio: ['w:women'],
    prompt: { hanzi: '我們' }, layout: 'three',
    choices: [{ label: 'They', correct: false }, { label: 'I', correct: false }, { label: 'We', correct: true }],
    feedback: { hanzi: '我們', pinyin: 'wǒmen', meaning: 'we. The ending 們 makes it plural.' },
  },
  {
    id: 'first-sentence', partId: 6, k: 'question', title: 'What does this sentence mean?', audio: ['w:wo+w:shi+w:xuesheng'],
    prompt: { hanzi: '我是學生。' },
    choices: [{ label: 'I am a student.', correct: true }, { label: 'I am a teacher.', correct: false },
      { label: 'He is a student.', correct: false }],
    feedback: { hanzi: '我是學生。', pinyin: 'Wǒ shì xuéshēng.', meaning: 'I am a student.' },
  },
];
