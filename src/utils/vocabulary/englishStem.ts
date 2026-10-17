/**
 * Lightweight, zero-dependency English stemmer & irregular lemma normalizer
 * for Chinese-English dictionary search.
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
  sat: 'sat', sitting: 'sit',
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
  // Normalize trailing 'y' to 'i' when preceded by consonant on words > 3 chars (lazy -> lazi, happy -> happi)
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
    w = w.slice(0, -1); // procrastinate -> procrastinat (matches procrastin+ation -> procrastinat)
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
