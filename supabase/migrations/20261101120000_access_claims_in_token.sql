-- School access stamped into the access token (expand; backward compatible).
--
-- The Custom Access Token hook already decides, on every sign-in and token
-- refresh, whether this account may use the beta. It now also writes that
-- decision into the token it issues:
--   school_beta: true          (the hook refuses the token otherwise)
--   full_course: true | false  (the private full-course grant)
-- The app reads them instead of two RPCs at start-up, and Express trusts them
-- after checking the token signature, instead of two Supabase calls per token.
--
-- The database does not trust the claims: the PostgREST pre-request check and
-- the restrictive policies keep checking identities on every request, so
-- removing an account from the beta still denies its data requests at once.
-- Lesson content and the app's start-up decision follow at the next token
-- refresh (tokens last one hour). Tokens issued before this migration carry no
-- claims; every reader falls back to the previous checks for them.

begin;

-- The hook runs as supabase_auth_admin; the full-course check is a private
-- SECURITY DEFINER function that role could not call before.
grant execute on function private.full_course_user_allowed(uuid) to supabase_auth_admin;

create or replace function private.school_beta_access_token_hook(event jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  target uuid := (event ->> 'user_id')::uuid;
begin
  if not private.school_beta_user_allowed(target) then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 403, 'message', 'school_beta_only: Use your Shu-Te student Google account.'
    ));
  end if;
  return jsonb_set(
    jsonb_set(event, '{claims,school_beta}', 'true'::jsonb),
    '{claims,full_course}', to_jsonb(private.full_course_user_allowed(target))
  );
end;
$$;

commit;
