#!/usr/bin/env node
// Turns the JSON from learner-report.sql into a short Markdown report for the owner.
// Usage: node scripts/release/learnerReport.mjs <report.json> [test-questions.json] > learner-report.md
// Word ids become words from the generated vocabulary packs; nothing here identifies a learner.
import { existsSync, readFileSync } from 'node:fs';
import { MIN_ANSWERS, flagTestQuestions, loadTestQuestions } from './testQuestionStats.mjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: learnerReport.mjs <report.json>');
  process.exit(2);
}
const r = JSON.parse(readFileSync(file, 'utf8'));
// Missing (the answer counts table isn't on this database yet): the section says so.
const testRowsFile = process.argv[3];
const testRows = (() => {
  try { return testRowsFile ? JSON.parse(readFileSync(testRowsFile, 'utf8')) : null; } catch { return null; }
})();

const words = new Map();
for (const book of [1, 2, 3, 4]) {
  const path = `public/data/vocabulary/book-${book}.json`;
  if (!existsSync(path)) continue;
  for (const item of JSON.parse(readFileSync(path, 'utf8')).items ?? []) words.set(item.id, item);
}

const n = (v) => Number(v ?? 0);
const trend = (now, before) => {
  if (!n(before)) return n(now) ? ' (new)' : '';
  const pct = Math.round(((n(now) - n(before)) / n(before)) * 100);
  return pct === 0 ? ' (same as the week before)' : ` (${pct > 0 ? '+' : ''}${pct}% vs the week before)`;
};
const pct = (part, whole) => (n(whole) ? `${Math.round((n(part) / n(whole)) * 100)}%` : '–');
const SOURCE_NAMES = { daily: 'daily review', flashcards: 'flashcards', quiz: 'quizzes', listening: 'listening', writing: 'writing', tones: 'tones', pinyin: 'pinyin', practice: 'missed-word replays' };

const a = r.active ?? {};
const s = r.signups ?? {};
const w = r.week ?? {};
const social = r.social ?? {};
const out = [];
const line = (text = '') => out.push(text);

line(`# Learner report, ${r.today} (Taiwan)`);
line();
line('Combined, anonymous numbers. "Week" is the last 7 full days. "Active" means answered at least one card.');
line();
line('## People');
line(`- **${n(a.yesterday)} active yesterday**, ${n(a.week)} this week${trend(a.week, a.prev_week)}, ${n(a.month)} in 30 days.`);
line(`- Of yesterday's learners, ${n(a.returning_yesterday)} had joined before yesterday (came back).`);
line(`- ${n(a.three_plus_days_week)} learner(s) studied on 3 or more days this week. Habit-forming share: ${pct(a.three_plus_days_week, a.week)} of the week's learners.`);
line(`- Stickiness (yesterday ÷ 30-day learners): ${pct(a.yesterday, a.month)}.`);
line(`- **${n(s.yesterday)} new account(s) yesterday**, ${n(s.week)} this week${trend(s.week, s.prev_week)}, ${n(s.month)} in 30 days. ${n(r.accounts)} accounts in all.`);
const cb = r.came_back ?? {};
// Like the lesson and word rows: a group under 3 people could point at one person.
if (n(cb.cohort) >= 3) line(`- Came back in week 2: of ${n(cb.cohort)} who joined 8-14 days ago, ${n(cb.active_last_week)} (${pct(cb.active_last_week, cb.cohort)}) studied this week.`);
line();

line('## Last 14 days');
line('| Day | Learners | Answers | New accounts |');
line('| --- | ---: | ---: | ---: |');
for (const d of r.daily ?? []) {
  const day = new Date(`${d.day}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
  line(`| ${day} | ${n(d.learners)} | ${n(d.answers)} | ${n(d.signups)} |`);
}
line();

line('## Studying this week');
line(`- ${n(w.answers)} answers${trend(w.answers, w.prev_answers)}, about ${n(w.minutes)} minutes in all; half the learners studied ${w.median_minutes ?? 0}+ minutes.`);
line(`- Answered right: ${w.right_pct ?? '–'}% of answers.`);
const sources = Object.entries(w.sources ?? {}).sort((x, y) => y[1] - x[1]);
if (sources.length) line(`- Where: ${sources.map(([k, v]) => `${SOURCE_NAMES[k] ?? k} ${pct(v, w.answers)}`).join(', ')}.`);
const hours = Array.from({ length: 24 }, (_, h) => n(w.hours?.[h]));
if (hours.some(Boolean)) {
  const busiest = hours.map((v, h) => [h, v]).sort((x, y) => y[1] - x[1]).slice(0, 3).filter(([, v]) => v).map(([h]) => `${h}:00`);
  let quiet = 0;
  let quietSum = Infinity;
  for (let h = 0; h < 24; h++) {
    const sum = hours[h] + hours[(h + 1) % 24] + hours[(h + 2) % 24];
    if (sum < quietSum) [quiet, quietSum] = [h, sum];
  }
  line(`- Busiest hours (Taiwan): ${busiest.join(', ')}. Quietest 3 hours: ${quiet}:00-${(quiet + 3) % 24}:00, the safest time to release.`);
}
line();

const rv = r.review ?? {};
line('## Review (spaced repetition)');
// Groups under 3 people could point at one person, like the lesson and word rows.
if (n(rv.learners_with_due) >= 3) {
  line(`- ${n(rv.learners_with_due)} of this week's ${n(a.week)} learners have words waiting now; half of them have ${Math.round(n(rv.median_due))}+ waiting, ${n(rv.learners_100_due)} have 100+.`);
} else line('- Fewer than 3 learners have words waiting now.');
if (n(rv.daily_learners) >= 3) {
  line(`- Daily review: ${n(rv.daily_learners)} learners used it on ${n(rv.daily_days)} learner-days and finished the day's goal on ${n(rv.daily_finished)} (${pct(rv.daily_finished, rv.daily_days)}).`);
} else line(`- Daily review: fewer than 3 learners used it this week.`);
if (n(rv.came_back) >= 30) {
  const gaps = (rv.came_back_by_gap ?? []).filter((g) => n(g.answers) >= 10).map((g) => `${g.gap} ${g.right_pct}% (${g.answers})`);
  line(`- Remembered when due: ${rv.came_back_right_pct}% of ${n(rv.came_back)} answers to words seen again after a day or more (the scheduler aims for 90%).${gaps.length ? ` By gap: ${gaps.join(', ')}.` : ''}`);
  line('- Well under 90% means words come back too late or were never really learned; well over means reviews could wait longer.');
} else line('- Remembered when due: not enough returning words yet (needs 30+ answers).');
line();

const lessons = r.lessons ?? [];
line('## Lessons studied most this week');
if (lessons.length) for (const l of lessons) line(`- Book ${l.book} Lesson ${l.lesson}: ${l.learners} learners, ${l.answers} answers`);
else line('- Not enough learners per lesson yet (a lesson shows once 3+ learners studied it).');
line();

const hard = r.hard_cards ?? [];
line('## Hardest words (30 days)');
if (hard.length) {
  for (const c of hard) {
    const w2 = words.get(c.card);
    const label = w2 ? `${w2.traditional} ${w2.pinyin} "${w2.meaning}"` : c.card;
    line(`- ${label} (${c.card.replace(/^B(\d)L0?(\d+).*/, 'B$1 L$2')}): ${c.right_pct}% right over ${c.answers} answers from ${c.learners} learners`);
  }
  line('');
  line('These words could use a better memory hook, example or picture.');
} else line('- Not enough answers yet (a word shows once 3+ learners answered it 8+ times).');
line();

line('## Test questions to check');
line("Each learner's first run of a lesson test, counted anonymously; only each question's current wording.");
if (!Array.isArray(testRows)) line('- No answer data yet (the anonymous counts start once the lesson_test_answers migration is on production).');
else {
  const flagged = flagTestQuestions(testRows, loadTestQuestions());
  if (!testRows.length) line(`- Not enough answers yet (a question shows once it has ${MIN_ANSWERS}+ answers).`);
  else if (!flagged.length) line(`- None: every question with ${MIN_ANSWERS}+ answers looks healthy.`);
  else {
    for (const f of flagged.slice(0, 15)) {
      const wrong = f.topWrong ? `; most-picked wrong: ${f.topWrong.choice} (${Math.round(f.topWrong.share * 100)}%)` : '';
      const disc = f.discrimination === null ? '' : `, discrimination ${f.discrimination.toFixed(2)}`;
      line(`- ${f.lesson} \`${f.id}\`: ${f.prompt || '(cloze blank)'} Key: ${f.key}${wrong}. ${Math.round(f.right * 100)}% right of ${f.answers}${disc}. ${f.reasons.join('; ').replace(/^./, (c) => c.toUpperCase())}.`);
    }
    if (flagged.length > 15) line(`- …and ${flagged.length - 15} more.`);
    line('');
    line('Read each one against its dialogue or passage: a wrong key, two defensible answers, or a trap that catches strong learners.');
  }
}
line();

line('## Study together and friends');
line(`- Seen in Study together: ${n(social.seen_in_study_together_24h)} in the last 24 hours, ${n(social.seen_in_study_together_week)} this week. ${n(social.usernames)} usernames picked.`);
line(`- This week: ${n(social.friend_adds_week)} friend adds, ${n(social.messages_week)} private messages from ${n(social.messagers_week)} people.`);
line(`- Feedback messages this week: ${n(r.feedback_week)}.`);

process.stdout.write(`${out.join('\n')}\n`);
