export interface SanitizedDefinitions {
  definitions: string[];
  measure_words: string[];
}

export interface SanitizeDefinitionsOptions {
  /** Which side of a CEDICT 傳統|简体 classifier pair to keep. Defaults to traditional. */
  preferredScript?: 'traditional' | 'simplified';
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

function parseEncodedDefinitions(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
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

  let clean = parsed.map((definition) => {
    let text = definition;
    // Pull CEDICT classifier tokens (e.g. "(CL:場|场[chang2])") into measure
    // words before other cleanup, consuming their wrapping parentheses so no
    // classifier metadata leaks into the learner-facing text.
    text = text.replace(CLASSIFIER_TOKEN, (_match, wrapped?: string, bare?: string) => {
      const raw = wrapped ?? bare ?? '';
      raw.split(',').forEach((part) => {
        const formatted = formatClassifier(part, options.preferredScript);
        if (formatted) measureWords.push(formatted);
      });
      return '';
    });

    text = text.replace(/\((?:idiom|slang|dialect|coll\.|fig\.|lit\.)\)/gi, '');
    text = text.replace(/lit\.\s*/gi, '').replace(/esp\.\s*/gi, 'especially ');
    text = text.replace(/see (?:also )?(?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/(?:old |archaic )?variant of (?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/(?:old |archaic )?variant of \S+/gi, '');
    text = text.replace(/also written (?:\S+)?\[.*?\]/gi, '');
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
  // definitions that were purely classifier metadata.
  const hadOnlyClassifierMetadata = parsed.every((text) => /\bCL:/i.test(text));
  if (clean.length === 0 && parsed.length > 0 && !hadOnlyClassifierMetadata) clean = parsed;
  return {
    definitions: clean,
    measure_words: Array.from(new Set(measureWords)),
  };
}
