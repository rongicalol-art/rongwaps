-- Lesson test questions: how often each choice was picked, for finding questions to fix (read-only). The counts come
-- from private.lesson_test_question_stats, which holds only combined counts, never a run or an account
-- (supabase/migrations/20261124120000_lesson_test_answers.sql). Only question editions with 30+ answers are listed,
-- and each answer is a different learner's first run. `pick` is the original choice index (-1 = left blank);
-- `s1` and `s2` are the sum and sum of squares of those runs' rest scores, for scripts/release/testQuestionStats.mjs.
-- Run by .github/workflows/learner-report.yml next to learner-report.sql; output is one JSON array.
with enough as (
  select question, edition from private.lesson_test_question_stats group by question, edition having sum(answers) >= 30
)
select coalesce(jsonb_agg(jsonb_build_object('q', s.question, 'e', s.edition, 'pick', s.pick, 'n', s.answers,
         's1', round(s.rest_sum::numeric, 4), 's2', round(s.rest_squares::numeric, 4)) order by s.question, s.edition, s.pick), '[]'::jsonb)
from private.lesson_test_question_stats s join enough using (question, edition);
