/**
 * Lays out a book grammar explanation without changing its words: numbered points ((1), （1）, ①,
 * "1." at a line start) become their own blocks, and example sentences after "For example," /
 * "e.g.," / 例如 / 比如, or a book "wrong" sentence marked with *, move onto their own lines.
 * Anything that does not parse cleanly stays as written.
 */

export interface ExplanationExample {
  text: string;
  /** The book's English translation printed in brackets after the sentence. */
  translation?: string;
  /** The book marks a sentence learners must not say with *. */
  wrong?: boolean;
}

export interface ExplanationBlock {
  /** Point number as printed ("1"), absent for plain paragraphs. */
  label?: string;
  /** A paragraph that continues the numbered point above it (the book's text under a "(1) heading" line). */
  continues?: boolean;
  text: string;
  examples: ExplanationExample[];
}

const HAN = /[㐀-鿿豈-﫿]/u;
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
// A point marker starts the line or follows a space or sentence punctuation, never a word ("例句(1)").
const POINT_MARKER = /(^|[\s。.：:；;])(?:[(（](\d{1,2})[)）]|([①-⑩])|(\d)\.(?=\s))\s*/gu;
const EXAMPLE_MARKER = /(?:For example|For instance)[,，:：]?\s*|e\.g\.[,，:：]?\s*|例如[：:，,]?\s*|比如[：:，,]?\s*/u;
const OPEN_QUOTE: Record<string, string> = { '“': '”', '「': '」', '"': '"' };
const SENTENCE_END = /[。！？!?]/u;

export function layoutExplanation(text: string): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  let nextPoint = 1;
  for (const line of text.split(/\n+/u).map((part) => part.trim()).filter(Boolean)) {
    let label: string | undefined;
    let start = 0;
    const push = (end: number) => {
      const segment = line.slice(start, end).trim();
      if (!segment) return;
      const continues = !label && nextPoint > 1;
      blocks.push({ ...(label ? { label } : {}), ...(continues ? { continues } : {}), ...splitExamples(segment) });
    };
    for (const match of line.matchAll(POINT_MARKER)) {
      const number = match[2] ? Number(match[2]) : match[3] ? CIRCLED.indexOf(match[3]) + 1 : Number(match[4]);
      // Only the expected next number counts, so a stray "(3)" inside prose stays prose.
      if (number !== nextPoint || (match[4] && match.index !== 0)) continue;
      const markerStart = match.index + match[1].length;
      push(markerStart);
      label = String(number);
      start = match.index + match[0].length;
      nextPoint += 1;
    }
    push(line.length);
  }
  return blocks;
}

function splitExamples(segment: string): Omit<ExplanationBlock, 'label'> {
  // A book "wrong" sentence: "It is not correct to say: *湯先生不往往週末去打球。" / "例如不能說：*…"
  const wrong = /[:：]\s*(?=\*)/u.exec(segment);
  if (wrong) {
    const examples = parseExamples(segment.slice(wrong.index + wrong[0].length));
    if (examples) return { text: segment.slice(0, wrong.index + 1).trim(), examples };
  }
  const marker = EXAMPLE_MARKER.exec(segment);
  if (marker) {
    const examples = parseExamples(segment.slice(marker.index + marker[0].length));
    if (examples) return { text: leadIn(segment.slice(0, marker.index)), examples };
  }
  return { text: segment, examples: [] };
}

/** The words before the examples, ending on a colon instead of a dangling comma. */
function leadIn(head: string): string {
  const trimmed = head.trim().replace(/[,，]$/u, '').trim();
  if (!trimmed) return '';
  if (/[.。:：!?！？]$/u.test(trimmed)) return trimmed;
  return `${trimmed}${HAN.test(trimmed.at(-1) ?? '') || /[」』）]$/u.test(trimmed) ? '：' : ':'}`;
}

/** Example sentences only (Chinese, optional * and brackets); null when English prose follows. */
function parseExamples(tail: string): ExplanationExample[] | null {
  const examples: ExplanationExample[] = [];
  let rest = tail.trim();
  while (rest) {
    let wrong = false;
    if (rest.startsWith('*')) { wrong = true; rest = rest.slice(1).trimStart(); }
    let sentence: string;
    const close = OPEN_QUOTE[rest[0]];
    if (close) {
      const end = rest.indexOf(close, 1);
      if (end < 0) return null;
      sentence = rest.slice(1, end);
      rest = rest.slice(end + 1).replace(/^[.。,，;；]/u, '');
    } else {
      const end = SENTENCE_END.exec(rest);
      const cut = end ? end.index + 1 : rest.length;
      sentence = rest.slice(0, cut);
      rest = rest.slice(cut);
    }
    if (!isChineseSentence(sentence)) return null;
    rest = rest.trimStart();
    let translation: string | undefined;
    const bracket = /^[(（]([^)）]*[A-Za-z][^)）]*)[)）][.。]?/u.exec(rest);
    if (bracket && !HAN.test(bracket[1])) {
      translation = bracket[1].trim();
      rest = rest.slice(bracket[0].length).trimStart();
    }
    examples.push({ text: sentence.trim(), ...(translation ? { translation } : {}), ...(wrong ? { wrong } : {}) });
  }
  return examples.length > 0 ? examples : null;
}

/** Chinese with at most a speaker letter or a bracketed pinyin gloss, never an English word. */
function isChineseSentence(sentence: string): boolean {
  const bare = sentence.replace(/[(（][^)）]*[)）]/gu, '');
  return HAN.test(bare) && !/[A-Za-z]{2,}/u.test(bare);
}
