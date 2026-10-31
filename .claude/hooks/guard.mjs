#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard for Bash. GitHub cannot lock branches on this
 * free private repo, so this hook (with .githooks/pre-push and the Codex rules)
 * keeps AI sessions from reaching learners without the owner.
 *
 * deny: never done by an AI session (owner does these by hand if ever needed).
 * ask:  allowed only after the owner approves the prompt.
 * Rules live in docs/RELEASING.md → Guards.
 */
import { readFileSync } from 'node:fs';

const PRODUCTION_DB_REF = 'ylpzxpqyfaayavkvhikw';

const DENY = [
  [/\bgit\b[^|;&]*\bpush\b[^|;&]*(?:\s|:|refs\/heads\/)(?:main|production)(?:\s|$|[;&|])/, 'Pushing to main or production is blocked. Push a feature branch and open a PR.'],
  [/\bgit\b[^|;&]*\bpush\b[^|;&]*(?:\s--force\b|\s-f\b|\s--force-with-lease\b|\s\+\S)/, 'Force push is blocked. Make a new commit instead.'],
  [/\bgit\b[^|;&]*\bpush\b[^|;&]*\s--no-verify\b/, 'Skipping the pre-push guard is blocked.'],
  [/\bgit\b[^|;&]*\bpush\b[^|;&]*\s(?:--delete\b|-d\b|:\S)/, 'Deleting remote branches is blocked. Ask the owner.'],
  [/\bALLOW_PROTECTED_PUSH=\S/, 'The protected-push override is owner-only.'],
  [/--unset(?:-all)?\s+core\.hooksPath|core\.hooksPath(?:=|\s+)(?!\.githooks\b|[&|;]|$)/, 'Changing the git hooks path would disable the guards.'],
  [/\bgh\s+repo\s+(?:delete|archive|rename)\b/, 'Repository delete/archive/rename is owner-only.'],
  [/\bgh\s+api\b[^|;&]*(?:-X|--method)\s*DELETE\b/, 'DELETE calls to the GitHub API are owner-only.'],
];

const ASK = [
  [/\bgh\s+pr\s+merge\b/, 'Merging a PR changes staging or the live site. Owner approval needed.'],
  [/\bgh\s+repo\s+edit\b/, 'Repository settings change. Owner approval needed.'],
  [/\bgh\s+(?:secret|variable)\s+(?:set|delete)\b/, 'GitHub secret/variable change. Owner approval needed.'],
  [/\bgh\s+workflow\s+run\b[^|;&]*\b(?:release|rollback|backup)/, 'Running a release, rollback or backup workflow. Owner approval needed.'],
  [/\bsupabase\s+db\s+push\b(?![^|;&]*--dry-run)/, 'Applying migrations to a hosted database. Owner approval needed.'],
  [/\bsupabase\s+(?:db\s+reset|migration\s+repair)\b[^|;&]*--linked/, 'Changing a hosted database. Owner approval needed.'],
  [new RegExp(`\\b(?:psql|pg_dump|pg_restore|supabase|curl)\\b[^|;&]*${PRODUCTION_DB_REF}`), 'This command touches the production database. Owner approval needed.'],
  [/\bsupabase\s+db\s+dump\b[^|;&]*--linked/, 'Dumping the linked (production) database copies learner data. Owner approval needed.'],
  [/\b(?:wrangler\s+deploy|npm\s+run\s+games:deploy)\b(?![^|;&]*(?:staging|--dry-run))/, 'Deploying the live games Worker. Owner approval needed.'],
  [/\bapi\.render\.com\b[^|;&]*(?:-X|--request|--method)\s*(?:POST|PATCH|PUT|DELETE)\b|(?:-X|--request|--method)\s*(?:POST|PATCH|PUT|DELETE)\b[^|;&]*\bapi\.render\.com\b/, 'Render API change (deploy/rollback/settings). Owner approval needed.'],
];

function decide(command) {
  for (const [pattern, reason] of DENY) if (pattern.test(command)) return ['deny', reason];
  for (const [pattern, reason] of ASK) if (pattern.test(command)) return ['ask', reason];
  return null;
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}
const command = input?.tool_input?.command;
if (typeof command !== 'string') process.exit(0);

const verdict = decide(command);
if (verdict) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: verdict[0],
      permissionDecisionReason: verdict[1],
    },
  }));
}
