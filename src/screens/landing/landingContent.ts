/**
 * Copy and sample content for the signed-out landing page. Grammar rows are the book's own
 * pattern rows (Book 1, Lessons 1–2); hooks and parts come from public/data/memory-hooks.
 */

export const LANDING_META = {
  title: "Ron's Mandarin · 時代華語 Modern Chinese Flashcards",
  description: 'Free traditional Chinese flashcards, quizzes, stories and grammar for the Taiwan textbook 時代華語 Modern Chinese. TOCFL A1 to B2, one lesson at a time.',
};

export type DemoId = 'cards' | 'quiz' | 'tones' | 'dictionary' | 'grammar' | 'party' | 'characters';

export const DEMOS: { id: DemoId; label: string; icon: 'flashcards' | 'quiz' | 'tonesPractice' | 'dictionary' | 'grammarBook' | 'challenge' | 'characters'; title: string }[] = [
  { id: 'cards', label: 'Cards', icon: 'flashcards', title: 'Cards from your lesson' },
  { id: 'quiz', label: 'Quiz', icon: 'quiz', title: 'Quizzes that test meaning' },
  { id: 'tones', label: 'Tones', icon: 'tonesPractice', title: 'Choose the tone' },
  { id: 'dictionary', label: 'Dictionary', icon: 'dictionary', title: 'A dictionary that knows your book' },
  { id: 'grammar', label: 'Grammar', icon: 'grammarBook', title: 'Grammar you can play with' },
  { id: 'party', label: 'Party', icon: 'challenge', title: 'Party mode' },
  { id: 'characters', label: 'Characters', icon: 'characters', title: 'Every character, explained' },
];

export interface GrammarRound { pattern: string[]; key: number; english: string; answer: string[] }

export const GRAMMAR_ROUNDS: GrammarRound[] = [
  { pattern: ['Subject', '叫', 'Name'], key: 1, english: 'His name is Zhongming.', answer: ['他', '叫', '中明'] },
  { pattern: ['Subject', '不是', 'Noun'], key: 1, english: 'He is not Taiwanese.', answer: ['他', '不是', '臺灣人'] },
  { pattern: ['Subject', '很', 'Adjective'], key: 1, english: 'She is (very) pretty.', answer: ['她', '很', '漂亮'] },
  { pattern: ['Statement', '嗎'], key: 1, english: 'Is he Taiwanese?', answer: ['他', '是', '臺灣人', '嗎'] },
  { pattern: ['Statement', 'Topic', '呢'], key: 2, english: 'I am Taiwanese. How about you?', answer: ['我', '是', '臺灣人', '你', '呢'] },
  { pattern: ['Subject', '(不)', 'Verb', 'Object'], key: 2, english: "I don't like him.", answer: ['我', '不', '喜歡', '他'] },
];

/** Memory hooks as authored: `part(meaning)` pairs, ending with the character itself. */
export const SAMPLE_HOOKS: Record<string, string> = {
  她: 'a 女(woman) waves a 也(also) flag beside her sister → 她(she).',
  是: 'a 日(sun) and 一(one) line pin a 龰(foot) down → the foot is forced to 是(be).',
  新: 'Your 亲(parents) craft a gift with a sharp 斤(axe), making it fresh and brand 新(new).',
  同: 'a 冂(frame) with a 一(one) bar holds every 口(mouth) together → one voice, 同(same).',
  學: 'Two 𦥑(hands) over a desk 冖(cover) guide counting 爻(crossed sticks) for an eager 子(child) to 學(learn).',
  叫: 'a 口(mouth) joins a 丩(vine) to shout a name → 叫(be called).',
  友: 'a 𠂇(left hand) reaches out, and 又(again) a hand grips back — meeting again and again as 友(friend).',
  美: 'a 䒑(grass top) grows on 土(earth) while a 大(big) figure poses → 美(beautiful).',
};

/** Book 1 Lesson 1, dialogue 1: 她是新同學，叫友美。 Words, not characters, so names work too. */
export const SAMPLE_SENTENCE: (readonly [word: string, pinyin: string, meaning: string] | string)[] = [
  ['她', 'tā', 'she'], ['是', 'shì', 'to be'], ['新', 'xīn', 'new'], ['同學', 'tóngxué', 'classmate'], '，',
  ['叫', 'jiào', 'to be called'], ['友美', 'Yǒuměi', 'Youmei (a name)'], '。',
];

export const FAQ: { q: string; a: string }[] = [
  { q: 'Is it free?', a: 'Yes. No ads, no paid plan.' },
  { q: 'Does it have Chinese flashcards?', a: 'Yes. Traditional Chinese flashcards with Taiwan audio for every lesson, plus quizzes, tones and grammar.' },
  { q: 'Which books does it cover?', a: '時代華語 Modern Chinese Books 1 to 4, from TOCFL A1 to B2. Books 1 to 3 are open in the beta.' },
  { q: 'Can I use it for TOCFL?', a: 'Yes. The books run from TOCFL A1 to B2, so each lesson builds the vocabulary and grammar those levels test.' },
  { q: 'Traditional or simplified?', a: 'Traditional, as in the book, with Taiwan pronunciation.' },
  { q: 'Does it work on my phone?', a: 'Yes, in any browser. Add it to your home screen like an app.' },
];
