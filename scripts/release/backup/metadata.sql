-- One JSON document describing the database, used to prove a restore is
-- complete. Runs in the backup's snapshot (dump.sh) and again on the restored
-- copy (restore-check.sh); the two must match. No learner data: counts and
-- definitions only. Deparsed policy text depends on search_path, so pin it.
SET LOCAL search_path = public, extensions;
WITH backed_up(schema) AS (
  VALUES ('auth'), ('storage'), ('public'), ('private'), ('supabase_migrations')
), tables AS (
  SELECT n.nspname AS schema, c.relname AS name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN backed_up b ON b.schema = n.nspname
  WHERE c.relkind IN ('r', 'p') AND NOT c.relispartition
)
SELECT json_build_object(
  'server_version', current_setting('server_version'),
  'tables', (
    SELECT json_agg(json_build_object(
      'table', schema || '.' || name,
      'rows', (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', schema, name), false, true, '')))[1]::text::bigint
    ) ORDER BY schema, name)
    FROM tables
  ),
  'rls', (
    SELECT json_agg(json_build_object('table', n.nspname || '.' || c.relname, 'enabled', c.relrowsecurity, 'forced', c.relforcerowsecurity) ORDER BY n.nspname, c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'private') AND c.relkind IN ('r', 'p')
  ),
  'policies', (
    SELECT json_agg(json_build_object(
      'table', schemaname || '.' || tablename, 'name', policyname, 'cmd', cmd,
      'permissive', permissive, 'roles', roles, 'using', qual, 'check', with_check
    ) ORDER BY schemaname, tablename, policyname)
    FROM pg_policies
    WHERE schemaname IN ('public', 'private', 'storage')
  ),
  'grants', (
    SELECT json_agg(json_build_object('table', table_schema || '.' || table_name, 'role', grantee, 'privilege', privilege_type) ORDER BY table_schema, table_name, grantee, privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema IN ('public', 'private') AND grantee IN ('anon', 'authenticated', 'service_role')
  ),
  'functions', (
    SELECT json_agg(sig ORDER BY sig)
    FROM (SELECT n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private')) AS f
  ),
  'triggers', (
    SELECT json_agg(trg ORDER BY trg)
    FROM (SELECT n.nspname || '.' || c.relname || ':' || t.tgname AS trg
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND n.nspname IN ('public', 'private', 'auth', 'storage')
      AND (n.nspname IN ('public', 'private') OR t.tgfoid::regproc::text NOT LIKE 'storage.%')) AS g
  ),
  'migrations', (SELECT json_agg(version ORDER BY version) FROM supabase_migrations.schema_migrations),
  'cron_jobs', (SELECT coalesce(json_agg(json_build_object('name', jobname, 'schedule', schedule, 'command', command, 'active', active) ORDER BY jobname), '[]'::json) FROM cron.job),
  'extensions', (
    SELECT json_agg(json_build_object('name', e.extname, 'schema', n.nspname) ORDER BY e.extname)
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
  )
);
