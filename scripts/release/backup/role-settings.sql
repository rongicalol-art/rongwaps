-- Per-role settings live outside every schema dump: statement timeouts and the
-- PostgREST pre-request hook that enforces the school gate. Emits ALTER ROLE
-- statements to replay after a restore.
SELECT format(
  'ALTER ROLE %I SET %s TO %L;',
  r.rolname,
  array_to_string(ARRAY(SELECT quote_ident(part) FROM unnest(string_to_array(split_part(setting, '=', 1), '.')) AS part), '.'),
  substr(setting, strpos(setting, '=') + 1)
)
FROM pg_db_role_setting s
JOIN pg_roles r ON r.oid = s.setrole
CROSS JOIN LATERAL unnest(s.setconfig) AS setting
WHERE s.setdatabase = 0 AND r.rolname IN ('anon', 'authenticated', 'authenticator', 'service_role')
ORDER BY 1;
