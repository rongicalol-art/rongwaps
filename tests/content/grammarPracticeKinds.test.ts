import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import type { DialogueClip, GrammarPractice, ListenClip, PracticeItem } from '../../src/types/models';
import { checkListenPick, checkMatchPair, checkSortCard, checkSpotFix } from '../../src/utils/grammar/grammarPracticePicks';
import { checkOrderBuild, checkStoryOrder } from '../../src/utils/grammar/grammarPracticeSequence';
import { readJson } from '../acceptance_helpers';

/** The kinds beyond fill-the-blank: build the sentence, listen then build, spot the mistake, match, sort, story order. */
const dir = path.resolve('content/grammar-practice');
const pages = fs.readdirSync(dir).filter((file) => file.endsWith('.json')).flatMap((file) => {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) as Record<string, GrammarPractice>;
  return Object.entries(lesson).map(([key, page]) => ({ key, items: page.items }));
});
const isNewKind = (item: PracticeItem) => ['order-build', 'listen-build', 'listen-pick', 'spot-fix', 'match-pairs', 'sort-groups', 'story-order'].includes(item.kind);
const newItems = pages.flatMap(({ key, items }) => items.filter(isNewKind).map((item) => ({ key, item })));

test('every new-kind item is titled by its own task', () => {
  assert.deepEqual(newItems.filter(({ item }) => !item.prompt?.trim()).map(({ key, item }) => `${key} ${item.id}`), []);
});

test('item ids stay unique across every practice file', () => {
  const ids = pages.flatMap(({ items }) => items.map((item) => item.id));
  assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), []);
});

test('own items come after the book items of their group', () => {
  const found = pages.filter(({ items }) => items.findIndex((item) => item.source === 'own') >= 0
    && items.slice(items.findIndex((item) => item.source === 'own')).some((item) => item.source !== 'own')).map(({ key }) => key);
  assert.deepEqual(found, []);
});

test('every new-kind item is solved by its own answer key', () => {
  const failed = newItems.flatMap(({ key, item }) => {
    const ok = (() => {
      switch (item.kind) {
        case 'order-build':
        case 'listen-build': return item.accepted.every((answer) => checkOrderBuild(item, answer.order).correct);
        case 'spot-fix': return checkSpotFix(item, item.wrong, item.fix ?? null).correct;
        case 'match-pairs': return item.replies.every((reply, index) => reply.answers === undefined || checkMatchPair(item, reply.answers, index).correct);
        case 'sort-groups': return item.cards.every((card, index) => checkSortCard(item, index, card.group).correct);
        case 'story-order': return checkStoryOrder(item, item.answer).correct;
        default: return true;
      }
    })();
    return ok ? [] : [`${key} ${item.id}`];
  });
  assert.deepEqual(failed, []);
});

test('a wrong word explains itself wherever it lands (build the sentence)', () => {
  const found = newItems.flatMap(({ key, item }) => {
    if (item.kind !== 'order-build' && item.kind !== 'listen-build') return [];
    const right = new Set(item.accepted.flatMap((answer) => answer.order));
    const explained = new Set((item.repairs ?? []).flatMap((repair) => repair.placed ?? []));
    return [...new Set(item.tiles.map((tile) => tile.traditional))].filter((tile) => !right.has(tile) && !explained.has(tile)).map((tile) => `${key} ${item.id} ${tile}`);
  });
  assert.deepEqual(found, []);
});

test('a sentence to fix is titled by what it means, so exactly one fix is right', () => {
  const found = newItems.filter(({ item }) => item.kind === 'spot-fix' && (!item.prompt?.trim() || /\b(tap|wrong|wrote)\b/i.test(item.prompt))).map(({ key, item }) => `${key} ${item.id}`);
  assert.deepEqual(found, []);
});

/**
 * Listen then build: the clip is cut from the book's own dialogue recording, never text-to-speech.
 * `content/dialogueAlignment.json` times every character of every line and scores how well it matched
 * the audio, so a clip can be proven to say exactly its answer, and nothing else, from a clean take.
 */
interface AlignedChar { charStart: number; charEnd: number; start: number; score?: number }
interface AlignedLine { index: number; text: string; unmatched?: boolean; chars?: AlignedChar[] }
const alignment = readJson<Record<string, { audioFile: string; lines: AlignedLine[] }>>('content/dialogueAlignment.json');
const listenItems = newItems.flatMap(({ key, item }) => {
  if (item.kind === 'listen-build') return [{ key, id: item.id, clip: item.clip, said: item.accepted[0].sentence.traditional }];
  if (item.kind === 'listen-pick') return [{ key, id: item.id, clip: item.clip, said: item.options[item.answer].traditional }];
  return [];
});
/** "High-quality recordings only": every spoken character of a clip matched the audio at least this well (0–1). */
const MIN_CHAR_SCORE = 0.85;
/** A character's start is an estimate: leave room before the first one, and let the last one finish. */
const MIN_LEAD_SECONDS = 0.05;
const MIN_LAST_SYLLABLE_SECONDS = 0.35;
/** The player stops a little after `end` and seeks to the nearest frame of `start`: keep the words on either side out of reach. */
const MIN_NEXT_WORD_SECONDS = 0.3;
const MIN_PREVIOUS_WORD_SECONDS = 0.6;
const hanOnly = (text: string) => [...text].filter((char) => /\p{Script=Han}/u.test(char)).join('');

function clipProblems(clip: DialogueClip, sentence: string): string[] {
  const reading = alignment[clip.reading];
  if (!reading) return [`no dialogue ${clip.reading}`];
  const problems: string[] = [];
  if (reading.audioFile !== clip.file) problems.push(`${clip.reading} is recorded in ${reading.audioFile}, not ${clip.file}`);
  const line = reading.lines[clip.line];
  if (!line || line.unmatched) problems.push(`${clip.reading} line ${clip.line} is missing or was never cleanly spoken`);
  // Every character that begins inside the clip, in any line: neighbours must not leak in.
  const spoken = reading.lines.flatMap((aligned) => (aligned.chars ?? [])
    .filter((char) => char.start >= clip.start && char.start < clip.end)
    .map((char) => ({ line: aligned.index, text: aligned.text.slice(char.charStart, char.charEnd), start: char.start, score: char.score ?? 0 })));
  const said = spoken.map((char) => char.text).join('');
  const answer = hanOnly(sentence);
  if (said !== answer) problems.push(`the clip says "${said}", the answer is "${answer}"`);
  if (spoken.some((char) => char.line !== clip.line)) problems.push(`the clip runs into another line (${[...new Set(spoken.map((char) => char.line))].join(', ')}), not just line ${clip.line}`);
  const weakest = Math.min(...spoken.map((char) => char.score));
  if (weakest < MIN_CHAR_SCORE) problems.push(`the weakest character matched the recording at ${weakest}, below ${MIN_CHAR_SCORE}`);
  const starts = reading.lines.flatMap((aligned) => (aligned.chars ?? []).map((char) => char.start));
  const next = Math.min(...starts.filter((start) => start >= clip.end));
  const previous = Math.max(...starts.filter((start) => start < clip.start));
  if (next - clip.end < MIN_NEXT_WORD_SECONDS) problems.push(`the next word starts only ${(next - clip.end).toFixed(2)}s after the clip ends, and playback can run past the end into it`);
  if (clip.start - previous < MIN_PREVIOUS_WORD_SECONDS) problems.push(`the word before starts only ${(clip.start - previous).toFixed(2)}s before the clip does, and may be heard at its start`);
  if (spoken.length > 0) {
    if (spoken[0].start - clip.start < MIN_LEAD_SECONDS) problems.push(`starts less than ${MIN_LEAD_SECONDS}s before the first word and may cut it`);
    if (clip.end - spoken[spoken.length - 1].start < MIN_LAST_SYLLABLE_SECONDS) problems.push(`ends less than ${MIN_LAST_SYLLABLE_SECONDS}s after the last word starts and may cut it`);
  }
  return problems;
}

/** A grammar page's own recorded example: approved, on this page, and exactly the clip the alignment proved clean. */
const trackClips = readJson<Record<string, { page: string; file: string; start: number; end: number; approved?: string }>>('content/audio/grammar_track_clips.json');
function trackClipProblems(clip: Extract<ListenClip, { page: string }>, sentence: string, page: string): string[] {
  const recorded = trackClips[hanOnly(sentence)];
  if (!recorded) return [`no recorded grammar example says "${hanOnly(sentence)}"`];
  const problems: string[] = [];
  if (!recorded.approved) problems.push('that grammar recording is not approved');
  if (clip.page !== page || recorded.page !== page) problems.push(`the recording belongs to ${recorded.page}, the clip names ${clip.page}, the item is on ${page}`);
  if (recorded.file !== clip.file || recorded.start !== clip.start || recorded.end !== clip.end) problems.push('the clip does not match the approved recording');
  return problems;
}

test('a listening clip says exactly its answer, from a clean recording of one dialogue line or its own page', () => {
  assert.ok(listenItems.length >= 4, 'listen then build has its own items in L1–L8');
  assert.deepEqual(listenItems.flatMap(({ key, id, clip, said }) => ('page' in clip ? trackClipProblems(clip, said, key) : clipProblems(clip, said)).map((problem) => `${key} ${id}: ${problem}`)), []);
});

test('every grammar sentence played from the book is a clean clip of exactly that sentence', () => {
  const clips = readJson<Record<string, DialogueClip>>('content/audio/grammar_book_clips.json');
  assert.ok(Object.keys(clips).length > 0);
  assert.deepEqual(Object.entries(clips).flatMap(([sentence, clip]) => clipProblems(clip, sentence).map((problem) => `${sentence}: ${problem}`)), []);
});

test('a listen-pick answer is right only for the sentence that was said, and every other says why', () => {
  const picks = newItems.flatMap(({ item }) => (item.kind === 'listen-pick' ? [item] : []));
  assert.ok(picks.length >= 2);
  picks.forEach((item) => item.options.forEach((option, index) => {
    const verdict = checkListenPick(item, index);
    assert.equal(verdict.correct, index === item.answer, item.id);
    if (!verdict.correct) assert.ok(verdict.note?.trim(), `${item.id} option ${index + 1}`);
  }));
});
