/**
 * Static part-of-speech content for course vocabulary.
 *
 * `book_vocabulary.pos` stores compact textbook tags (the Cheng & Tsui
 * "Modern Chinese" set, e.g. `N`, `Vs`, `V-sep`). This module is the single
 * source of truth for the learner-facing label, the color category, the
 * hover explanation, and the Chinese term for each tag. Pure lookup helpers
 * live in `src/utils/posLabels.ts`.
 *
 * Chinese example tokens inside explanations are marked as `{zh:key}` and
 * resolved per script preference via `zhTokens` (see `getPosExplanation`).
 */

export type PosCategory =
  | 'noun'
  | 'verb'
  | 'stative'
  | 'measure'
  | 'adverb'
  | 'function'
  | 'phrase'
  | 'other';

/** A Chinese example token in both scripts. */
export interface ZhToken {
  s: string;
  t: string;
}

export interface PosInfo {
  /** Learner-facing label, e.g. "Noun". */
  label: string;
  /** Color-category used for the badge tint. */
  category: PosCategory;
  /** One or two friendly sentences explaining the word class. */
  explanation: string;
  /** Chinese example tokens referenced as `{zh:key}` inside the explanation. */
  zhTokens?: Record<string, ZhToken>;
  /** Chinese term (e.g. 名词) shown beside the English label in the tooltip. */
  zh?: string;
}

export const POS_INFO: Record<string, PosInfo> = {
  N: {
    label: 'Noun',
    category: 'noun',
    zh: '名词',
    explanation:
      'Names a person, place, thing, or idea — like {zh:teacher} (teacher) or {zh:school} (school). Nouns stay the same whether singular or plural.',
    zhTokens: {
      teacher: { s: '老师', t: '老師' },
      school: { s: '学校', t: '學校' },
    },
  },
  Name: {
    label: 'Proper noun',
    category: 'noun',
    zh: '专有名词',
    explanation:
      'The name of a specific person or place — like {zh:china} (China) or {zh:teacher-wang} (Teacher Wang). It is always written with a capital letter in English.',
    zhTokens: {
      china: { s: '中国', t: '中國' },
      'teacher-wang': { s: '王老师', t: '王老師' },
    },
  },
  V: {
    label: 'Verb',
    category: 'verb',
    zh: '动词',
    explanation:
      'Describes an action — like 看 (to look) or 去 (to go). The verb does not change form no matter who does the action.',
  },
  Vs: {
    label: 'Stative verb',
    category: 'stative',
    zh: '形容词',
    explanation:
      'Describes a quality or state — 漂亮 (pretty), 累 (tired). In Chinese these act like verbs: 她很漂亮 means “she is pretty”.',
  },
  Vst: {
    label: 'Stative verb',
    category: 'stative',
    zh: '形容词',
    explanation:
      'Describes a quality or state — 漂亮 (pretty), 累 (tired). In Chinese these act like verbs: 她很漂亮 means “she is pretty”.',
  },
  'Vs-pred': {
    label: 'Stative verb',
    category: 'stative',
    zh: '形容词',
    explanation:
      'Describes a quality or state — 漂亮 (pretty), 累 (tired). In Chinese these act like verbs: 她很漂亮 means “she is pretty”.',
  },
  Vi: {
    label: 'Intransitive verb',
    category: 'verb',
    zh: '不及物动词',
    explanation:
      'An intransitive verb takes no object — like {zh:come} (to come). The action stands on its own.',
    zhTokens: {
      come: { s: '来', t: '來' },
    },
  },
  Vt: {
    label: 'Transitive verb',
    category: 'verb',
    zh: '及物动词',
    explanation:
      'A transitive verb takes an object — like {zh:read} (read a book). The action passes to something.',
    zhTokens: {
      read: { s: '看书', t: '看書' },
    },
  },
  Vpt: {
    label: 'Transitive verb',
    category: 'verb',
    zh: '及物动词',
    explanation:
      'A transitive verb takes an object — like {zh:read} (read a book). The action passes to something.',
    zhTokens: {
      read: { s: '看书', t: '看書' },
    },
  },
  'V-sep': {
    label: 'Separable verb',
    category: 'verb',
    zh: '离合词',
    explanation:
      'A separable verb splits to fit more meaning: {zh:attend} (attend class) → {zh:attend-english} (attend English class). The two parts stay linked in meaning.',
    zhTokens: {
      attend: { s: '上课', t: '上課' },
      'attend-english': { s: '上英语课', t: '上英語課' },
    },
  },
  Vp: {
    label: 'Verb phrase',
    category: 'verb',
    zh: '动词短语',
    explanation:
      'A verb with its object or complement, used as one unit — like {zh:read} (read books).',
    zhTokens: {
      read: { s: '看书', t: '看書' },
    },
  },
  'Vp-sep': {
    label: 'Separable verb phrase',
    category: 'verb',
    zh: '离合短语',
    explanation:
      'A separable verb phrase can split to add detail: {zh:call} (make a phone call) → {zh:quick-call} (make a quick call).',
    zhTokens: {
      call: { s: '打电话', t: '打電話' },
      'quick-call': { s: '打个电话', t: '打個電話' },
    },
  },
  Vaux: {
    label: 'Auxiliary verb',
    category: 'verb',
    zh: '助动词',
    explanation:
      'An auxiliary verb helps the main verb express ability or intention — {zh:can} (can), 想 (want to), 要 (will). It comes before the main verb.',
    zhTokens: {
      can: { s: '会', t: '會' },
    },
  },
  Adv: {
    label: 'Adverb',
    category: 'adverb',
    zh: '副词',
    explanation:
      'Adds detail about how, when, or how much — like 很 (very) or 都 (all). It usually sits right before the verb.',
  },
  M: {
    label: 'Measure word',
    category: 'measure',
    zh: '量词',
    explanation:
      'Counts or classifies a noun — {zh:one-book} (one book), {zh:three-people} (three people). Every noun pairs with its own measure word; {zh:ge} is the general one.',
    zhTokens: {
      'one-book': { s: '一本书', t: '一本書' },
      'three-people': { s: '三个人', t: '三個人' },
      ge: { s: '个', t: '個' },
    },
  },
  Det: {
    label: 'Determiner',
    category: 'function',
    zh: '限定词',
    explanation:
      'Points to which one — {zh:this} (this), 那 (that), 每 (every). It comes before the noun.',
    zhTokens: {
      this: { s: '这', t: '這' },
    },
  },
  Ptc: {
    label: 'Particle',
    category: 'function',
    zh: '助词',
    explanation:
      'A particle adds grammar meaning — {zh:ma} (question), 了 (done), 的 (possession).',
    zhTokens: {
      ma: { s: '吗', t: '嗎' },
    },
  },
  Conj: {
    label: 'Conjunction',
    category: 'function',
    zh: '连词',
    explanation: 'Joins words or sentences — 和 (and), 但是 (but).',
  },
  Prep: {
    label: 'Preposition',
    category: 'function',
    zh: '介词',
    explanation:
      'Links a noun to the rest of the sentence — 在 (at/in), {zh:from} (from), {zh:to} (to/for).',
    zhTokens: {
      from: { s: '从', t: '從' },
      to: { s: '给', t: '給' },
    },
  },
  Ph: {
    label: 'Phrase',
    category: 'phrase',
    zh: '短语',
    explanation:
      'A fixed group of words learned as one chunk — like {zh:no-problem} (no problem).',
    zhTokens: {
      'no-problem': { s: '没关系', t: '沒關係' },
    },
  },
  Num: {
    label: 'Numeral',
    category: 'other',
    zh: '数词',
    explanation: 'A number — like 三 (three).',
  },
};

/** Fallback for tags that are not (yet) in the map. */
export const POS_FALLBACK: PosInfo = {
  label: '',
  category: 'other',
  explanation:
    'A word class from your textbook. Open the word in the dictionary to see how it is used in sentences.',
};
