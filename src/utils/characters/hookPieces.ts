import type { HookPack, HookPiece, PieceJob, StrokeRange, TeachHook, TeachHookIndex, WordHook, WordHookIndex, WordHookKind, WordHookPart } from '../../types/hookPieces';

const JOBS: ReadonlySet<PieceJob> = new Set(['meaning', 'sound', 'both', 'picture', 'part']);
const KINDS: ReadonlySet<WordHookKind> = new Set(['sum', 'whole', 'sound']);
const TOKEN = /\{(\d+)\|([^{}|]+)\}|\*\*([^*]+)\*\*/gu;

export interface HookTextRun {
  text: string;
  /** Index of the piece these words name. */
  piece?: number;
  /** The meaning the sentence lands on. */
  strong?: boolean;
}

/** Splits `A {0|hand} holds it: **to hold**.` into plain, piece-naming and meaning runs. */
export function parseHookText(hook: string): HookTextRun[] {
  const runs: HookTextRun[] = [];
  let last = 0;
  for (const match of hook.matchAll(TOKEN)) {
    if (match.index > last) runs.push({ text: hook.slice(last, match.index) });
    runs.push(match[3] === undefined ? { text: match[2], piece: Number(match[1]) } : { text: match[3], strong: true });
    last = match.index + match[0].length;
  }
  if (last < hook.length) runs.push({ text: hook.slice(last) });
  return runs;
}

/** The hook as a plain sentence, for surfaces that show text only. */
export function plainHookText(hook: string): string {
  return parseHookText(hook).map((run) => run.text).join('');
}

export function strokeInRanges(ranges: readonly StrokeRange[], stroke: number): boolean {
  return ranges.some(([from, to]) => stroke >= from && stroke <= to);
}

/**
 * A sound piece the hook leaves out: not a useful word, or an old sound the
 * sentence does not use as a picture. The card says why in one fixed line.
 */
export function isLeftOutSound(hook: TeachHook, index: number): boolean {
  const piece = hook.pieces[index];
  if (piece.job !== 'sound') return false;
  if (piece.rare) return true;
  return Boolean(piece.old) && !parseHookText(hook.hook).some((run) => run.piece === index);
}

/** The line under a piece's name: its job, the sound it gives, and what the shape looks like today. */
export function pieceJobLabel(piece: HookPiece): string {
  const job = piece.job === 'meaning' ? 'meaning'
    : piece.job === 'sound' ? (piece.old ? 'old sound' : `sound → ${piece.to ?? ''}`.trim())
    : piece.job === 'both' ? (piece.old ? 'meaning · old sound' : `meaning + sound · ${piece.from ?? ''} → ${piece.to ?? ''}`)
    : piece.job === 'picture' ? (piece.glyph ? 'drawing' : 'part of the picture')
    : '';
  return [job, piece.note].filter(Boolean).join(' · ');
}

const text = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const optionalText = (value: unknown) => value === undefined || text(value);
const optionalFlag = (value: unknown) => value === undefined || value === true;

function isStrokeRanges(value: unknown): value is StrokeRange[] {
  return Array.isArray(value) && value.length > 0 && value.every((range) => Array.isArray(range) && range.length === 2
    && Number.isInteger(range[0]) && Number.isInteger(range[1]) && range[0] >= 0 && range[1] >= range[0]);
}

function isHookPiece(value: unknown): value is HookPiece {
  if (!value || typeof value !== 'object') return false;
  const piece = value as Partial<HookPiece>;
  return text(piece.name) && JOBS.has(piece.job as PieceJob) && isStrokeRanges(piece.strokes)
    && optionalText(piece.glyph) && optionalText(piece.note) && optionalText(piece.from) && optionalText(piece.to)
    && optionalFlag(piece.old) && optionalFlag(piece.rare) && optionalFlag(piece.real) && optionalFlag(piece.whole);
}

export function isTeachHook(value: unknown): value is TeachHook {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<TeachHook>;
  return text(entry.char) && [...entry.char].length === 1 && text(entry.pinyin) && text(entry.gloss)
    && Array.isArray(entry.pieces) && entry.pieces.length > 0 && entry.pieces.every(isHookPiece)
    && text(entry.hook)
    && (entry.more === undefined || (Array.isArray(entry.more) && entry.more.length > 0 && entry.more.every(text)));
}

function isWordHookPart(value: unknown): value is WordHookPart {
  if (!value || typeof value !== 'object') return false;
  const part = value as Partial<WordHookPart>;
  return text(part.text) && text(part.meaning) && (part.role === undefined || part.role === 'label' || part.role === 'sound');
}

export function isWordHook(value: unknown): value is WordHook {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<WordHook>;
  return text(entry.word) && text(entry.gloss) && KINDS.has(entry.kind as WordHookKind)
    && Array.isArray(entry.parts) && entry.parts.length > 0 && entry.parts.every(isWordHookPart)
    && entry.parts.map((part) => part.text).join('') === entry.word
    && optionalText(entry.lit) && optionalText(entry.note)
    && (entry.kind === 'whole' ? text(entry.teach) : entry.teach === undefined);
}

function isHookPack<T>(pack: unknown, expectedCount: number, isItem: (item: unknown) => item is T): pack is HookPack<T> {
  if (!pack || typeof pack !== 'object') return false;
  const candidate = pack as Partial<HookPack<unknown>>;
  return candidate.schemaVersion === 1 && Array.isArray(candidate.items)
    && candidate.count === expectedCount && candidate.items.length === expectedCount && candidate.items.every(isItem);
}

export const isValidTeachHookPack = (pack: unknown, expectedCount: number): pack is HookPack<TeachHook> => isHookPack(pack, expectedCount, isTeachHook);
export const isValidWordHookPack = (pack: unknown, expectedCount: number): pack is HookPack<WordHook> => isHookPack(pack, expectedCount, isWordHook);

export function teachHookPackToIndex(pack: HookPack<TeachHook>): TeachHookIndex {
  return new Map(pack.items.map((item) => [item.char, item]));
}

export function wordHookPackToIndex(pack: HookPack<WordHook>): WordHookIndex {
  return new Map(pack.items.map((item) => [item.word, item]));
}

/** Longest explanation a card may carry. The owner's rule: one short explanation, not two. */
export const HOOK_WORD_LIMIT = 30;

/**
 * Content rules beyond the pack shape. `strokeCount` returns a character's stroke
 * count, or undefined when stroke data does not exist for it.
 */
export function teachHookProblems(entry: TeachHook, strokeCount: (char: string) => number | undefined): string[] {
  const problems: string[] = [];
  const total = strokeCount(entry.char);
  if (total === undefined) problems.push('no stroke data for the character');
  const claimed = new Set<number>();
  entry.pieces.forEach((piece, index) => {
    const label = `piece ${index} (${piece.name})`;
    for (const [from, to] of piece.strokes) {
      if (total !== undefined && to >= total) problems.push(`${label}: stroke ${to} is past the last stroke (${total - 1})`);
      for (let stroke = from; stroke <= to; stroke += 1) {
        if (claimed.has(stroke)) problems.push(`${label}: stroke ${stroke} already belongs to another piece`);
        claimed.add(stroke);
      }
    }
    const sounds = piece.job === 'sound' || piece.job === 'both';
    if (sounds && !piece.to) problems.push(`${label}: a sound piece needs the reading it points to`);
    if (piece.job === 'both' && !piece.from) problems.push(`${label}: a meaning + sound piece needs its own reading`);
    if (piece.whole && entry.pieces.length > 1) problems.push(`${label}: a whole-character piece stands alone`);
  });
  if (total !== undefined && claimed.size !== total) problems.push(`${total - claimed.size} stroke(s) belong to no piece`);
  const runs = parseHookText(entry.hook);
  for (const run of runs) if (run.piece !== undefined && run.piece >= entry.pieces.length) problems.push(`the hook names piece ${run.piece}, which does not exist`);
  if (runs.filter((run) => run.strong).length !== 1) problems.push('the hook needs exactly one bold meaning');
  const plain = plainHookText(entry.hook);
  if (/[{}|*]/u.test(plain)) problems.push('the hook has a broken {n|words} or **meaning** mark');
  const words = plain.trim().split(/\s+/u).length;
  if (words > HOOK_WORD_LIMIT) problems.push(`the hook is ${words} words; the limit is ${HOOK_WORD_LIMIT}`);
  return problems;
}
