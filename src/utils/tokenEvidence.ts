/**
 * Token-context evidence matching, shared by the grammar "used here" rules
 * (`grammarUsageRules`) and the reader's vocabulary sense rules
 * (`vocabularySenseRules`).
 *
 * Evidence matches sentence by sentence on the reader's own word segmentation
 * (`segmentReadingSentences` in `grammarUsage`), never on raw substrings, so a
 * badge can never fire inside a longer word. Matches report the token span they
 * cover so the reader can highlight the clause that actually carries the
 * pattern.
 */

/** Separator used when a rule matches against a joined token stream. */
export const USAGE_TOKEN_SEPARATOR = '\u0001';

export interface TokenEvidenceGuards {
  /** Tokens that must not sit immediately before the first matched token. */
  notAfter?: string[];
  /** Tokens that must not sit immediately after the last matched token. */
  notBefore?: string[];
}

export type TokenEvidence =
  | ({ kind: 'inOrder'; tokens: string[]; maxGap?: number } & TokenEvidenceGuards)
  | ({ kind: 'sentenceFinal'; tokens: string[] } & TokenEvidenceGuards)
  | {
      kind: 'reduplication';
      /** A reduplicated pair only counts when one of these tokens is in the sentence too. */
      besideAnyOf?: string[];
      /** Optional tokens allowed between the two halves (e.g. 一 in V一V). */
      separators?: string[];
    }
  | { kind: 'aNotA' }
  /** Matches a token that ends with one of these characters (e.g. 拿著 for 著). */
  | { kind: 'tokenEndsWith'; characters: string[]; except?: string[] }
  | { kind: 'regex'; source: string };

/** The token indexes an evidence match covers (start inclusive, end exclusive). */
export interface TokenEvidenceMatch {
  start: number;
  end: number;
}

/** Extra structure a matcher may need beyond the flat token list. */
export interface TokenEvidenceOptions {
  /** Token indexes that begin a new clause; reduplication never crosses one. */
  clauseStartTokens?: ReadonlySet<number>;
}

const CJK_TOKEN = /^[\u3400-\u9fff\uf900-\ufaff]+$/;
/** Tokens that may repeat for reasons other than verb reduplication. */
const NON_REDUPLICABLE = new Set([
  '不', '很', '太', '都', '也', '了', '的', '是', '有', '再',
  '爸爸', '媽媽', '哥哥', '弟弟', '姐姐', '妹妹', '星星', '常常',
  '剛剛', '慢慢', '天天', '種種', '每個', '各種',
]);

const globalRegexCache = new Map<string, RegExp>();

function compiledGlobal(source: string): RegExp {
  const cached = globalRegexCache.get(source);
  if (cached) return cached;
  const next = new RegExp(source, 'g');
  globalRegexCache.set(source, next);
  return next;
}

function guardsPass(
  sentence: readonly string[],
  first: number,
  last: number,
  guards: TokenEvidenceGuards,
): boolean {
  if (guards.notAfter?.length && first > 0 && guards.notAfter.includes(sentence[first - 1])) {
    return false;
  }
  if (
    guards.notBefore?.length &&
    last + 1 < sentence.length &&
    guards.notBefore.includes(sentence[last + 1])
  ) {
    return false;
  }
  return true;
}

function matchInOrderFrom(
  sentence: readonly string[],
  tokens: string[],
  maxGap: number,
  guards: TokenEvidenceGuards,
  from: number,
): TokenEvidenceMatch | null {
  for (let start = from; start + tokens.length <= sentence.length; start += 1) {
    if (sentence[start] !== tokens[0]) continue;
    let cursor = start;
    let ok = true;
    for (let index = 1; index < tokens.length; index += 1) {
      let found = -1;
      for (let probe = cursor + 1; probe < sentence.length && probe - cursor <= maxGap; probe += 1) {
        if (sentence[probe] === tokens[index]) {
          found = probe;
          break;
        }
      }
      if (found === -1) {
        ok = false;
        break;
      }
      cursor = found;
    }
    if (ok && guardsPass(sentence, start, cursor, guards)) {
      return { start, end: cursor + 1 };
    }
  }
  return null;
}

function matchInOrderAll(
  sentence: readonly string[],
  tokens: string[],
  maxGap: number,
  guards: TokenEvidenceGuards,
): TokenEvidenceMatch[] {
  const matches: TokenEvidenceMatch[] = [];
  let from = 0;
  for (;;) {
    const match = matchInOrderFrom(sentence, tokens, maxGap, guards, from);
    if (!match) break;
    matches.push(match);
    from = match.end;
  }
  return matches;
}

function matchReduplicationAll(
  sentence: readonly string[],
  evidence: Extract<TokenEvidence, { kind: 'reduplication' }>,
  options: TokenEvidenceOptions,
): TokenEvidenceMatch[] {
  const besideMatches = () =>
    !evidence.besideAnyOf?.length ||
    sentence.some((token) => evidence.besideAnyOf?.some((beside) => token.includes(beside)));
  if (!besideMatches()) return [];

  const matches: TokenEvidenceMatch[] = [];
  let index = 0;
  while (index < sentence.length) {
    const token = sentence[index];
    let match: TokenEvidenceMatch | null = null;

    // Split pairs (看看 as two tokens). The pair must stay inside one clause:
    // 台灣，台灣 and 給你，你看到 are two adjacent tokens, not reduplication.
    if (CJK_TOKEN.test(token) && !NON_REDUPLICABLE.has(token) && token.length >= 1) {
      const separator = evidence.separators?.includes(sentence[index + 1] ?? '')
        ? sentence[index + 1]
        : undefined;
      const second = index + (separator ? 2 : 1);
      const crossesClause = options.clauseStartTokens?.has(second) ?? false;
      if (!crossesClause && token === sentence[second]) {
        match = { start: index, end: index + (separator ? 3 : 2) };
      }
    }

    // Packed pairs (看看 as one token).
    if (!match && token.length === 2 && CJK_TOKEN.test(token) && !NON_REDUPLICABLE.has(token)) {
      if (token[0] === token[1]) match = { start: index, end: index + 1 };
    }

    if (match) {
      matches.push(match);
      index = match.end;
      continue;
    }
    index += 1;
  }
  return matches;
}

/** Maps a match on the separator-joined token stream back to token indexes. */
function tokenSpanForJoinedMatch(
  tokens: readonly string[],
  match: RegExpExecArray,
): TokenEvidenceMatch {
  const starts: number[] = [];
  let position = 0;
  for (const token of tokens) {
    starts.push(position);
    position += token.length + USAGE_TOKEN_SEPARATOR.length;
  }
  const from = match.index;
  const to = from + match[0].length;

  let start = tokens.length - 1;
  for (let index = 0; index < tokens.length; index += 1) {
    if (starts[index] + tokens[index].length > from) {
      start = index;
      break;
    }
  }
  let end = start + 1;
  for (let index = start; index < tokens.length; index += 1) {
    if (starts[index] < to) end = index + 1;
    else break;
  }
  return { start, end: Math.max(end, start + 1) };
}

const A_NOT_A_SOURCE = `(?:^|${USAGE_TOKEN_SEPARATOR})([^${USAGE_TOKEN_SEPARATOR}]+)${USAGE_TOKEN_SEPARATOR}(?:不|沒)${USAGE_TOKEN_SEPARATOR}\\1(?=${USAGE_TOKEN_SEPARATOR}|$)`;

/**
 * Every non-overlapping match of a joined-stream regex, mapped back to token
 * spans. A match that consumed its trailing separator rewinds one character so
 * the next occurrence can still use that separator as its leading boundary.
 */
function matchRegexAll(sentence: readonly string[], source: string): TokenEvidenceMatch[] {
  const joined = sentence.join(USAGE_TOKEN_SEPARATOR);
  const pattern = compiledGlobal(source);
  pattern.lastIndex = 0;
  const matches: TokenEvidenceMatch[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(joined)) !== null) {
    matches.push(tokenSpanForJoinedMatch(sentence, match));
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }
    let next = match.index + match[0].length;
    if (match[0].endsWith(USAGE_TOKEN_SEPARATOR)) next -= 1;
    pattern.lastIndex = next > match.index ? next : match.index + 1;
  }
  return matches;
}

/**
 * Every token span the authored evidence matches in one sentence. Rules run on
 * the whole sentence, so a sentence that uses the pattern twice (several clock
 * times, two 的 phrases, two V過 forms) reports both.
 */
export function matchAllTokenEvidence(
  sentence: readonly string[],
  evidence: TokenEvidence,
  options: TokenEvidenceOptions = {},
): TokenEvidenceMatch[] {
  switch (evidence.kind) {
    case 'inOrder':
      return matchInOrderAll(sentence, evidence.tokens, evidence.maxGap ?? 3, evidence);
    case 'sentenceFinal': {
      const last = sentence.length - 1;
      if (last < 0 || !evidence.tokens.includes(sentence[last])) return [];
      return guardsPass(sentence, last, last, evidence) ? [{ start: last, end: last + 1 }] : [];
    }
    case 'reduplication':
      return matchReduplicationAll(sentence, evidence, options);
    case 'tokenEndsWith': {
      const matches: TokenEvidenceMatch[] = [];
      for (let index = 0; index < sentence.length; index += 1) {
        const token = sentence[index];
        if (!CJK_TOKEN.test(token) || evidence.except?.includes(token)) continue;
        if (
          evidence.characters.includes(token) ||
          (token.length > 1 && evidence.characters.some((char) => token.endsWith(char)))
        ) {
          matches.push({ start: index, end: index + 1 });
        }
      }
      return matches;
    }
    case 'aNotA':
      return matchRegexAll(sentence, A_NOT_A_SOURCE);
    case 'regex':
      return matchRegexAll(sentence, evidence.source);
  }
}

/** The first token span an authored evidence rule matches, or null when it does not. */
export function matchTokenEvidence(
  sentence: readonly string[],
  evidence: TokenEvidence,
  options: TokenEvidenceOptions = {},
): TokenEvidenceMatch | null {
  return matchAllTokenEvidence(sentence, evidence, options)[0] ?? null;
}

/** True when the sentence's token stream satisfies the authored evidence. */
export function matchesTokenEvidence(
  sentence: readonly string[],
  evidence: TokenEvidence,
  options: TokenEvidenceOptions = {},
): boolean {
  return matchAllTokenEvidence(sentence, evidence, options).length > 0;
}
