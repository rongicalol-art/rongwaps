/**
 * Lightweight, zero-dependency English stemmer, irregular lemma normalizer,
 * and semantic/colloquial concept expander for Chinese-English dictionary search.
 *
 * Maps inflected and derived English words to a canonical stem so queries like:
 * - "procrastination" / "procrastinating" / "procrastinated" -> "procrastin"
 * - "laziness" / "lazily" / "lazier" / "laziest" -> "lazi" (same as "lazy" -> "lazi")
 * - "swimming" / "swam" / "swum" -> "swim"
 * - "worried" / "worrying" / "worries" -> "worri" (same as "worry" -> "worri")
 * - "happiness" / "happily" -> "happi" (same as "happy" -> "happi")
 * match dictionary glosses regardless of part of speech or inflection.
 */

const IRREGULAR_LEMMAS: Record<string, string> = {
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  had: 'have', has: 'have', having: 'have',
  did: 'do', does: 'do', done: 'do',
  went: 'go', gone: 'go', goes: 'go', going: 'go',
  ate: 'eat', eaten: 'eat',
  drank: 'drink', drunk: 'drink',
  ran: 'run', running: 'run',
  swam: 'swim', swum: 'swim', swimming: 'swim',
  began: 'begin', begun: 'begin', beginning: 'begin',
  sang: 'sing', sung: 'sing',
  rang: 'ring', rung: 'ring',
  sank: 'sink', sunk: 'sink',
  stank: 'stink', stunk: 'stink',
  came: 'come', coming: 'come',
  became: 'become', becoming: 'become',
  saw: 'see', seen: 'see', seeing: 'see',
  took: 'take', taken: 'take', taking: 'take',
  gave: 'give', given: 'give', giving: 'give',
  knew: 'know', known: 'know',
  grew: 'grow', grown: 'grow',
  threw: 'throw', thrown: 'throw',
  flew: 'fly', flown: 'fly',
  drew: 'draw', drawn: 'draw',
  blew: 'blow', blown: 'blow',
  wrote: 'write', written: 'write', writing: 'write',
  rode: 'ride', ridden: 'ride', riding: 'ride',
  drove: 'drive', driven: 'drive', driving: 'drive',
  rose: 'rise', risen: 'rise', rising: 'rise',
  spoke: 'speak', spoken: 'speak',
  broke: 'break', broken: 'break',
  chose: 'choose', chosen: 'choose', choosing: 'choose',
  froze: 'freeze', frozen: 'freeze', freezing: 'freeze',
  stole: 'steal', stolen: 'steal',
  woke: 'wake', woken: 'wake', waking: 'wake',
  wore: 'wear', worn: 'wear',
  tore: 'tear', torn: 'tear',
  swore: 'swear', sworn: 'swear',
  bore: 'bear', borne: 'bear',
  forgot: 'forget', forgotten: 'forget', forgetting: 'forget',
  got: 'get', gotten: 'get', getting: 'get',
  bought: 'buy',
  brought: 'bring',
  fought: 'fight',
  thought: 'think',
  caught: 'catch',
  taught: 'teach',
  sought: 'seek',
  sold: 'sell',
  told: 'tell',
  held: 'hold',
  paid: 'pay',
  said: 'say',
  laid: 'lay',
  made: 'make', making: 'make',
  heard: 'hear',
  found: 'find',
  bound: 'bind',
  wound: 'wind',
  stood: 'stand',
  understood: 'understand',
  lost: 'lose', losing: 'lose',
  shot: 'shoot',
  led: 'lead',
  fed: 'feed',
  bled: 'bleed',
  fled: 'flee',
  met: 'meet',
  kept: 'keep',
  slept: 'sleep',
  swept: 'sweep',
  wept: 'weep',
  felt: 'feel',
  dealt: 'deal',
  meant: 'mean',
  sent: 'send',
  spent: 'spend',
  lent: 'lend',
  built: 'build',
  left: 'leave', leaving: 'leave',
  sat: 'sit', sitting: 'sit',
  won: 'win', winning: 'win',
  dug: 'dig', digging: 'dig',
  hung: 'hang',
  struck: 'strike', striking: 'strike',
  stuck: 'stick',
  stung: 'sting',
  swung: 'swing',
  shook: 'shake', shaken: 'shake', shaking: 'shake',
  mistook: 'mistake', mistaken: 'mistake',
  shone: 'shine', shining: 'shine',
  bit: 'bite', bitten: 'bite', biting: 'bite',
  hid: 'hide', hidden: 'hide', hiding: 'hide',
  fell: 'fall', fallen: 'fall',
  lay: 'lie', lain: 'lie', lying: 'lie',
  died: 'die', dying: 'die',
  tied: 'tie', tying: 'tie',
  children: 'child',
  men: 'man',
  women: 'woman',
  teeth: 'tooth',
  feet: 'foot',
  mice: 'mouse',
  geese: 'goose',
  knives: 'knife',
  wives: 'wife',
  lives: 'life',
  leaves: 'leaf',
  halves: 'half',
  wolves: 'wolf',
  thieves: 'thief',
  selves: 'self',
  loaves: 'loaf',
  better: 'good', best: 'good',
  worse: 'bad', worst: 'bad',
  farther: 'far', furthest: 'far', further: 'far',
  anger: 'angry', angrily: 'angry',
  hunger: 'hungry', hungrily: 'hungry',
  thirst: 'thirsty',
  success: 'succeed', successful: 'succeed', successfully: 'succeed',
  failure: 'fail',
  decision: 'decide',
  division: 'divide',
  collision: 'collide',
  explanation: 'explain',
  pronunciation: 'pronounce',
  solution: 'solve',
  resolution: 'resolve',
  description: 'describe',
  subscription: 'subscribe',
  prescription: 'prescribe',
  destruction: 'destroy',
  production: 'produce',
  reduction: 'reduce',
  introduction: 'introduce',
  choice: 'choose',
  loss: 'lose',
  speech: 'speak',
  growth: 'grow',
  knowledge: 'know',
  marriage: 'marry',
  laughter: 'laugh',
  complaint: 'complain',
  restraint: 'restrain',
  maintenance: 'maintain',
  abstinence: 'abstain',
  comparison: 'compare',
  pleasure: 'please', pleasant: 'please',
  clarity: 'clear', clarify: 'clear',
  simplicity: 'simple', simplify: 'simple',
  anxiety: 'anxious', anxiously: 'anxious',
  curiosity: 'curious', curiously: 'curious',
  generosity: 'generous', generously: 'generous',
  loneliness: 'lonely',
  boredom: 'bore', bored: 'bore', boring: 'bore',
  freedom: 'free', freely: 'free',
  wisdom: 'wise', wisely: 'wise',
};

/**
 * Semantic & colloquial concept bridge:
 * Maps everyday English / slang / phrasal queries to the canonical English glosses
 * that CEDICT and textbook definitions actually use.
 */
const SEMANTIC_SYNONYMS: Record<string, string[]> = {
  procrastinate: ['delay', 'postpone'],
  procrastination: ['procrastinate', 'delay', 'postpone'],
  dawdle: ['procrastinate', 'tarry', 'linger', 'dally'],
  slacker: ['lazy', 'idle', 'loaf'],
  slack: ['lazy', 'idle', 'negligent'],
  lazy: ['idle', 'indolent', 'slothful'],
  laziness: ['lazy', 'inertia', 'indolence'],
  brag: ['boast', 'show off'],
  bragging: ['boast', 'show off'],
  cringe: ['embarrassing', 'awkward'],
  awkward: ['embarrassed', 'uncomfortable'],
  burnout: ['exhausted', 'overworked', 'weary'],
  exhausted: ['tired', 'weary', 'fatigued'],
  tired: ['weary', 'exhausted', 'fatigued'],
  broke: ['penniless', 'poor', 'destitute'],
  ghost: ['ignore', 'disappear'],
  ghosted: ['ignore', 'cut off'],
  introvert: ['shy', 'reserved', 'introverted'],
  extrovert: ['outgoing', 'extroverted', 'sociable'],
  overthink: ['worry', 'anxious', 'brood'],
  hangry: ['hungry', 'irritable'],
  chill: ['relax', 'calm', 'casual'],
  stubborn: ['obstinate', 'headstrong'],
  cheapskate: ['stingy', 'miserly', 'miser'],
  stingy: ['miserly', 'tightfisted'],
  annoying: ['irritating', 'troublesome', 'tiresome'],
  annoyed: ['irritated', 'upset', 'vexed'],
  mad: ['angry', 'furious', 'crazy'],
  furious: ['angry', 'enraged', 'furious'],
  scared: ['afraid', 'frightened', 'fear'],
  afraid: ['scared', 'fear', 'frightened'],
  smart: ['clever', 'intelligent', 'bright'],
  dumb: ['stupid', 'foolish', 'silly'],
  stupid: ['foolish', 'silly', 'idiotic'],
  cute: ['adorable', 'lovely'],
  pretty: ['beautiful', 'handsome', 'attractive'],
  yummy: ['delicious', 'tasty'],
  delicious: ['tasty', 'appetizing'],
  gross: ['disgusting', 'nasty', 'repulsive'],
  disgusting: ['nauseating', 'revolting', 'gross'],
  fake: ['counterfeit', 'false', 'sham'],
  bossy: ['domineering', 'arrogant'],
  picky: ['fussy', 'fastidious', 'choosy'],
  clumsy: ['awkward', 'bungling'],
  chatty: ['talkative', 'garrulous'],
  nosy: ['meddlesome', 'prying', 'curious'],
  bathroom: ['toilet', 'restroom', 'lavatory'],
  restroom: ['toilet', 'bathroom', 'lavatory'],
  subway: ['metro', 'underground'],
  boba: ['bubble tea', 'pearl milk tea'],
  scooter: ['moped', 'motorcycle'],
  cab: ['taxi'],
  movie: ['film', 'cinema'],
  vacation: ['holiday'],
  holiday: ['vacation', 'festival'],
  apartment: ['flat'],
  trash: ['garbage', 'rubbish'],
  garbage: ['rubbish', 'trash', 'refuse'],
  elevator: ['lift'],
  fall: ['autumn', 'drop'],
  autumn: ['fall'],
  soccer: ['football'],
  cellphone: ['mobile phone', 'smartphone'],
  phone: ['telephone', 'mobile'],
  laptop: ['notebook computer'],
  fridge: ['refrigerator'],
  ac: ['air conditioning', 'air conditioner'],
  gym: ['fitness center', 'gymnasium'],
  workout: ['exercise', 'fitness'],
  diet: ['lose weight', 'slim'],
  hangover: ['hungover', 'drunk'],
  drunk: ['intoxicated', 'tipsy'],
  tipsy: ['slightly drunk', 'intoxicated'],
  crush: ['infatuated', 'secretly in love'],
  dump: ['break up', 'jilt', 'discard'],
  fiance: ['betrothed', 'engaged'],
  fiancee: ['betrothed', 'engaged'],
  coworker: ['colleague'],
  boss: ['manager', 'superior', 'employer'],
  quit: ['resign', 'give up', 'stop'],
  fired: ['dismiss', 'sack', 'lay off'],
  salary: ['wage', 'pay', 'income'],
  rent: ['lease', 'hire'],
  discount: ['rebate', 'sale'],
  receipt: ['invoice', 'bill'],
  change: ['alter', 'small change', 'modify'],
  fix: ['repair', 'mend', 'solve'],
  guess: ['suppose', 'conjecture', 'estimate'],
  chat: ['gossip', 'talk', 'converse'],
  argue: ['quarrel', 'dispute', 'bicker'],
  yell: ['shout', 'scream', 'scold'],
  cry: ['weep', 'sob'],
  laugh: ['smile', 'giggle', 'chuckle'],
  hurry: ['rush', 'hasten', 'urgent'],
  skip: ['omit', 'play truant', 'cut class'],
  cheat: ['deceive', 'swindle', 'unfaithful'],
  apologize: ['say sorry', 'excuse', 'apology'],
  forgive: ['pardon', 'excuse'],
  promise: ['vow', 'pledge', 'guarantee'],
  cancel: ['call off', 'abolish', 'revoke'],
  postpone: ['delay', 'put off', 'defer'],
  put_off: ['delay', 'postpone', 'procrastinate'],
  give_up: ['abandon', 'renounce', 'quit'],
  show_off: ['boast', 'flaunt', 'brag'],
  throw_up: ['vomit', 'puke'],
  pass_out: ['faint', 'lose consciousness'],
  freak_out: ['panic', 'lose control'],
  hang_out: ['stroll', 'get together', 'chat'],
  work_out: ['exercise', 'solve', 'succeed'],
  find_out: ['discover', 'ascertain', 'learn'],
  figure_out: ['understand', 'solve', 'work out'],
  look_for: ['search', 'seek', 'find'],
  take_care: ['look after', 'care for', 'beware'],
  run_out: ['exhaust', 'deplete', 'use up'],
};

const stemCache = new Map<string, string>();
const MAX_STEM_CACHE = 25000;

function isConsonant(word: string, i: number): boolean {
  const ch = word[i];
  if (ch === 'a' || ch === 'e' || ch === 'i' || ch === 'o' || ch === 'u') return false;
  if (ch === 'y') return i === 0 ? true : !isConsonant(word, i - 1);
  return true;
}

function hasVowel(stem: string): boolean {
  for (let i = 0; i < stem.length; i++) {
    if (!isConsonant(stem, i)) return true;
  }
  return false;
}

function undoubleFinalConsonant(w: string): string {
  if (w.length < 3) return w;
  const last = w[w.length - 1];
  const prev = w[w.length - 2];
  if (last === prev && isConsonant(w, w.length - 1) && last !== 'l' && last !== 's' && last !== 'z') {
    return w.slice(0, -1);
  }
  return w;
}

/**
 * Stems a single lowercase English word into a canonical derivational root.
 */
export function stemEnglishWord(raw: string): string {
  if (raw.length <= 2) return raw;
  const cached = stemCache.get(raw);
  if (cached !== undefined) return cached;

  let w = IRREGULAR_LEMMAS[raw] ?? raw;
  if (IRREGULAR_LEMMAS[w]) w = IRREGULAR_LEMMAS[w];

  // Step 1: Plurals and -ed/-ing
  if (w.endsWith('sses')) {
    w = w.slice(0, -2);
  } else if (w.endsWith('ies') && w.length > 4) {
    w = `${w.slice(0, -3)}i`;
  } else if (!w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.endsWith('s') && w.length > 3) {
    w = w.slice(0, -1);
  }

  if (w.endsWith('eed') && w.length > 4) {
    w = w.slice(0, -1);
  } else if (w.endsWith('ied') && w.length > 4) {
    w = `${w.slice(0, -3)}i`;
  } else if (w.endsWith('ed') && w.length > 4 && hasVowel(w.slice(0, -2))) {
    w = undoubleFinalConsonant(w.slice(0, -2));
  } else if (w.endsWith('ing') && w.length > 5 && hasVowel(w.slice(0, -3))) {
    w = undoubleFinalConsonant(w.slice(0, -3));
  }

  // Step 2: Derivational suffixes (-ation, -ition, -ness, -ment, -ful, -less, -able, -ible, -ly, -er, -est)
  const derivational: Array<[string, string, number]> = [
    ['ational', 'at', 7],
    ['fulness', '', 7],
    ['ousness', '', 7],
    ['iveness', '', 7],
    ['ization', 'iz', 7],
    ['isation', 'is', 7],
    ['ability', '', 7],
    ['ibility', '', 7],
    ['ation', 'at', 5],
    ['ition', 'it', 5],
    ['iness', 'i', 5],
    ['alize', 'al', 5],
    ['icate', 'ic', 5],
    ['ative', 'at', 5],
    ['ness', '', 4],
    ['ment', '', 4],
    ['able', '', 4],
    ['ible', '', 4],
    ['ally', '', 4],
    ['ily', 'i', 3],
    ['ier', 'i', 3],
    ['iest', 'i', 4],
    ['ful', '', 3],
    ['less', '', 4],
    ['ous', '', 3],
    ['ive', '', 3],
    ['ize', '', 3],
    ['ise', '', 3],
    ['ly', '', 2],
  ];

  for (const [suffix, replacement, minStem] of derivational) {
    if (w.endsWith(suffix) && w.length - suffix.length >= minStem) {
      const candidate = w.slice(0, -suffix.length) + replacement;
      if (hasVowel(candidate)) {
        w = undoubleFinalConsonant(candidate);
        break;
      }
    }
  }

  // Step 3: Strip trailing silent -e or -ate -> -at so "procrastinate" and "procrastination" both hit "procrastinat"
  if (w.endsWith('ate') && w.length > 5) {
    w = w.slice(0, -1);
  } else if (w.endsWith('e') && w.length > 3 && !w.endsWith('ee') && !w.endsWith('le') && hasVowel(w.slice(0, -1))) {
    w = w.slice(0, -1);
  }

  // Step 4: Normalize trailing -y to -i after consonant (lazy -> lazi, worry -> worri)
  if (w.endsWith('y') && w.length > 3 && isConsonant(w, w.length - 2)) {
    w = `${w.slice(0, -1)}i`;
  }

  if (stemCache.size >= MAX_STEM_CACHE) stemCache.clear();
  stemCache.set(raw, w);
  return w;
}

/**
 * Stems a multi-word or single-word English phrase into space-separated stems.
 */
export function stemEnglishPhrase(phrase: string): string {
  const words = phrase
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (words.length === 0) return '';
  return words.map(stemEnglishWord).join(' ');
}

/**
 * Returns stemmed semantic synonym expansions for an English query (single word or phrasal verb).
 */
export function getSemanticSynonymStems(queryLower: string): string[] {
  const normalizedKey = queryLower.trim().replace(/\s+/g, '_');
  const direct = SEMANTIC_SYNONYMS[normalizedKey] ?? SEMANTIC_SYNONYMS[queryLower];
  const lemma = IRREGULAR_LEMMAS[queryLower];
  const fromLemma = lemma ? SEMANTIC_SYNONYMS[lemma] : undefined;
  const rawList = [...(direct || []), ...(fromLemma || [])];
  if (rawList.length === 0) return [];
  const stems = new Set<string>();
  for (const syn of rawList) {
    const stemmed = stemEnglishPhrase(syn);
    if (stemmed) stems.add(stemmed);
  }
  return [...stems];
}
