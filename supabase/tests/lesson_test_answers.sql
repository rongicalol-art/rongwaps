-- Run after 20261124120000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/lesson_test_answers.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('anon', 'private.lesson_test_question_stats', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.lesson_test_question_stats', 'SELECT'), 'nobody reads the counts through the API';
  assert not has_table_privilege('authenticated', 'private.lesson_test_question_stats', 'INSERT'), 'counts change only through record_lesson_test_answers';
  assert not has_function_privilege('anon', 'public.record_lesson_test_answers(text,jsonb)', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.record_lesson_test_answers(text,jsonb)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'private.lesson_test_question_stats'::regclass);
  assert not exists (select 1 from information_schema.columns where table_schema = 'private'
    and table_name = 'lesson_test_question_stats' and (column_name ~ 'user|account|run|day|at$' or data_type like 'timestamp%' or data_type = 'date')),
    'the counts keep no account, run or time';
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('fd000000-0000-4000-8000-000000000001', 's999999999971@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'answers-test-1', 'google',
  jsonb_build_object('sub', 'answers-test-1', 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id = 'fd000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fd000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare
  bad jsonb;
begin
  perform public.record_lesson_test_answers('b3l10',
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":2,"r":0.75},{"q":"b3l10-cause-2-q","e":"abcd1234","p":-1,"r":0.5}]');
  perform public.record_lesson_test_answers('b3l10', '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":2,"r":0.25}]');
  foreach bad in array array[
    '[{"q":"b3l11-cause-1-q","e":"abcd1234","p":2,"r":0.5}]',             -- another lesson's question
    '[{"q":"b3l10-cause-1-q","e":"ABCD1234","p":2,"r":0.5}]',             -- edition not lowercase hex
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":12,"r":0.5}]',            -- choice past 9
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":-2,"r":0.5}]',            -- below blank
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":1.5,"r":0.5}]',           -- fractional choice
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":"1","r":0.5}]',           -- choice as text
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":1,"r":1.5}]',             -- rest score over 1
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":1,"r":"x"}]',             -- rest score as text
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":1}]',                     -- missing field
    '[{"q":"b3l10-cause-1-q","e":"abcd1234","p":1,"r":0.5,"u":"me"}]',    -- extra field
    '[{"q":"b3l10-a-q","e":"abcd1234","p":1,"r":0.5},{"q":"b3l10-a-q","e":"abcd1234","p":0,"r":0.5}]', -- same question twice
    '[]', '{"q":"b3l10-a-q"}', '[1]'
  ]::jsonb[] loop
    begin
      perform public.record_lesson_test_answers('b3l10', bad);
      raise exception 'accepted: %', bad;
    exception when invalid_parameter_value then null;
    end;
  end loop;
  begin
    perform public.record_lesson_test_answers('B3L10', '[{"q":"B3L10-a-q","e":"abcd1234","p":1,"r":0.5}]');
    raise exception 'a malformed lesson key was accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
reset role;

do $$
begin
  assert (select answers from private.lesson_test_question_stats where question = 'b3l10-cause-1-q' and pick = 2) = 2;
  assert (select rest_sum from private.lesson_test_question_stats where question = 'b3l10-cause-1-q' and pick = 2) = 1.0;
  assert (select rest_squares from private.lesson_test_question_stats where question = 'b3l10-cause-1-q' and pick = 2) = 0.625;
  assert (select answers from private.lesson_test_question_stats where question = 'b3l10-cause-2-q' and pick = -1) = 1;
  assert (select count(*) from private.lesson_test_question_stats where question like 'b3l10-%') = 2, 'rejected runs counted nothing';
end;
$$;

-- Signed out, nothing goes in.
set local role anon;
do $$
begin
  perform public.record_lesson_test_answers('b3l10', '[{"q":"b3l10-a-q","e":"abcd1234","p":1,"r":0.5}]');
  raise exception 'a signed-out request was accepted';
exception when insufficient_privilege then null;
end;
$$;
reset role;

-- Deleting the account leaves the counts as they are: they were never the account's (Privacy §6).
delete from auth.users where id = 'fd000000-0000-4000-8000-000000000001';
do $$
begin
  assert (select sum(answers) from private.lesson_test_question_stats where question like 'b3l10-%') = 3;
end;
$$;

rollback;
