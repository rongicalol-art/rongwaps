/**
 * A lesson test as a learner meets it, with no keys, reasons or answer sentences: for blind review.
 *
 *   npx tsx scripts/content/lessonTestSheet.ts <lesson.json> --mode learner|choices|keys [--only id,id] --out <file>
 *
 * `learner`: what is heard (as a transcript) or read, the pictures (by their descriptions) and the A/B/C
 * choices in authored order. `choices`: only the choices of each question, to find answers that give
 * themselves away. `keys`: JSON of question id → right letter (bank letter for paragraph blanks), for comparing
 * blind answers. `--only` limits the sheet to some question ids (re-checks after edits).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import type { LessonTestItem, LessonTestLesson, LessonTestQuestion, TestChoice, TestLine } from '../../src/types/lessonTest';

const args = process.argv.slice(2);
const option = (name: string) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : undefined; };
const file = args.find((arg, index) => !arg.startsWith('--') && !args[index - 1]?.startsWith('--'));
const mode = option('--mode') ?? 'learner';
const out = option('--out');
const only = option('--only') ? new Set(option('--only')!.split(',')) : null;
if (!file || !out || !['learner', 'choices', 'keys'].includes(mode)) {
  console.error('Usage: lessonTestSheet.ts <lesson.json> --mode learner|choices|keys [--only id,id] --out <file>');
  process.exit(2);
}
const lesson = JSON.parse(readFileSync(file, 'utf-8')) as LessonTestLesson;
const LETTERS = 'ABCD';
const WHO: Record<TestLine['speaker'], string> = { F: 'Woman', M: 'Man', N: 'Narrator' };
const KIND: Record<LessonTestItem['kind'], string> = {
  'hear-pick-picture': 'Listening: hear, then pick the picture',
  'picture-hear': 'Listening: look at the picture, hear three sentences, pick the one that matches it',
  dialogue: 'Listening: a dialogue or talk, then its question(s); the narrator reads each choice',
  'read-pick-picture': 'Reading: read the sentence, pick the picture',
  realia: 'Reading: look at the picture with writing in it, then answer',
  'scene-gap': 'Reading: look at the picture, fill the blank',
  'paragraph-bank': 'Reading: fill each numbered blank with a word from the bank (each word once; one word is extra)',
  cloze: 'Reading: fill each numbered blank',
  reading: 'Reading: read the text, then answer',
};
const choiceLabel = (choice: TestChoice) => (choice.picture ? `[picture: ${choice.alt ?? choice.picture}]` : choice.traditional ?? '');
const choiceLines = (question: LessonTestQuestion, heard: boolean) =>
  (question.choices ?? []).map((choice, index) => `   ${LETTERS[index]}. ${heard && choice.speaker ? `(heard) ${choice.traditional}` : choiceLabel(choice)}`);
const wanted = (question: LessonTestQuestion) => !only || only.has(question.id);

const lines: string[] = [];
if (mode === 'keys') {
  const keys: Record<string, string> = {};
  for (const slot of lesson.slots) for (const item of slot.versions) for (const question of item.questions.filter(wanted)) keys[question.id] = 'ABCDEFG'[question.key];
  writeFileSync(out, `${JSON.stringify(keys, null, 1)}\n`);
  console.log(`wrote ${out}`);
  process.exit(0);
}
if (mode === 'learner') {
  lines.push(`# ${lesson.key}: blind sheet`);
  lines.push('');
  lines.push('Listening items are given as transcripts of what is heard. Pictures are given as descriptions. Choices are in authored order.');
  for (const slot of lesson.slots) {
    for (const item of slot.versions) {
      const questions = item.questions.filter(wanted);
      if (questions.length === 0) continue;
      lines.push('');
      lines.push(`## ${item.id} — ${KIND[item.kind]}`);
      if (item.kind === 'dialogue' && item.printed) lines.push('The choices are printed on screen while the recording plays, and the narrator reads them after each question. The recording plays once.');
      if (item.kind === 'dialogue' && item.intro) lines.push(`Narrator: ${item.intro.traditional}`);
      if (item.kind === 'hear-pick-picture' || item.kind === 'dialogue') {
        lines.push('You hear:');
        item.lines.forEach((line) => lines.push(`   ${WHO[line.speaker]}: ${line.traditional}`));
      }
      if (item.kind === 'picture-hear') lines.push(`Picture: ${item.picture.alt}`);
      if (item.kind === 'realia') lines.push(`Picture: ${item.alt}. The writing in it: ${item.transcript.traditional}`);
      if (item.kind === 'scene-gap') lines.push(`Picture: ${item.alt}`);
      if (item.kind === 'reading') {
        if (item.title) lines.push(`Title: ${item.title.traditional}`);
        lines.push(`Text (${item.format}):`);
        item.text.traditional.split('\n').forEach((line) => lines.push(`   ${line}`));
      }
      if (item.kind === 'paragraph-bank' || item.kind === 'cloze') {
        const passage = item.passage.traditional.replace(/\{(\d+)\}/g, (_, n) => `［${item.questions[Number(n) - 1].id}］`);
        lines.push(`Passage: ${passage}`);
        if (item.kind === 'paragraph-bank') lines.push(`Word bank: ${item.bank.map((word, index) => `${'ABCDEFG'[index]}. ${word.traditional}`).join('   ')}`);
      }
      for (const question of questions) {
        lines.push('');
        lines.push(`- Question \`${question.id}\``);
        if (item.kind === 'dialogue') lines.push(`   (ding) Narrator asks: ${question.prompt?.traditional ?? ''}`);
        else if (question.prompt) lines.push(`   ${item.kind === 'scene-gap' ? 'Sentence' : item.kind === 'read-pick-picture' ? 'You read' : 'Question'}: ${question.prompt.traditional}`);
        if (item.kind === 'paragraph-bank') lines.push('   Answer with the bank letter for this blank.');
        else lines.push(...choiceLines(question, item.kind === 'picture-hear' || (item.kind === 'dialogue' && !item.printed)));
      }
    }
  }
} else {
  lines.push(`# ${lesson.key}: choices only`);
  lines.push('');
  lines.push('Only the answer choices of each question: no recording, text, picture or question.');
  for (const slot of lesson.slots) {
    for (const item of slot.versions) {
      if (item.kind === 'paragraph-bank') continue;
      for (const question of item.questions.filter(wanted)) {
        lines.push('');
        lines.push(`- \`${question.id}\` (${item.kind})`);
        lines.push(...(question.choices ?? []).map((choice, index) => `   ${LETTERS[index]}. ${choiceLabel(choice)}`));
      }
    }
  }
}
writeFileSync(out, `${lines.join('\n')}\n`);
console.log(`wrote ${out}`);
