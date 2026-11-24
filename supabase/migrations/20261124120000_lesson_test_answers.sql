-- Lesson test answers, counted anonymously to find bad questions (expand only: the previous app version never
-- touches any of this).
--
-- private.lesson_test_question_stats: running counts, one row per question, content edition and picked choice:
--   how many answers picked it and the sum and sum of squares of those runs' rest scores (the run's other
--   questions right ÷ their number). There are no per-run rows and nothing about who, when or which run, so the
--   counts can't be traced back to a learner (Privacy §3 "anonymous, combined statistics"; §6 lets them outlive
--   an account). `edition` is the version's content fingerprint from the lesson-test pack, so a question whose
--   wording changes starts counting afresh. The app sends only a learner's first finished run of each lesson,
--   so every count is a different person and retakes after seeing the answers don't skew it.
--   scripts/release/test-questions.sql reads it for the learner report (30+ answers per question).
-- record_lesson_test_answers: the only way in, for signed-in learners with access. It keeps no per-account
--   state on purpose (a daily counter per account would sit next to the counts it changes); the worst a
--   misbehaving account can do is skew numbers that a person then checks against the content.

begin;

create table private.lesson_test_question_stats (
  question text not null check (question ~ '^b[1-9]l[0-9]{2}-[a-z0-9-]{1,100}$'),
  edition text not null check (edition ~ '^[0-9a-f]{8}$'),
  pick smallint not null check (pick between -1 and 9),
  answers integer not null default 0,
  rest_sum double precision not null default 0,
  rest_squares double precision not null default 0,
  primary key (question, edition, pick)
);
alter table private.lesson_test_question_stats enable row level security;
revoke all on private.lesson_test_question_stats from public, anon, authenticated;

-- p_answers: [{"q": question id, "e": edition, "p": picked choice 0-9 or -1 for blank, "r": rest score 0-1}], one
-- entry per question shown, every id in lesson p_lesson.
create function public.record_lesson_test_answers(p_lesson text, p_answers jsonb)
returns void language plpgsql volatile security definer set search_path = '' as $$
declare
  entry jsonb;
begin
  if auth.uid() is null then raise sqlstate 'PT401' using message = 'Sign in required.'; end if;
  if not private.has_school_beta_access() then raise exception 'School beta access required' using errcode = '42501'; end if;
  if p_lesson is null or p_lesson !~ '^b[1-9]l[0-9]{2}$' or p_answers is null or jsonb_typeof(p_answers) <> 'array'
    or jsonb_array_length(p_answers) not between 1 and 60 then
    raise exception using errcode = '22023', message = 'Invalid test answers.';
  end if;
  -- One check at a time: SQL doesn't promise to evaluate an OR left to right, so a cast never runs before its
  -- type check.
  for entry in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(entry) <> 'object' then raise exception using errcode = '22023', message = 'Invalid test answers.'; end if;
    if (select count(*) from jsonb_object_keys(entry)) <> 4
      or jsonb_typeof(entry -> 'q') is distinct from 'string' or jsonb_typeof(entry -> 'e') is distinct from 'string'
      or jsonb_typeof(entry -> 'p') is distinct from 'number' or jsonb_typeof(entry -> 'r') is distinct from 'number' then
      raise exception using errcode = '22023', message = 'Invalid test answers.';
    end if;
    if entry ->> 'q' !~ ('^' || p_lesson || '-[a-z0-9-]{1,100}$') or entry ->> 'e' !~ '^[0-9a-f]{8}$'
      or entry ->> 'p' !~ '^(-1|[0-9])$' then
      raise exception using errcode = '22023', message = 'Invalid test answers.';
    end if;
    if (entry ->> 'r')::double precision not between 0 and 1 then
      raise exception using errcode = '22023', message = 'Invalid test answers.';
    end if;
  end loop;
  if (select count(distinct value ->> 'q') from jsonb_array_elements(p_answers)) <> jsonb_array_length(p_answers) then
    raise exception using errcode = '22023', message = 'Invalid test answers.';
  end if;
  insert into private.lesson_test_question_stats as s (question, edition, pick, answers, rest_sum, rest_squares)
  select value ->> 'q', value ->> 'e', (value ->> 'p')::smallint, 1, (value ->> 'r')::double precision,
         ((value ->> 'r')::double precision) ^ 2
  from jsonb_array_elements(p_answers)
  on conflict (question, edition, pick) do update
    set answers = s.answers + 1, rest_sum = s.rest_sum + excluded.rest_sum, rest_squares = s.rest_squares + excluded.rest_squares;
end;
$$;

revoke all on function public.record_lesson_test_answers(text, jsonb) from public, anon, authenticated;
grant execute on function public.record_lesson_test_answers(text, jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
