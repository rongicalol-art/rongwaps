// Lesson test questions worth a look, from the anonymous answer counts of test-questions.sql and the answer keys in the
// generated lesson-test packs (the database never holds the keys). Plain item analysis, as test makers do it:
//   - right: the share of answers that picked the key. Under 25% usually means a wrong key or two defensible answers.
//   - a wrong choice picked more often than the key: the classic sign of a miskeyed or ambiguous question.
//   - discrimination (point-biserial against the rest score, the run's other questions): do stronger runs get it
//     right more often than weaker ones? Under 0.1 the question doesn't tell them apart; below 0 the strong runs
//     miss it more, so the question is probably misleading.
// Counts are kept per content edition (the version's fingerprint in the pack), so only the current text is judged.
import { existsSync, readFileSync } from 'node:fs';

export const MIN_ANSWERS = 30;
const LOW_RIGHT = 0.25;
const LOW_DISCRIMINATION = 0.1;

/** Question id -> { lesson, edition, key, prompt, choices } from public/data/lesson-tests/book-*.json. */
export function loadTestQuestions(root = '.') {
  const questions = new Map();
  for (const book of [1, 2, 3, 4, 5, 6]) {
    const path = `${root}/public/data/lesson-tests/book-${book}.json`;
    if (!existsSync(path)) continue;
    for (const lesson of JSON.parse(readFileSync(path, 'utf8')).items ?? []) {
      for (const slot of lesson.slots ?? []) {
        for (const version of slot.versions ?? []) {
          for (const question of version.questions ?? []) {
            questions.set(question.id, {
              lesson: lesson.key,
              edition: version.edition,
              key: question.key,
              prompt: question.prompt?.traditional ?? '',
              choices: (question.choices ?? []).map((choice) => choice.traditional ?? choice.text ?? ''),
            });
          }
        }
      }
    }
  }
  return questions;
}

/**
 * rows: [{ q, e, pick, n, s1, s2 }] (one per question, edition and picked choice); rows of an older edition are
 * left out. Returns the questions to check, worst first:
 * { id, lesson, prompt, answers, right, discrimination, key, topWrong, reasons }.
 */
export function flagTestQuestions(rows, questions) {
  const byQuestion = new Map();
  for (const row of rows ?? []) {
    if (row.e !== questions.get(row.q)?.edition) continue;
    if (!byQuestion.has(row.q)) byQuestion.set(row.q, []);
    byQuestion.get(row.q).push({ pick: Number(row.pick), n: Number(row.n), s1: Number(row.s1), s2: Number(row.s2) });
  }
  const flagged = [];
  for (const [id, picks] of byQuestion) {
    const question = questions.get(id);
    if (!question) continue; // Removed or renamed since.
    const n = picks.reduce((sum, p) => sum + p.n, 0);
    if (n < MIN_ANSWERS) continue;
    const keyed = picks.find((p) => p.pick === question.key) ?? { n: 0, s1: 0 };
    const right = keyed.n / n;
    const s1 = picks.reduce((sum, p) => sum + p.s1, 0);
    const s2 = picks.reduce((sum, p) => sum + p.s2, 0);
    const mean = s1 / n;
    const sd = Math.sqrt(Math.max(s2 / n - mean * mean, 0));
    const wrongN = n - keyed.n;
    const discrimination = sd > 0 && keyed.n > 0 && wrongN > 0
      ? ((keyed.s1 / keyed.n - (s1 - keyed.s1) / wrongN) / sd) * Math.sqrt(right * (1 - right))
      : null;
    const topWrong = picks.filter((p) => p.pick !== question.key && p.pick >= 0).sort((a, b) => b.n - a.n)[0];
    const reasons = [];
    if (topWrong && topWrong.n > keyed.n) reasons.push('a wrong choice is picked more than the key');
    if (right < LOW_RIGHT) reasons.push('few get it right');
    if (discrimination !== null && discrimination < 0) reasons.push('strong runs miss it more than weak ones');
    else if (discrimination !== null && discrimination < LOW_DISCRIMINATION) reasons.push("doesn't tell strong and weak runs apart");
    if (!reasons.length) continue;
    flagged.push({
      id, lesson: question.lesson, prompt: question.prompt, answers: n, right, discrimination,
      key: question.choices[question.key] ?? '',
      topWrong: topWrong ? { choice: question.choices[topWrong.pick] ?? '', share: topWrong.n / n } : null,
      reasons,
    });
  }
  // Worst first: a miskey signal, then the lowest discrimination, then the fewest right.
  const weight = (f) => (f.reasons[0] === 'a wrong choice is picked more than the key' ? 0 : 1);
  return flagged.sort((a, b) => weight(a) - weight(b) || (a.discrimination ?? 1) - (b.discrimination ?? 1) || a.right - b.right);
}
