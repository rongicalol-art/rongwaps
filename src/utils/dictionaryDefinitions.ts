import { debugLogger } from './debugLogger';
import { numberToToneMarks } from './pinyin';

export interface MeasureWordDetail {
  char: string;
  /** Tone-marked reading from the CEDICT bracket (men2 → mén); empty when absent. */
  pinyin: string;
}

export interface SanitizedDefinitions {
  definitions: string[];
  measure_words: string[];
  /** Same measure words with their readings, for display. */
  measure_word_details: MeasureWordDetail[];
}

export interface SanitizeDefinitionsOptions {
  /** Which side of a CEDICT 傳統|简体 pair to keep. Defaults to traditional for classifiers, simplified for glosses. */
  preferredScript?: 'traditional' | 'simplified';
}

export interface CedictReference {
  relation: string;
  traditional: string;
  simplified: string;
  pinyin?: string;
  raw: string;
}

const CEDICT_REF_RE = /^(?:(old |archaic |popular )?variant of|used in|see(?: also)?|also written|same as)\s+([\p{Script=Han}]+)(?:\|([\p{Script=Han}]+))?(?:\[([^\]]+)\])?/iu;

/**
 * Extracts a CEDICT pointer reference (e.g. "variant of 令愛|令爱[ling4 ai4]",
 * "used in 令嬡|令嫒[ling4 ai4]", "see 丁青縣|丁青县[Ding1 qing1 Xian4]").
 */
export function extractCedictReference(value: unknown): CedictReference | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const match = trimmed.match(CEDICT_REF_RE);
  if (!match) return null;
  const traditional = match[2];
  const simplified = match[3] || match[2];
  const relation = trimmed.slice(0, trimmed.indexOf(traditional)).trim();
  return {
    relation,
    traditional,
    simplified,
    pinyin: match[4] ? numberToToneMarks(match[4]) : undefined,
    raw: match[0],
  };
}

/**
 * Converts machine-encoded CEDICT cross-references like "令愛|令爱[ling4 ai4]"
 * into learner-friendly text like "令爱 (lìng ài)".
 */
export function humanizeCedictMarkup(
  text: string,
  preferredScript: 'traditional' | 'simplified' = 'simplified',
): string {
  return text.replace(
    /([\p{Script=Han}]+)(?:\|([\p{Script=Han}]+))?(?:\[([^\]]+)\])?/gu,
    (match, word1: string, word2?: string, pinyin?: string) => {
      if (!word2 && !pinyin) return match;
      const chosen = (word2 && preferredScript === 'simplified') ? word2 : word1;
      const formattedPinyin = pinyin ? numberToToneMarks(pinyin) : '';
      return formattedPinyin ? `${chosen} (${formattedPinyin})` : chosen;
    },
  );
}

/**
 * Formats a concise 1-2 word gloss for compact mobile chips (such as
 * the 2-column breakdown tree in summary mode) so words never clip mid-word
 * into ellipses like "woman, girl; fe..." or "to love, t...".
 */
export function formatCompactMeaning(meaning?: string): string {
  if (!meaning) return '';
  const cleaned = meaning.trim();
  const firstSemicolon = cleaned.split(';')[0]?.trim() || cleaned;
  if (firstSemicolon.length <= 22) return firstSemicolon;
  const firstComma = firstSemicolon.split(',')[0]?.trim() || firstSemicolon;
  if (firstComma.length <= 26) return firstComma;
  return `${firstComma.slice(0, 25).trimEnd()}…`;
}

/** Matches "(CL:…)" or bare "CL:…" tokens, stopping before ";", ")" or end. */
const CLASSIFIER_TOKEN = /\(\s*CL:\s*([^;)]+?)\s*\)|CL:\s*([^;)]+?)(?=[;)]|$)/gi;

function formatClassifier(value: string, preferredScript?: 'traditional' | 'simplified'): string {
  const parts = value.split('|').map((part) => part.trim()).filter(Boolean);
  const chosen = parts.length > 1
    ? preferredScript === 'simplified' ? parts[1] : parts[0]
    : parts[0] ?? '';
  // Drop CEDICT pronunciation brackets: 场[chang2] → 场
  return chosen.replace(/\[[^\]]*\]/g, '').trim();
}

function classifierPinyin(value: string): string {
  const match = /\[([^\]]*)\]/.exec(value);
  return match ? numberToToneMarks(match[1].trim()) : '';
}

/** Removes parentheses left unbalanced by metadata removal. */
function tidyUnbalancedParens(text: string): string {
  let openCount = 0;
  let out = '';
  for (const char of text) {
    if (char === '(') {
      openCount += 1;
    } else if (char === ')') {
      if (openCount === 0) continue;
      openCount -= 1;
    }
    out += char;
  }
  while (openCount > 0 && /\(\s*$/.test(out)) {
    out = out.replace(/\s*\($/, '');
    openCount -= 1;
  }
  return out;
}

/**
 * Start of a serialized JSON array/object. A bare leading bracket isn't
 * enough: CEDICT reading lines like "[xīn]: new, newly" are plain text.
 */
const ENCODED_DEFINITIONS_START = /^(?:\[\s*["{[\]]|\{\s*["}])/;

function parseEncodedDefinitions(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!ENCODED_DEFINITIONS_START.test(trimmed)) return value;

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    // Intentional fallback: unparseable string is treated as plain text definition
    debugLogger.warn('App', 'Encoded dictionary definitions unparseable; treated as plain text', error);
    return value;
  }
}

function definitionStrings(value: unknown): string[] {
  const parsed = parseEncodedDefinitions(value);
  if (Array.isArray(parsed)) {
    return parsed.flatMap((item) => definitionStrings(item));
  }
  if (parsed && typeof parsed === 'object') {
    if ('meaning' in parsed && typeof parsed.meaning === 'string') return [parsed.meaning];
    return Object.values(parsed).flatMap((item) => definitionStrings(item));
  }
  return typeof parsed === 'string' ? [parsed] : [];
}

export function sanitizeDictionaryDefinitions(
  value: unknown,
  options: SanitizeDefinitionsOptions = {},
): SanitizedDefinitions {
  const parsed = definitionStrings(value);
  const measureWords: string[] = [];
  const measureDetails: MeasureWordDetail[] = [];

  let clean = parsed.map((definition) => {
    let text = definition;
    // Pull CEDICT classifier tokens (e.g. "(CL:場|场[chang2])") into measure
    // words before other cleanup, consuming their wrapping parentheses so no
    // classifier metadata leaks into the learner-facing text.
    text = text.replace(CLASSIFIER_TOKEN, (_match, wrapped?: string, bare?: string) => {
      const raw = wrapped ?? bare ?? '';
      raw.split(',').forEach((part) => {
        const formatted = formatClassifier(part, options.preferredScript);
        if (formatted) {
          measureWords.push(formatted);
          measureDetails.push({ char: formatted, pinyin: classifierPinyin(part) });
        }
      });
      return '';
    });

    text = text.replace(/\((?:idiom|slang|dialect|coll\.|fig\.|lit\.)\)/gi, '');
    text = text.replace(/lit\.\s*/gi, '').replace(/esp\.\s*/gi, 'especially ');

    // If text is purely a cross-reference pointer, humanize it instead of stripping to empty
    const isPureRef = Boolean(extractCedictReference(text));
    if (!isPureRef) {
      text = text.replace(/see (?:also )?(?:\S+)?\[.*?\]/gi, '');
      text = text.replace(/(?:old |archaic )?variant of (?:\S+)?\[.*?\]/gi, '');
      text = text.replace(/(?:old |archaic )?variant of \S+/gi, '');
      text = text.replace(/also written (?:\S+)?\[.*?\]/gi, '');
    }

    text = humanizeCedictMarkup(text, options.preferredScript);
    text = text.replace(/classifier for/gi, 'measure word for');
    text = tidyUnbalancedParens(text.replace(/\(\s*\)/g, ''));
    return text.replace(/\s+/g, ' ').replace(/^\s*[,;]\s*/, '').replace(/\s*[,;]\s*$/, '').trim();
  });

  clean = Array.from(new Set(clean.filter((definition) =>
    definition.length > 0 &&
    !/^surname\b/i.test(definition) &&
    !/\(surname\)/i.test(definition)
  )));

  // Last-resort fallback for unknown encodings — but never resurrect
  // raw machine markup or definitions that were purely classifier metadata.
  const hadOnlyClassifierMetadata = parsed.every((text) => /\bCL:/i.test(text));
  if (clean.length === 0 && parsed.length > 0 && !hadOnlyClassifierMetadata) {
    clean = parsed
      .map((item) => humanizeCedictMarkup(String(item), options.preferredScript).trim())
      .filter((item) => item.length > 0);
  }
  return {
    definitions: clean,
    measure_words: Array.from(new Set(measureWords)),
    measure_word_details: measureDetails.filter(
      (detail, index) => measureDetails.findIndex((other) => other.char === detail.char) === index,
    ),
  };
}

/** Leading CEDICT labels that mark a sense as vulgar, slang or a fad coinage. */
const NOISY_LABEL_RE = /^\s*(?:\([^)]*\)\s*)*\([^)]*\b(?:vulgar|slang|neologism|derog\w*|offensive|obscene|pejorative)\b[^)]*\)/i;
const PROFANITY_RE = /\b(?:fuck\w*|shit\w*|bitch\w*|cunt|dick|asshole)\b/i;

/**
 * Unlabelled transliterations CC-CEDICT gives no tag for, so no rule can
 * catch them (嗎哪 "manna"). Add owner-reviewed words here.
 */
const HIDDEN_SUGGESTIONS = new Set(['嗎哪']);

/**
 * True for a dictionary word a learner should not be offered as a "word with
 * this character": its leading label marks it vulgar, slang or a neologism,
 * it is explicit profanity, or it is on the reviewed hide list. Only meant for
 * dictionary-only suggestions; course words are never filtered.
 */
export function isNoisyDictionarySuggestion(word: string, definition: string | null | undefined): boolean {
  if (HIDDEN_SUGGESTIONS.has(word)) return true;
  if (!definition) return false;
  return NOISY_LABEL_RE.test(definition) || PROFANITY_RE.test(definition);
}

/** Checks whether a definition is purely a variant / archaic pointer without distinct gloss. */
export function isPureVariantDefinition(value: unknown): boolean {
  const strings = definitionStrings(value);
  if (strings.length === 0) return false;
  return strings.every((text) => /^(?:old |archaic |popular )?variant of /i.test(text.trim()));
}


