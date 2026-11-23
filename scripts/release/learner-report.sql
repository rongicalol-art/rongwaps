-- Learner report: combined, anonymous numbers about how the app is used (read-only).
-- The privacy policy allows "anonymous, combined statistics only", so this returns counts and
-- never an account id, name or email. Per-lesson and per-word rows need at least 3 learners,
-- so no row can point at one person. Days are Taiwan days; "week" is the last 7 full days.
-- Run by .github/workflows/learner-report.yml inside a read-only transaction; output is one JSON object
-- that scripts/release/learnerReport.mjs turns into the report.
with
t as (select (now() at time zone 'Asia/Taipei')::date as today),
ev as (
  select e.user_id, e.card_id,
         (e.reviewed_at at time zone 'Asia/Taipei') as local_at,
         (e.reviewed_at at time zone 'Asia/Taipei')::date as day,
         coalesce(e.payload->>'source', 'unknown') as source,
         case when e.payload->>'quality' ~ '^[0-5]$' then (e.payload->>'quality')::int end as quality,
         least(greatest(coalesce(case when e.payload->>'durationMs' ~ '^\d+(\.\d+)?$' then (e.payload->>'durationMs')::numeric end, 0), 0), 300000) as ms,
         e.payload->>'scheduled' = 'true' as scheduled,
         coalesce(e.payload->>'practiceOnly' = 'true', false) as practice_only,
         case when e.payload->>'dailyTarget' ~ '^\d+$' then (e.payload->>'dailyTarget')::int end as daily_target
  from public.user_review_events e
  where e.reviewed_at >= now() - interval '32 days'
),
wk as (select ev.* from ev, t where ev.day >= t.today - 7 and ev.day < t.today),
users as (select id, (created_at at time zone 'Asia/Taipei')::date as joined from auth.users),
days as (select (t.today - n) as day from t, generate_series(1, 14) n),
per_user_week as (select user_id, sum(ms) / 60000.0 as minutes, count(distinct day) as days from wk group by user_id),
cohort as (select u.id from users u, t where u.joined between t.today - 14 and t.today - 8),
lessons as (
  select substring(card_id from '^B(\d)L\d+') as book, substring(card_id from '^B\dL(\d+)')::int as lesson,
         count(distinct user_id) as learners, count(*) as answers
  from wk where card_id ~ '^B\dL\d+' group by 1, 2
),
-- Review health. "Came back": a scheduled answer to a word the same learner last answered 20+ hours
-- earlier (within the 32 days), i.e. the word was due. FSRS aims for 90% of these to be right.
seen as (select ev.*, lag(local_at) over (partition by user_id, card_id order by local_at) as prev_at from ev),
came_back as (
  select s.quality, extract(epoch from (s.local_at - s.prev_at)) / 86400.0 as gap_days
  from seen s, t
  where s.day >= t.today - 7 and s.day < t.today and s.prev_at is not null and s.scheduled
    and not s.practice_only and s.quality is not null and s.local_at - s.prev_at >= interval '20 hours'
),
-- One row per learner and day the daily review was used; finished = the day's goal (its word count, or 5 minutes).
daily_days as (
  select user_id, day, count(distinct card_id) filter (where not practice_only) as words, sum(ms) as ms, max(daily_target) as target
  from wk where source = 'daily' group by user_id, day
),
-- Words waiting right now, for each of the week's learners who has any memory record.
piles as (
  select p.user_id, count(*) filter (where p.next_review_date <= now()) as due
  from public.user_card_progress p
  where p.user_id in (select distinct user_id from wk) and p.next_review_date is not null
  group by p.user_id
),
cards as (
  select card_id, count(distinct user_id) as learners, count(*) as answers,
         round(100.0 * count(*) filter (where quality >= 3) / nullif(count(*) filter (where quality is not null), 0)) as right_pct
  from ev group by card_id
)
select jsonb_build_object(
  'generated_at', now(),
  'today', (select today from t),
  'accounts', (select count(*) from users),
  'signups', jsonb_build_object(
    'yesterday', (select count(*) from users, t where joined = t.today - 1),
    'week', (select count(*) from users, t where joined >= t.today - 7 and joined < t.today),
    'prev_week', (select count(*) from users, t where joined >= t.today - 14 and joined < t.today - 7),
    'month', (select count(*) from users, t where joined >= t.today - 30 and joined < t.today)),
  'active', jsonb_build_object(
    'yesterday', (select count(distinct user_id) from ev, t where day = t.today - 1),
    'week', (select count(distinct user_id) from wk),
    'prev_week', (select count(distinct user_id) from ev, t where day >= t.today - 14 and day < t.today - 7),
    'month', (select count(distinct user_id) from ev, t where day >= t.today - 30 and day < t.today),
    'returning_yesterday', (select count(distinct ev.user_id) from ev join users u on u.id = ev.user_id, t
                            where ev.day = t.today - 1 and u.joined < t.today - 1),
    'three_plus_days_week', (select count(*) from per_user_week where days >= 3)),
  'daily', (select jsonb_agg(jsonb_build_object(
      'day', d.day,
      'learners', (select count(distinct user_id) from ev where ev.day = d.day),
      'answers', (select count(*) from ev where ev.day = d.day),
      'signups', (select count(*) from users where joined = d.day)) order by d.day) from days d),
  'week', jsonb_build_object(
    'answers', (select count(*) from wk),
    'prev_answers', (select count(*) from ev, t where day >= t.today - 14 and day < t.today - 7),
    'minutes', (select round(coalesce(sum(ms), 0) / 60000.0) from wk),
    'median_minutes', (select round(percentile_cont(0.5) within group (order by minutes)::numeric, 1) from per_user_week),
    'right_pct', (select round(100.0 * count(*) filter (where quality >= 3) / nullif(count(*) filter (where quality is not null), 0)) from wk),
    'sources', (select coalesce(jsonb_object_agg(source, n), '{}'::jsonb) from (select source, count(*) n from wk group by source) s),
    'hours', (select coalesce(jsonb_object_agg(h, n), '{}'::jsonb) from (select extract(hour from local_at)::int h, count(*) n from wk group by 1) s)),
  'came_back', jsonb_build_object(
    'cohort', (select count(*) from cohort),
    'active_last_week', (select count(distinct wk.user_id) from wk join cohort c on c.id = wk.user_id)),
  'lessons', (select coalesce(jsonb_agg(jsonb_build_object('book', book, 'lesson', lesson, 'learners', learners, 'answers', answers)
      order by learners desc, answers desc), '[]'::jsonb)
      from (select * from lessons where learners >= 3 order by learners desc, answers desc limit 10) l),
  'hard_cards', (select coalesce(jsonb_agg(jsonb_build_object('card', card_id, 'learners', learners, 'answers', answers, 'right_pct', right_pct)
      order by right_pct, answers desc), '[]'::jsonb)
      from (select * from cards where learners >= 3 and answers >= 8 and right_pct is not null order by right_pct, answers desc limit 12) c),
  'review', jsonb_build_object(
    'learners_with_records', (select count(*) from piles),
    'learners_with_due', (select count(*) from piles where due > 0),
    'median_due', (select percentile_cont(0.5) within group (order by due) from piles where due > 0),
    'learners_100_due', (select count(*) from piles where due >= 100),
    'daily_learners', (select count(distinct user_id) from daily_days),
    'daily_days', (select count(*) from daily_days),
    'daily_finished', (select count(*) from daily_days where words >= coalesce(target, 1000) or ms >= 300000),
    'came_back', (select count(*) from came_back),
    'came_back_right_pct', (select round(100.0 * count(*) filter (where quality >= 3) / nullif(count(*), 0)) from came_back),
    'came_back_by_gap', (select coalesce(jsonb_agg(jsonb_build_object('gap', gap, 'answers', answers, 'right_pct', right_pct) order by ord), '[]'::jsonb)
      from (select case when gap_days < 4 then 1 when gap_days < 15 then 2 else 3 end as ord,
                   case when gap_days < 4 then '1-3 days' when gap_days < 15 then '4-14 days' else '15+ days' end as gap,
                   count(*) as answers, round(100.0 * count(*) filter (where quality >= 3) / count(*)) as right_pct
            from came_back group by 1, 2) g)),
  'social', jsonb_build_object(
    'seen_in_study_together_24h', (select count(*) from public.profile_cards where last_seen > now() - interval '24 hours'),
    'seen_in_study_together_week', (select count(*) from public.profile_cards where last_seen > now() - interval '7 days'),
    'usernames', (select count(*) from public.usernames),
    'friend_adds_week', (select count(*) from public.friend_adds where created_at > now() - interval '7 days'),
    'messages_week', (select count(*) from public.direct_messages where created_at > now() - interval '7 days'),
    'messagers_week', (select count(distinct sender) from public.direct_messages where created_at > now() - interval '7 days')),
  'feedback_week', (select count(*) from private.feedback where created_at > now() - interval '7 days')
);
