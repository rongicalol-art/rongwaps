export interface SanitizedDefinitions {
  definitions: string[];
  measure_words: string[];
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

export function sanitizeDictionaryDefinitions(value: unknown): SanitizedDefinitions {
  const parsed = definitionStrings(value);
  const measureWords: string[] = [];

  let clean = parsed.map((definition) => {
    let text = definition;
    const classifierMatch = text.match(/CL:([^;$]+)/i);
    if (classifierMatch?.[1]) {
      measureWords.push(...classifierMatch[1].split(',').map((word) => word.trim()).filter(Boolean));
    }

    text = text.replace(/(?:^|;?\s*)CL:[^;$]+(?:;|$)/gi, '');
    text = text.replace(/\((?:idiom|slang|dialect|coll\.|fig\.|lit\.)\)/gi, '');
    text = text.replace(/lit\.\s*/gi, '').replace(/esp\.\s*/gi, 'especially ');
    text = text.replace(/see (?:also )?(?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/(?:old |archaic )?variant of (?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/(?:old |archaic )?variant of \S+/gi, '');
    text = text.replace(/also written (?:\S+)?\[.*?\]/gi, '');
    text = text.replace(/classifier for/gi, 'measure word for');
    return text.replace(/\s+/g, ' ').replace(/^\s*[,;]\s*/, '').replace(/\s*[,;]\s*$/, '').trim();
  });

  clean = Array.from(new Set(clean.filter((definition) =>
    definition.length > 0 &&
    !/^surname\b/i.test(definition) &&
    !/\(surname\)/i.test(definition)
  )));

  if (clean.length === 0 && parsed.length > 0) clean = parsed;
  return {
    definitions: clean,
    measure_words: Array.from(new Set(measureWords)),
  };
}
