import type { GrammarPractice, PracticeSentence, PracticeSituation } from '../../types/models';

const sentence: PracticeSentence = {
  traditional: '他可以說是好老師。', simplified: '他可以说是好老师。', pinyin: 'Tā kěyǐ shuō shì hǎo lǎoshī.', english: 'He can be called a good teacher.',
};
const situation: PracticeSituation = {
  traditional: '他教得很好。你怎麼說？', simplified: '他教得很好。你怎么说？', pinyin: 'Tā jiāo de hěn hǎo. Nǐ zěnme shuō?', english: 'He teaches very well. What would you say?',
};

/** Engine fixtures only; these are not authored course content. Loaded by the DEV gallery. */
export const REPLY_PICK_PREVIEW: GrammarPractice = {
  bookPage: 1, title: 'Reply pick engine fixtures', items: [
    {
      id: 'reply-bank-preview', source: 'own', kind: 'reply-pick', prompt: 'Pick a reply that fits.',
      lines: [
        { speaker: { traditional: 'A' }, segments: [{ type: 'text', traditional: '他怎麼樣？', simplified: '他怎么样？' }] },
        { me: true, segments: [{ type: 'slot', id: 'reply', answers: [] }] },
      ],
      fill: { traditional: '可以說是', simplified: '可以说是', pinyin: 'kěyǐ shuō shì' },
      options: [
        { traditional: '他～好老師。', simplified: '他～好老师。', ok: true, result: sentence },
        { traditional: '他～好朋友。', ok: true, result: { traditional: '他可以說是好朋友。', simplified: '他可以说是好朋友。', pinyin: 'Tā kěyǐ shuō shì hǎo péngyǒu.', english: 'He can be called a good friend.' } },
        { traditional: '他～去。', note: 'Use the pattern to describe someone.' },
      ],
    },
    {
      id: 'reply-situation-preview', source: 'own', kind: 'reply-pick', prompt: 'Pick the best reply.', situation,
      options: [
        { traditional: sentence.traditional, simplified: sentence.simplified, ok: true, result: sentence },
        { traditional: '他不會教。', simplified: '他不会教。', note: 'The situation says he teaches well.' },
        { traditional: '他不去。', note: 'This talks about going somewhere.' },
      ],
    },
    {
      id: 'build-situation-preview', source: 'own', kind: 'order-build', prompt: 'Now say it yourself.', situation,
      tiles: [
        { traditional: '他', pinyin: 'tā' }, { traditional: '可以說是', simplified: '可以说是', pinyin: 'kěyǐ shuō shì' },
        { traditional: '好老師', simplified: '好老师', pinyin: 'hǎo lǎoshī' }, { traditional: '去', pinyin: 'qù' },
      ],
      accepted: [{ order: ['他', '可以說是', '好老師'], sentence }],
      repairs: [{ placed: ['去'], note: 'Describe him rather than going somewhere.' }], fallbackRepair: 'Start with who, then the pattern and the description.',
    },
  ],
};
