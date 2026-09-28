// Optional-group expansion is capped so a pathological entry cannot explode
// into hundreds of forms; beyond the cap only all-on and all-off are kept.
const MAX_OPTIONAL_GROUPS = 3;

/**
 * Expand the optional groups of one slash-free form. Notation is ASCII after
 * NFKC normalization: `(一)點(兒)` means 一 and 兒 are optional, so every
 * combination is a real spoken form (一點兒, 一點, 點兒, 點).
 */
function expandOptionalGroups(form: string): string[] {
  const segments: string[] = [];
  let buffer = '';
  let index = 0;
  while (index < form.length) {
    if (form[index] === '(') {
      const close = form.indexOf(')', index + 1);
      if (close === -1) {
        buffer += form.slice(index);
        break;
      }
      segments.push(buffer);
      buffer = '';
      segments.push(form.slice(index + 1, close));
      index = close + 1;
    } else {
      buffer += form[index];
      index += 1;
    }
  }
  segments.push(buffer);

  const groupCount = (segments.length - 1) / 2;
  if (groupCount === 0) return [form];

  const forms = new Set<string>();
  if (groupCount > MAX_OPTIONAL_GROUPS) {
    // Too many combinations: keep the full form and the bare core only.
    forms.add(segments.join(''));
    forms.add(segments.filter((_, i) => i % 2 === 0).join(''));
  } else {
    for (let mask = 0; mask < 1 << groupCount; mask += 1) {
      let combined = '';
      for (let i = 0; i < segments.length; i += 1) {
        if (i % 2 === 0) combined += segments[i];
        else if (mask & (1 << ((i - 1) / 2))) combined += segments[i];
      }
      if (combined) forms.add(combined);
    }
  }
  return Array.from(forms);
}

/**
 * Expand a raw vocabulary form into every searchable variant.
 *
 * Notation handled:
 * - `/` means "or": 腳踏車/自行車 → both forms (multi-way and mixed scripts
 *   like 臺灣/台灣/台湾 are supported).
 * - `(...)` means "optional": 有(一)點(兒) → 有一點兒, 有一點, 有點兒, 有點.
 * - Combined forms: 車(子)/汽車 → 車子, 汽車, 車.
 *
 * Everything else (～, 、, …, ASCII letters) is kept literally. Returns
 * longest-first so callers that scan for "the form actually present" hit the
 * most specific match first.
 */
export function extractSearchVariants(word: string): string[] {
  if (!word) return [];
  const variants = new Set<string>();
  const parts = word.normalize('NFKC').split('/').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    for (const form of expandOptionalGroups(part)) {
      if (form) variants.add(form);
    }
  }
  return Array.from(variants).sort((a, b) => b.length - a.length);
}

/**
 * Every search form for a flashcard: the raw traditional and simplified forms
 * as authored (both scripts must be searched — a simplified sentence will
 * never contain the traditional form), plus the display front as a fallback.
 * Fully expanded and deduplicated, longest-first.
 */
export function extractWordVariants(front: string, traditional?: string, simplified?: string): string[] {
  const variants = new Set<string>();
  for (const form of [traditional, simplified, front]) {
    if (!form) continue;
    for (const variant of extractSearchVariants(form)) variants.add(variant);
  }
  return Array.from(variants).sort((a, b) => b.length - a.length);
}

/**
 * True when the sentence uses the word: it contains one of the expanded forms,
 * or — for separable verb-object cards (`pos` = `V-sep`, e.g. 找錢, 放假) — the
 * verb and the object appear in order, as in 找您七百八十五塊錢 and 放四天假.
 * The split form is only tried for V-sep cards, so ordinary words keep exact
 * block matching.
 */
export function sentenceMatchesForms(
  sentence: string | undefined,
  forms: readonly string[],
  pos?: string,
): boolean {
  if (!sentence) return false;
  if (forms.some((form) => form && sentence.includes(form))) return true;
  if (pos !== 'V-sep') return false;
  return forms.some((form) => {
    if (form.length < 2) return false;
    const verb = form.slice(0, 1);
    const object = form.slice(1);
    const verbIndex = sentence.indexOf(verb);
    return verbIndex !== -1 && sentence.indexOf(object, verbIndex + verb.length) !== -1;
  });
}
