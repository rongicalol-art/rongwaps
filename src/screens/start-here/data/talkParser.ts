export const TEACHER_VOICE = 'en-US-AvaMultilingualNeural';
export const TEACHER_RATE = '-4%';

export interface TalkTextRun {
  text: string;
  bold?: boolean;
}

export type TalkSegment =
  | {
      kind: 'text';
      runs: TalkTextRun[];
      ssml: string;
      clipId: string;
      hasSpotCue: boolean;
    }
  | {
      kind: 'clip';
      key: string;
      label: string;
      isMouth: boolean;
    };

/** Pure synchronous SHA-1 returning lowercase hex (matches Node `crypto.createHash('sha1')` on UTF-8). */
export function sha1Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const words: number[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i] << (24 - (i % 4) * 8));
  }
  const bitLen = bytes.length * 8;
  words[bitLen >> 5] = (words[bitLen >> 5] ?? 0) | (0x80 << (24 - (bitLen % 32)));
  const totalWords = (((bitLen + 64) >> 9) + 1) * 16;
  while (words.length < totalWords) words.push(0);
  words[totalWords - 2] = Math.floor(bitLen / 0x100000000);
  words[totalWords - 1] = bitLen >>> 0;

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Array<number>(80);
  const rotl = (n: number, s: number) => (n << s) | (n >>> (32 - s));

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j += 1) w[j] = words[i + j] ?? 0;
    for (let j = 16; j < 80; j += 1) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let j = 0; j < 80; j += 1) {
      let f: number;
      let k: number;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [h0, h1, h2, h3, h4]
    .map((n) => (n >>> 0).toString(16).padStart(8, '0'))
    .join('');
}

function escapeXmlNoQuote(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseRuns(displayText: string): TalkTextRun[] {
  const runs: TalkTextRun[] = [];
  const boldPattern = /\*([^*]+)\*/g;
  let pos = 0;
  let match: RegExpExecArray | null;
  while ((match = boldPattern.exec(displayText)) !== null) {
    if (match.index > pos) {
      runs.push({ text: displayText.slice(pos, match.index) });
    }
    runs.push({ text: match[1], bold: true });
    pos = match.index + match[0].length;
  }
  if (pos < displayText.length) {
    runs.push({ text: displayText.slice(pos) });
  }
  return runs;
}

function buildTextSegment(raw: string): Extract<TalkSegment, { kind: 'text' }> {
  const hasSpotCue = /\^\w+/.test(raw);
  const clean = raw.replace(/\^\w+/g, '');
  const display = clean.replace(/\|\|/g, '').replace(/\|/g, '').replace(/\s+/g, ' ').trim();
  const ssml = escapeXmlNoQuote(clean)
    .replace(/\|\|/g, '<break time="500ms"/>')
    .replace(/\|/g, '<break time="300ms"/>')
    .replace(/\*([^*]+)\*/g, '<emphasis level="moderate">$1</emphasis>')
    .trim();
  const clipId = sha1Hex(TEACHER_VOICE + TEACHER_RATE + ssml).slice(0, 12);
  return { kind: 'text', runs: parseRuns(display), ssml, clipId, hasSpotCue };
}

const CLIP_TOKEN_PATTERN = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;

/**
 * Parses one teacher speech line written in prototype talk syntax:
 * `*word*` = stressed/bold, `|` = 300ms pause, `||` = 500ms pause,
 * `[[key|label]]` = inline Chinese clip button (`m:<soundId>` animates the mouth),
 * `word^spot` = optional spot-hold marker (hidden visually, signals mouth to stay in pose).
 */
export function parseTalkLine(rawLine: string): TalkSegment[] {
  const segments: TalkSegment[] = [];
  let pos = 0;
  const matcher = new RegExp(CLIP_TOKEN_PATTERN.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = matcher.exec(rawLine)) !== null) {
    const before = rawLine.slice(pos, match.index);
    if (before.trim()) {
      segments.push(buildTextSegment(before));
    }
    const rawKey = match[1];
    const label = match[2];
    const isMouth = rawKey.startsWith('m:');
    segments.push({
      kind: 'clip',
      key: isMouth ? rawKey.slice(2) : rawKey,
      label,
      isMouth,
    });
    pos = match.index + match[0].length;
  }
  const rest = rawLine.slice(pos);
  if (rest.trim()) {
    segments.push(buildTextSegment(rest));
  }
  return segments;
}

/** Counts spoken English words in a single parsed text segment. */
export function countSpokenWords(ssml: string): number {
  const plain = ssml.replace(/<[^>]+>/g, ' ').trim();
  if (!plain) return 0;
  return plain.split(/\s+/).filter(Boolean).length;
}
