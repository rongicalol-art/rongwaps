import { stripPinyinTones } from './pinyinNormalize';
import { escapeRegExp } from './escapeRegExp';
import { builtWith, type PartsIndex } from './parts';
import { sanitizeDictionaryDefinitions } from './dictionaryDefinitions';
import { getSemanticSynonymStems, stemEnglishPhrase, stemEnglishWord } from './englishStem';

export interface SearchResult {
  id: number;
  traditional: string;
  simplified: string;
  pinyin_accented: string;
  definitions: string[] | string;
  measure_words?: string[];
  courseDefinition?: string;
  bookId?: number; lessonId?: number; pos?: string; audio?: string;
  match_type: 'exact' | 'prefix' | 'partial';
  total_score: number;
}

// Compact tuple: [id, simplified, traditional (if diff else ''), pinyin_accented, pinyin_flat, definitions[], freq]
export type CompactSearchEntry = [number, string, string, string, string, string[], number];

interface PreparedGloss {
  raw: string;
  words: string[];
  stems: string[];
  stemmedPhrase: string;
  defIndex: number;
}

interface PreparedEntry {
  raw: CompactSearchEntry;
  trad: string;
  pinyinInitials: string;
  pinyinSyllables: string[];
  glosses: PreparedGloss[];
}

const preparedCache = new WeakMap<CompactSearchEntry[], Map<number, PreparedEntry>>();

const HANZI_REGEX = /\p{Script=Han}/u;
const HANZI_GLOBAL_REGEX = /\p{Script=Han}+/gu;
const VARIANT_STUB_RE = /^(?:old |archaic |Japanese )?variant of\b/i;

const TONE_CHAR_MAP: Record<string, number> = {
  ā: 1, á: 2, ǎ: 3, à: 4,
  ē: 1, é: 2, ě: 3, è: 4,
  ī: 1, í: 2, ǐ: 3, ì: 4,
  ō: 1, ó: 2, ǒ: 3, ò: 4,
  ū: 1, ú: 2, ǔ: 3, ù: 4,
  ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4,
};

const RADICAL_VARIANTS: Record<string, string[]> = {
  人: ['人', '亻'], 亻: ['亻', '人'],
  心: ['心', '忄'], 忄: ['忄', '心'],
  手: ['手', '扌'], 扌: ['扌', '手'],
  水: ['水', '氵'], 氵: ['氵', '水'],
  火: ['火', '灬'], 灬: ['灬', '火'],
  言: ['言', '讠', '訁'], 讠: ['讠', '言', '訁'],
  金: ['金', '钅', '釒'], 钅: ['钅', '金', '釒'],
  食: ['食', '饣', '飠'], 饣: ['饣', '食', '飠'],
  糸: ['糸', '纟', '糹'], 纟: ['纟', '糸', '糹'],
  艸: ['艸', '艹'], 艹: ['艹', '艸'],
  辵: ['辵', '辶'], 辶: ['辶', '辵'],
  刀: ['刀', '刂'], 刂: ['刂', '刀'],
  衣: ['衣', '衤'], 衤: ['衤', '衣'],
  示: ['示', '礻'], 礻: ['礻', '示'],
  犬: ['犬', '犭'], 犭: ['犭', '犬'],
  玉: ['玉', '王'],
};

function detectSyllableTone(accentedSyllable: string): number {
  for (const ch of accentedSyllable) {
    const t = TONE_CHAR_MAP[ch];
    if (t) return t;
  }
  const numMatch = accentedSyllable.match(/[1-5]$/);
  if (numMatch) return Number(numMatch[0]);
  return 5;
}

function extractPinyinSyllables(pinyinAccented: string): string[] {
  return pinyinAccented
    .split(/[\s,·]+/)
    .map((s) => stripPinyinTones(s))
    .filter(Boolean);
}

function prepareGlossesForDefs(defs: string[]): PreparedGloss[] {
  const result: PreparedGloss[] = [];
  for (let dIdx = 0; dIdx < defs.length; dIdx++) {
    const definition = defs[dIdx];
    if (VARIANT_STUB_RE.test(definition)) continue;
    const parts = definition
      .toLowerCase()
      .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
      .split(/[;,/]/);
    for (const part of parts) {
      const cleaned = part
        .replace(/^(?:to |an? |the |be )/, '')
        .replace(/[^a-z0-9' -]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
      if (!cleaned) continue;
      const words = cleaned.split(' ').filter(Boolean);
      const stems = words.map(stemEnglishWord);
      result.push({
        raw: cleaned,
        words,
        stems,
        stemmedPhrase: stems.join(' '),
        defIndex: dIdx,
      });
    }
  }
  return result;
}

function computePinyinInitials(py: string): string {
  let out = '';
  let atStart = true;
  for (let i = 0; i < py.length; i++) {
    const code = py.charCodeAt(i);
    if (code <= 32 || code === 44 || code === 183) {
      atStart = true;
      continue;
    }
    if (atStart) {
      const ch = py[i].toLowerCase().normalize('NFD')[0];
      if (ch >= 'a' && ch <= 'z') {
        out += ch;
        atStart = false;
      }
    }
  }
  return out;
}

function getPreparedEntry(
  index: CompactSearchEntry[],
  slots: Map<number, PreparedEntry>,
  idx: number,
): PreparedEntry {
  let entry = slots.get(idx);
  if (entry) return entry;
  const raw = index[idx];
  const [, s, t, py, , defs] = raw;
  const syllables = extractPinyinSyllables(py);
  entry = {
    raw,
    trad: t || s,
    pinyinSyllables: syllables,
    pinyinInitials: computePinyinInitials(py),
    glosses: prepareGlossesForDefs(defs),
  };
  slots.set(idx, entry);
  if (slots.size > 4096) slots.delete(slots.keys().next().value!);
  return entry;
}

function getPreparedSlots(index: CompactSearchEntry[]): Map<number, PreparedEntry> {
  let slots = preparedCache.get(index);
  if (!slots) {
    slots = new Map<number, PreparedEntry>();
    if (index.length > 500) {
      preparedCache.set(index, slots);
    }
  }
  return slots;
}

// ponytail: one typo in a single word only; broaden only with real failed queries.
function isOneTypo(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  if (a.length === b.length) {
    return a.slice(i + 1) === b.slice(i + 1)
      || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  }
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

/**
 * Parses explicit tone-numbered pinyin queries (e.g. "ma3", "ni3hao3", "tuo1 yan2")
 * into [{ base: 'ma', tone: 3 }, ...] so tone numbers filter exact tones when provided.
 */
function parseToneNumberedPinyin(rawQuery: string): Array<{ base: string; tone: number | null }> | null {
  if (!/[1-5]/.test(rawQuery) || HANZI_REGEX.test(rawQuery)) return null;
  const normalized = rawQuery.toLowerCase().replace(/u:/g, 'u').replace(/v/g, 'u').trim();
  if (!/^[a-z1-5\s']+$/i.test(normalized)) return null;
  const tokens: Array<{ base: string; tone: number | null }> = [];
  const re = /([a-z]+)([1-5])?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized)) !== null) {
    tokens.push({
      base: match[1],
      tone: match[2] ? Number(match[2]) : null,
    });
  }
  return tokens.length > 0 ? tokens : null;
}

function entryMatchesToneTokens(
  pinyinAccented: string,
  tokens: Array<{ base: string; tone: number | null }>,
): 'exact' | 'prefix' | null {
  const rawSyllables = pinyinAccented.split(/[\s,·]+/).filter(Boolean);
  if (rawSyllables.length < tokens.length) return null;
  for (let i = 0; i < tokens.length; i++) {
    const sylFlat = stripPinyinTones(rawSyllables[i]);
    const tok = tokens[i];
    const isLast = i === tokens.length - 1;
    if (tok.tone !== null) {
      if (sylFlat !== tok.base) return null;
      if (detectSyllableTone(rawSyllables[i]) !== tok.tone) return null;
    } else if (isLast && rawSyllables.length === tokens.length) {
      if (!sylFlat.startsWith(tok.base)) return null;
    } else if (sylFlat !== tok.base) {
      return null;
    }
  }
  if (
    rawSyllables.length === tokens.length &&
    stripPinyinTones(rawSyllables[rawSyllables.length - 1]) === tokens[tokens.length - 1].base
  ) {
    return 'exact';
  }
  return 'prefix';
}

function buildWildcardRegex(pattern: string): RegExp | null {
  if (!/[*?]/.test(pattern)) return null;
  const parts = Array.from(pattern).map((ch) => {
    if (ch === '*' || ch === '＊') return '.*';
    if (ch === '?' || ch === '？') return '.';
    return escapeRegExp(ch);
  });
  return new RegExp(`^${parts.join('')}$`, 'iu');
}

/**
 * Resolves a character-component query (e.g. "女 子", "女+子", "言+舌") against
 * the PartsIndex (`parts.json`) to find characters built from all specified parts.
 */
export function searchByCharacterComponents(
  index: CompactSearchEntry[] | null,
  partsIndex: PartsIndex | null,
  searchQuery: string,
  limit = 30,
): SearchResult[] {
  if (!index || !partsIndex) return [];
  const trimmed = searchQuery.trim();
  // Match space-separated or + separated single Hanzi components: e.g. "女 子" or "女+子"
  if (!/^[\p{Script=Han}](?:[\s+＋]+[\p{Script=Han}])+$/u.test(trimmed)) return [];
  const parts = trimmed.split(/[\s+＋]+/).filter(Boolean);
  if (parts.length < 2) return [];

  let intersection: Set<string> | null = null;
  for (const part of parts) {
    const variants = RADICAL_VARIANTS[part] ?? [part];
    const memberSet = new Set<string>();
    for (const v of variants) {
      for (const m of builtWith(v, partsIndex)) {
        memberSet.add(m.character);
      }
    }
    if (intersection === null) {
      intersection = memberSet;
    } else {
      const next = new Set<string>();
      for (const ch of intersection) {
        if (memberSet.has(ch)) next.add(ch);
      }
      intersection = next;
    }
  }

  if (!intersection || intersection.size === 0) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const [id, s, t, py, , defs, freq] of index) {
    const trad = t || s;
    if ((intersection.has(trad) || intersection.has(s)) && !seen.has(trad) && !seen.has(s)) {
      seen.add(trad);
      seen.add(s);
      const sanitized = sanitizeDictionaryDefinitions(defs);
      results.push({
        id,
        simplified: s,
        traditional: trad,
        pinyin_accented: py,
        definitions: sanitized.definitions,
        measure_words: sanitized.measure_words,
        match_type: 'exact',
        total_score: 5500 + Math.max(0, Math.min(100, freq)) * 4,
      });
    }
  }

  results.sort((a, b) => b.total_score - a.total_score);
  return results.slice(0, limit);
}

/**
 * Concatenated Pinyin sentence auto-splitter:
 * When a user types an unspaced multi-word Pinyin phrase (e.g. "wohenlei", "woyouyidianlei")
 * that has no single dictionary entry, segments it greedily into high-frequency words.
 */
export function segmentPinyinQuery(
  index: CompactSearchEntry[] | null,
  searchQuery: string,
  limit = 30,
): SearchResult[] {
  if (!index) return [];
  const flatQuery = stripPinyinTones(searchQuery);
  if (flatQuery.length < 5 || HANZI_REGEX.test(searchQuery)) return [];

  const bestByFlat = new Map<string, CompactSearchEntry>();
  for (const entry of index) {
    const [, s, , , flat, , freq] = entry;
    if (!flat || freq < 15) continue;
    const prev = bestByFlat.get(flat);
    if (
      !prev ||
      freq > prev[6] ||
      (freq === prev[6] && Array.from(s).length > Array.from(prev[1]).length)
    ) {
      bestByFlat.set(flat, entry);
    }
  }

  const results: SearchResult[] = [];
  const seen = new Set<string>();
  let pos = 0;
  while (pos < flatQuery.length && results.length < limit) {
    let matched: CompactSearchEntry | undefined;
    let matchedLen = 0;
    for (let len = Math.min(14, flatQuery.length - pos); len >= 2; len--) {
      const slice = flatQuery.slice(pos, pos + len);
      const candidate = bestByFlat.get(slice);
      if (candidate) {
        matched = candidate;
        matchedLen = len;
        break;
      }
    }
    if (!matched) {
      return [];
    }
    const [id, s, t, py, , defs, freq] = matched;
    const trad = t || s;
    if (!seen.has(s) && !seen.has(trad)) {
      seen.add(s);
      seen.add(trad);
      const sanitized = sanitizeDictionaryDefinitions(defs);
      results.push({
        id,
        simplified: s,
        traditional: trad,
        pinyin_accented: py,
        definitions: sanitized.definitions,
        measure_words: sanitized.measure_words,
        match_type: 'partial',
        total_score: 1800 - pos * 10 + freq,
      });
    }
    pos += matchedLen;
  }

  return results.length >= 2 ? results : [];
}

export function searchInIndex(
  index: CompactSearchEntry[] | null,
  searchQuery: string,
  resultLimit = 30,
  allowTypoFallback = true,
): SearchResult[] {
  const query = searchQuery.trim();
  if (!query || !index || resultLimit <= 0) return [];

  // 1. Pleco-style Wildcard Search (* and ? / ＊ and ？)
  if (/^[\p{Script=Han}a-zA-Z0-9*?＊？\s']+$/u.test(query) && /[*?＊？]/.test(query)) {
    const isHanziWildcard = HANZI_REGEX.test(query);
    const cleanPattern = isHanziWildcard ? query.replace(/\s+/g, '') : stripPinyinTones(query.replace(/[*?＊？]/g, (m) => m));
    const wildcardRe = buildWildcardRegex(isHanziWildcard ? cleanPattern : query.toLowerCase().trim());
    if (wildcardRe) {
      const wildcardMatches: SearchResult[] = [];
      const seen = new Set<string>();
      for (const [id, s, t, py, flat, defs, freq] of index) {
        const trad = t || s;
        const matched = isHanziWildcard
          ? wildcardRe.test(s) || wildcardRe.test(trad)
          : wildcardRe.test(flat) || wildcardRe.test(py.toLowerCase());
        if (matched && !seen.has(s) && !seen.has(trad)) {
          seen.add(s);
          seen.add(trad);
          const sanitized = sanitizeDictionaryDefinitions(defs);
          wildcardMatches.push({
            id,
            simplified: s,
            traditional: trad,
            pinyin_accented: py,
            definitions: sanitized.definitions,
            measure_words: sanitized.measure_words,
            match_type: 'exact',
            total_score: 5000 + Math.max(0, Math.min(100, freq)) * 4 - Array.from(s).length * 2,
          });
        }
      }
      wildcardMatches.sort((a, b) => b.total_score - a.total_score);
      return wildcardMatches.slice(0, resultLimit);
    }
  }

  // 2. Mixed Hanzi + Latin/English/Pinyin Query (e.g. "心 worried", "bu好", "言 delay")
  const hasHanzi = HANZI_REGEX.test(query);
  const hasLatin = /[a-zA-Z]/.test(query);
  if (hasHanzi && hasLatin) {
    const hanziParts = query.match(HANZI_GLOBAL_REGEX) ?? [];
    const latinPart = query.replace(HANZI_GLOBAL_REGEX, ' ').trim();
    if (hanziParts.length > 0 && latinPart.length > 0) {
      const candidates = index.filter(([, s, t]) => {
        const trad = t || s;
        return hanziParts.every((hp) => s.includes(hp) || trad.includes(hp));
      });
      const subResults = searchInIndex(candidates, latinPart, resultLimit, allowTypoFallback);
      if (subResults.length > 0) return subResults;
    }
  }

  const queryLower = query.toLowerCase().replace(/\s+/g, ' ').replace(/^(?:to |an? |the )/, '');
  const isHanzi = hasHanzi;
  const queryFlat = stripPinyinTones(query);
  const toneTokens = !isHanzi ? parseToneNumberedPinyin(query) : null;
  const queryStemmed = !isHanzi ? stemEnglishPhrase(queryLower) : '';
  const querySingleStem = !isHanzi && !queryLower.includes(' ') ? stemEnglishWord(queryLower) : '';
  const synonymStems = !isHanzi ? getSemanticSynonymStems(queryLower) : [];
  // Fast pre-filter prefix: the first 3 characters of the stem (or full stem for 2-3 char stems like "go"/"eat")
  // or any semantic synonym prefix must appear in the raw definition string before we tokenize/stem.
  const stemRootPrefix = querySingleStem.length >= 2
    ? querySingleStem.slice(0, Math.min(3, querySingleStem.length))
    : queryLower.slice(0, Math.min(3, queryLower.length));
  const synonymPrefixes = synonymStems.map((syn) => syn.slice(0, Math.min(3, syn.length))).filter((p) => p.length >= 2);
  const englishWord = new RegExp(`(?:^|[^a-z])${escapeRegExp(queryLower)}(?=$|[^a-z])`);
  const allowTypo = !isHanzi && /^[a-z]{5,}$/.test(queryLower);
  const matches: SearchResult[] = [];

  const slots = getPreparedSlots(index);

  for (let i = 0; i < index.length; i++) {
    const raw = index[i];
    const [id, s, t, py, flat, defs, freq] = raw;
    const trad = t || s;
    let matchType: SearchResult['match_type'] = 'partial';
    let tier = 0;
    let senseBonus = 0;

    if (isHanzi) {
      if (s === query || trad === query) {
        matchType = 'exact';
        tier = 6;
      } else if (s.startsWith(query) || trad.startsWith(query)) {
        matchType = 'prefix';
        tier = 4;
      } else if (s.includes(query) || trad.includes(query)) {
        tier = 2;
      }
    } else {
      // 1. Pinyin matching (tone-exact -> flat-exact -> syllable/flat prefix -> initialism jianpin)
      if (toneTokens) {
        const toneMatch = entryMatchesToneTokens(py, toneTokens);
        if (toneMatch === 'exact') {
          matchType = 'exact';
          tier = 6;
          senseBonus = Math.max(senseBonus, 180);
        } else if (toneMatch === 'prefix') {
          matchType = 'prefix';
          tier = 4;
          senseBonus = Math.max(senseBonus, 80);
        }
      } else if (queryFlat && flat === queryFlat) {
        matchType = 'exact';
        tier = 6;
        senseBonus = Math.max(senseBonus, 160);
      } else if (queryFlat && queryFlat.length >= 2 && flat.startsWith(queryFlat)) {
        matchType = 'prefix';
        tier = 3;
      } else if (
        queryFlat &&
        queryFlat.length >= 2 &&
        queryFlat.length <= 4 &&
        !queryLower.includes(' ') &&
        flat.startsWith(queryFlat[0]) &&
        Array.from(s).length === queryFlat.length
      ) {
        // Fast Jianpin initialism check (e.g. "nh" -> 你好, "tyz" -> 拖延症) without preparing English glosses
        if (computePinyinInitials(py) === queryFlat) {
          matchType = 'prefix';
          tier = Math.max(tier, 3);
        }
      }

      // 2. Fast pre-check before preparing English glosses:
      // Does any definition contain the stem root prefix, query substring, or semantic synonym prefix?
      let mightMatchEnglish = false;
      for (let d = 0; d < defs.length; d++) {
        const defLower = defs[d].toLowerCase();
        if (
          (stemRootPrefix && defLower.includes(stemRootPrefix)) ||
          defLower.includes(queryLower) ||
          (synonymPrefixes.length > 0 && synonymPrefixes.some((sp) => defLower.includes(sp)))
        ) {
          mightMatchEnglish = true;
          break;
        }
      }

      if (mightMatchEnglish) {
        const entry = getPreparedEntry(index, slots, i);
        const { glosses } = entry;
        for (let gIdx = 0; gIdx < glosses.length; gIdx++) {
          const g = glosses[gIdx];
          // Earlier definitions in the entry and shorter glosses get a specificity bonus
          const posWeight = Math.max(0, 18 - g.defIndex * 3 - Math.min(10, (g.words.length - 1) * 3));

          let gTier = 0;
          let gBonus = posWeight;

          if (g.raw === queryLower) {
            // Exact literal headword match ("procrastination" == "procrastination" or "to delay" == "delay")
            gTier = 6;
            gBonus += 160;
          } else if (queryStemmed.length >= 2 && g.stemmedPhrase === queryStemmed) {
            // Exact derivational/inflected headword match ("procrastination" <-> "to procrastinate", "went" <-> "to go")
            gTier = 6;
            gBonus += 85;
          } else if (queryLower.length >= 3 && englishWord.test(g.raw)) {
            // Exact word inside a multi-word gloss ("deliberate procrastination"); require >=3 chars so "nh" doesn't match "CO-NH"
            gTier = 5;
            gBonus += 60;
          } else if (
            synonymStems.length > 0 &&
            synonymStems.includes(g.stemmedPhrase)
          ) {
            // Semantic synonym headword match ("put off" -> "to delay" / "to procrastinate", "slacker" -> "lazy")
            gTier = 5;
            gBonus += 45;
          } else if (querySingleStem.length >= 3 && g.stems.includes(querySingleStem)) {
            // Stemmed word inside a multi-word gloss ("to obstruct and procrastinate")
            gTier = 4;
            gBonus += 40;
          } else if (
            queryLower.length >= 3 &&
            g.words.some((word) => word.startsWith(queryLower))
          ) {
            gTier = 3;
          }

          if (gTier > tier || (gTier === tier && gTier > 0 && gBonus > senseBonus)) {
            tier = gTier;
            senseBonus = gBonus;
            matchType = tier >= 5 ? 'exact' : tier >= 3 ? 'prefix' : 'partial';
          }
        }
      }
    }

    if (tier) {
      const sanitized = sanitizeDictionaryDefinitions(defs);
      // Brevity preference: 1-3 char core words beat 4+ char phrases when frequency is equal
      const charLen = Array.from(s).length;
      const brevityBonus = charLen <= 2 ? 25 : charLen === 3 ? 15 : 0;
      matches.push({
        id,
        simplified: s,
        traditional: trad,
        pinyin_accented: py,
        definitions: sanitized.definitions,
        measure_words: sanitized.measure_words,
        match_type: matchType,
        // Tier dominates; within the same tier, sense specificity + learner frequency rank the best translation first.
        total_score: tier * 1000 + senseBonus + Math.max(0, Math.min(100, freq)) * 4 + brevityBonus,
      });
    }
  }

  // Only run typo fallback if there were zero strong/prefix matches
  if (matches.length === 0 && allowTypo && allowTypoFallback) {
    for (let i = 0; i < index.length; i++) {
      const entry = getPreparedEntry(index, slots, i);
      const [id, s, , py, flat, defs, freq] = entry.raw;
      const hasTypo =
        isOneTypo(queryFlat, flat) ||
        entry.glosses.some((g) => g.words.some((word) => isOneTypo(queryLower, word)));
      if (hasTypo) {
        const sanitized = sanitizeDictionaryDefinitions(defs);
        matches.push({
          id,
          simplified: s,
          traditional: entry.trad,
          pinyin_accented: py,
          definitions: sanitized.definitions,
          measure_words: sanitized.measure_words,
          match_type: 'partial',
          total_score: 1000 + Math.max(0, Math.min(100, freq)),
        });
      }
    }
  }

  matches.sort((a, b) => b.total_score - a.total_score || a.simplified.length - b.simplified.length);
  const hasStrongMatches = matches.some((match) => match.total_score >= 2000);
  const seenWords = new Set<string>();
  return matches.filter((match) => {
    if ((hasStrongMatches && match.total_score < 2000) || seenWords.has(match.simplified) || seenWords.has(match.traditional)) return false;
    seenWords.add(match.simplified);
    seenWords.add(match.traditional);
    return true;
  }).slice(0, resultLimit);
}

/**
 * Pleco-style Chinese phrase/sentence segmentation fallback:
 * When a user pastes or types a multi-character Chinese phrase not in the dictionary
 * (e.g. "我有拖延症"), segments it into constituent dictionary words in reading order.
 */
export function segmentChineseQuery(
  index: CompactSearchEntry[] | null,
  query: string,
  limit: number,
): SearchResult[] {
  if (!index || Array.from(query).length < 2) return [];
  const hanziChars = Array.from(query).filter((ch) => HANZI_REGEX.test(ch));
  if (hanziChars.length < 2) return [];

  const byWord = new Map<string, CompactSearchEntry>();
  for (const entry of index) {
    const [, s, t, , , , freq] = entry;
    const trad = t || s;
    const prevS = byWord.get(s);
    if (!prevS || freq > prevS[6]) byWord.set(s, entry);
    const prevT = byWord.get(trad);
    if (!prevT || freq > prevT[6]) byWord.set(trad, entry);
  }

  // Greedy longest-prefix match (up to 4 chars) across the query
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  let pos = 0;
  while (pos < hanziChars.length && results.length < limit) {
    let matchedEntry: CompactSearchEntry | undefined;
    let matchedLen = 1;
    for (let len = Math.min(4, hanziChars.length - pos); len >= 1; len--) {
      const slice = hanziChars.slice(pos, pos + len).join('');
      const candidate = byWord.get(slice);
      if (candidate) {
        matchedEntry = candidate;
        matchedLen = len;
        break;
      }
    }
    if (matchedEntry) {
      const [id, s, t, py, , defs, freq] = matchedEntry;
      const trad = t || s;
      if (!seen.has(s) && !seen.has(trad)) {
        seen.add(s);
        seen.add(trad);
        const sanitized = sanitizeDictionaryDefinitions(defs);
        results.push({
          id,
          simplified: s,
          traditional: trad,
          pinyin_accented: py,
          definitions: sanitized.definitions,
          measure_words: sanitized.measure_words,
          match_type: 'partial',
          total_score: 1500 - pos * 10 + freq,
        });
      }
    }
    pos += matchedLen;
  }

  return results;
}
