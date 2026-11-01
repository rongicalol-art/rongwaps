/**
 * "Only words the learner has met": the one owner of the taught-word rule for authored content
 * (book exercises and lesson tests). Pure helpers; the content tests build the taught set from the packs.
 */

/** Book order of a vocabulary id (B1L01-2-06 → lesson 1, part 2 → 12). */
export function vocabOrder(id: string): number {
  const match = /^B\d+L(\d+)-(\d+)/.exec(id);
  return match ? Number(match[1]) * 10 + Number(match[2]) : Infinity;
}

/** Book number of a vocabulary id (B3L05-1-02 → 3). */
export function vocabBook(id: string): number {
  const match = /^B(\d+)L/.exec(id);
  return match ? Number(match[1]) : Infinity;
}

/** "（一）點（兒）" → 點, 一點, 點兒, 一點兒; "臺灣/台灣" → both. */
export function vocabForms(entry: string): string[] {
  return entry.split(/[/／]/).flatMap((form) => {
    const optional = [...form.matchAll(/（([^）]*)）/g)].map((match) => match[0]);
    let variants = [form];
    for (const part of optional) variants = variants.flatMap((variant) => [variant.replace(part, ''), variant.replace(part, part.slice(1, -1))]);
    return variants.map((variant) => variant.trim()).filter(Boolean);
  });
}

/** Numerals any lesson may use. */
export const NUMERAL_CHARACTERS = [...'〇一二三四五六七八九十百千萬兩'];

const HAN = /\p{Script=Han}/u;

/**
 * The Han runs of `text` that no taught word covers, matched greedily from the longest word (6 characters)
 * down to one, so 牛肉麵 counts as one word and a stray character is reported once.
 */
export function untaughtCharacters(text: string, taught: ReadonlySet<string>): string[] {
  const chars = [...text];
  const problems: string[] = [];
  for (let index = 0; index < chars.length;) {
    if (!HAN.test(chars[index])) { index += 1; continue; }
    const length = [6, 5, 4, 3, 2, 1].find((size) => taught.has(chars.slice(index, index + size).join('')));
    if (!length) {
      problems.push(chars[index]);
      index += 1;
    } else index += length;
  }
  return problems;
}

/** Every `traditional` string inside a JSON value (the text a learner reads or hears). */
export function traditionalStrings(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) value.forEach((entry) => traditionalStrings(entry, out));
  else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'traditional' && typeof entry === 'string') out.push(entry);
      else traditionalStrings(entry, out);
    }
  }
  return out;
}
