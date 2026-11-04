-- Run after 20261104130000. All synthetic fixtures roll back.
-- supabase db query --file supabase/tests/blocks_and_reports.sql   (local or staging)
begin;

do $$
begin
  assert not has_table_privilege('anon', 'public.user_blocks', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.user_blocks', 'INSERT'), 'blocks are added only through block_user';
  assert not has_table_privilege('authenticated', 'public.user_blocks', 'UPDATE');
  assert has_table_privilege('authenticated', 'public.user_blocks', 'DELETE');
  assert not has_table_privilege('authenticated', 'private.user_reports', 'SELECT');
  assert not has_function_privilege('anon', 'public.report_user(uuid,text,text,text)', 'EXECUTE');
  assert has_function_privilege('authenticated', 'public.block_user(uuid,text,text)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'public.user_blocks'::regclass);
  assert (select relrowsecurity from pg_class where oid = 'private.user_reports'::regclass);
end;
$$;

insert into auth.users (id, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data) values
  ('bb000000-0000-4000-8000-000000000001', 's999999999981@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('bb000000-0000-4000-8000-000000000002', 's999999999982@stu.edu.tw', now(), '{"provider":"google"}', '{}'),
  ('bb000000-0000-4000-8000-000000000003', 's999999999983@stu.edu.tw', now(), '{"provider":"google"}', '{}');
insert into auth.identities (user_id, provider_id, provider, identity_data)
select u.id, 'blocks-test-' || right(u.id::text, 1), 'google',
  jsonb_build_object('sub', 'blocks-test-' || right(u.id::text, 1), 'email', u.email, 'email_verified', true, 'custom_claims', jsonb_build_object('hd', 'stu.edu.tw'))
from auth.users u where u.id::text like 'bb000000-%';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  assert public.block_user('bb000000-0000-4000-8000-000000000002', 'Mei Lin', 'plum');
  assert not public.block_user('bb000000-0000-4000-8000-000000000002', 'Mei Lin', 'plum'), 'blocking twice is a no-op';
  assert not public.block_user('bb000000-0000-4000-8000-0000000000ff'), 'unknown account';
  begin
    perform public.block_user('bb000000-0000-4000-8000-000000000001');
    raise exception 'self-block unexpectedly accepted';
  exception when invalid_parameter_value then null;
  end;
  assert (select count(*) from public.user_blocks) = 1, 'sees only own blocks';
  assert (select blocked_name from public.user_blocks) = 'Mei Lin';
  assert (public.export_my_data() -> 'blocked_people' -> 0 ->> 'name') = 'Mei Lin';
  begin
    insert into public.user_blocks (blocked) values ('bb000000-0000-4000-8000-000000000003');
    raise exception 'direct insert unexpectedly allowed';
  exception when insufficient_privilege then null;
  end;

  assert public.report_user('bb000000-0000-4000-8000-000000000002', 'rude', 'chat', 'a rude line');
  begin
    perform public.report_user('bb000000-0000-4000-8000-000000000002', 'nonsense', 'chat');
    raise exception 'bad reason unexpectedly accepted';
  exception when check_violation then null;
  end;
  for i in 2..20 loop perform public.report_user('bb000000-0000-4000-8000-000000000002', 'spam', 'profile'); end loop;
  begin
    perform public.report_user('bb000000-0000-4000-8000-000000000002', 'spam', 'profile');
    raise exception using errcode = 'XX000', message = 'daily cap unexpectedly bypassed';
  exception when program_limit_exceeded then null;
  end;
  begin
    perform * from private.user_reports;
    raise exception 'reports unexpectedly readable';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Another learner can't see or remove someone else's blocks.
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$
begin
  assert (select count(*) from public.user_blocks) = 0;
  delete from public.user_blocks;
end;
$$;
reset role;
do $$
begin
  assert (select count(*) from public.user_blocks where blocker = 'bb000000-0000-4000-8000-000000000001') = 1, 'still there';
  assert (select count(*) from private.user_reports where reporter = 'bb000000-0000-4000-8000-000000000001') = 20;
end;
$$;

-- The owner removes their own block.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"bb000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
begin
  delete from public.user_blocks where blocked = 'bb000000-0000-4000-8000-000000000002';
  assert (select count(*) from public.user_blocks) = 0;
end;
$$;
reset role;

rollback;
