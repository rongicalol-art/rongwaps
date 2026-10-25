-- Run after 20261025120000. All synthetic fixtures roll back.
begin;
do $$
begin
  assert not has_table_privilege('anon', 'private.feedback', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.feedback', 'SELECT');
  assert not has_table_privilege('authenticated', 'private.feedback', 'INSERT');
  assert not has_function_privilege('anon', 'public.submit_feedback(uuid,text,text,text,text)', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.submit_feedback(uuid,text,text,text,text)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'private.feedback'::regclass);
end;
$$;
insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values ('fb000000-0000-4000-8000-000000000001', 's999999999990@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities(user_id, provider_id, provider, identity_data)
values ('fb000000-0000-4000-8000-000000000001', 'feedback-test-only', 'google',
  '{"sub":"feedback-test-only","email":"s999999999990@stu.edu.tw","email_verified":true,"custom_claims":{"hd":"stu.edu.tw"}}');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"fb000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert public.submit_feedback('fb100000-0000-4000-8000-000000000001', 'Test message', '/library', 'Test browser', 'test');
  assert not public.submit_feedback('fb100000-0000-4000-8000-000000000001', 'Test message', '/library', 'Test browser', 'test');
  begin
    perform public.submit_feedback('fb100000-0000-4000-8000-000000000001', 'Changed message', '/library', 'Test browser', 'test');
    raise exception 'Changed payload unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform * from private.feedback;
    raise exception 'Inbox unexpectedly readable';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_feedback('fb100000-0000-4000-8000-000000000002', ' ', '/library', 'Test browser', 'test');
    raise exception 'Empty message unexpectedly accepted';
  exception when check_violation then null;
  end;
  for i in 2..5 loop
    perform public.submit_feedback(('fb100000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid, 'Test message', '/library', 'Test browser', 'test');
  end loop;
  begin
    perform public.submit_feedback('fb100000-0000-4000-8000-000000000006', 'Test message', '/library', 'Test browser', 'test');
    raise exception using errcode = 'XX000', message = 'Hourly cap unexpectedly bypassed';
  exception when raise_exception then null;
  end;
  assert not public.submit_feedback('fb100000-0000-4000-8000-000000000001', 'Test message', '/library', 'Test browser', 'test');
end;
$$;
select set_config('request.jwt.claims', '{"sub":"fb000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  begin
    perform public.submit_feedback('fb100000-0000-4000-8000-000000000007', 'Test message', '/', '', 'test');
    raise exception 'Unapproved account unexpectedly accepted';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
do $$
begin
  assert (select count(*) = 5 from private.feedback where user_id = 'fb000000-0000-4000-8000-000000000001');
  delete from auth.users where id = 'fb000000-0000-4000-8000-000000000001';
  assert not exists (select 1 from private.feedback where user_id = 'fb000000-0000-4000-8000-000000000001');
end;
$$;
rollback;
