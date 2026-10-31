#!/usr/bin/env node
/**
 * Claude Code PreToolUse guard for Bash. GitHub cannot lock branches on this
 * free private repo, so this hook (with .githooks/pre-push and the Codex rules)
 * keeps AI sessions from reaching learners without the owner.
 *
 * deny: never done by an AI session (the owner does these by hand if needed).
 * ask:  runs only after the owner approves the prompt.
 *
 * A guardrail against mistakes, not a sandbox: the hard gates are elsewhere
 * (Render deploys only commits whose CI passed on main/production, and only
 * the owner merges into production). See docs/RELEASING.md → Guards.
 */
import { readFileSync } from 'node:fs';

const PRODUCTION_DB_REF = 'ylpzxpqyfaayavkvhikw';

/** Shell quoting can split words (`pu'sh'`); match on the words the shell would see. */
function normalize(command) {
  return command.replace(/\\\n/g, ' ').replace(/['"\\]/g, '');
}

/** Simple commands, split on shell operators, so one command's text never vouches for another. */
function segments(command) {
  return normalize(command).split(/\|\||&&|[;|&\n]/).map((part) => part.trim()).filter(Boolean);
}

const METHOD = /(?:\s-X\s*|\s--(?:request|method)[=\s]+)(POST|PUT|PATCH|DELETE)\b/i;
const BODY = /\s(?:-d|--data(?:-raw|-binary|-urlencode)?|--json|-F|--form|-T|--upload-file|-f|--field|--raw-field|--input)(?:[=\s]|$)/;
const mutates = (s) => METHOD.test(s) || BODY.test(s);
const deletes = (s) => /(?:\s-X\s*|\s--(?:request|method)[=\s]+)DELETE\b/i.test(s);
const isPush = (s) => /\bgit\b.*\spush\b/.test(s);
const isLocalDb = (s) => /\bdocker\s+exec\b|localhost|127\.0\.0\.1|\[?::1\]?|\/var\/run\/postgresql/.test(s);
// Conversation on a PR (comments, replies, resolving threads) is not a release action.
const prConversation = (s) => /\/(?:issues|pulls)\/\d+\/comments\b|\/pulls\/comments\/\d+\/replies\b|\b(?:resolveReviewThread|addPullRequestReviewThreadReply|addComment)\b/.test(s);

const DENY = [
  [(s) => isPush(s) && /(?:\s|:|refs\/heads\/)(?:main|production)(?=\s|$)/.test(s), 'Pushing to main or production is blocked. Push a feature branch and open a PR.'],
  [(s) => isPush(s) && /\s(?:--force(?:-with-lease|-if-includes)?\b|-(?!-)[A-Za-z]*f[A-Za-z]*(?=\s|$)|\+\S)/.test(s), 'Force push is blocked. Make a new commit instead.'],
  [(s) => isPush(s) && /\s--no-verify\b/.test(s), 'Skipping the pre-push guard is blocked.'],
  [(s) => isPush(s) && /\s(?:--delete\b|--prune\b|--mirror\b|-(?!-)[A-Za-z]*d[A-Za-z]*(?=\s|$)|:\S)/.test(s), 'Deleting or pruning remote branches is blocked. Ask the owner.'],
  [(s) => /\bALLOW_PROTECTED_PUSH=\S/.test(s), 'The protected-push override is owner-only.'],
  [(s) => /--unset(?:-all)?\s+core\.hooksPath|core\.hooksPath(?:=|\s+)(?!\.githooks(?:\s|$)|$)/.test(s), 'Changing the git hooks path would disable the guards.'],
  [(s) => /\bgh\s+repo\s+(?:delete|archive|rename)\b/.test(s), 'Repository delete/archive/rename is owner-only.'],
  [(s) => (/\bgh\s+api\b/.test(s) || /\bapi\.github\.com\b/.test(s)) && deletes(s) && !prConversation(s), 'DELETE calls to the GitHub API are owner-only.'],
];

const ASK = [
  [(s) => /\bgh\s+pr\s+merge\b/.test(s), 'Merging a PR changes staging or the live site. Owner approval needed.'],
  [(s) => /\bgh\s+repo\s+edit\b/.test(s), 'Repository settings change. Owner approval needed.'],
  [(s) => /\bgh\s+(?:secret|variable)\s+(?:set|delete|remove)\b/.test(s), 'GitHub secret/variable change. Owner approval needed.'],
  [(s) => /\bgh\s+workflow\s+(?:run|enable|disable)\b/.test(s), 'Running or toggling a workflow (release, rollback, backup). Owner approval needed.'],
  [(s) => (/\bgh\s+api\b/.test(s) || /\bapi\.github\.com\b/.test(s)) && mutates(s) && !prConversation(s) && !(/\bgraphql\b/.test(s) && !/\bmutation\b/.test(s)), 'GitHub API change (merges, settings). Owner approval needed.'],
  [(s) => /\bsupabase\s+db\s+push\b/.test(s) && !/\s--dry-run(?:\s|$)/.test(s), 'Applying migrations to a hosted database. Owner approval needed.'],
  [(s) => /\bsupabase\s+(?:link\b|db\s+(?:reset|dump)\b[^]*--linked|migration\s+repair\b[^]*--linked)/.test(s), 'Linked (production) database command. Owner approval needed.'],
  [(s) => /(?:^|\s|\/)(?:psql|pg_dump|pg_dumpall|pg_restore)(?:\s|$)/.test(s) && !isLocalDb(s), 'Database client on a non-local target. Owner approval needed.'],
  [(s) => /\bdump\.sh\b/.test(s) && !isLocalDb(s), 'Backup dump against a hosted database. Owner approval needed.'],
  [(s) => s.includes(PRODUCTION_DB_REF) && /\b(?:psql|pg_dump|pg_restore|supabase|curl|wget|node|tsx|npx)\b/.test(s), 'This command touches the production database. Owner approval needed.'],
  [(s) => (/\bwrangler\s+deploy\b/.test(s) && !/\s--config\s+\S*wrangler\.staging\.jsonc(?:\s|$)|\s--env\s+staging(?:\s|$)/.test(s) && !/\s--dry-run(?:\s|$)/.test(s)) || /\bnpm\s+run\s+games:deploy\b/.test(s), 'Deploying the live games Worker. Owner approval needed.'],
  [(s) => /\bwrangler\s+(?:secret\s+(?:put|delete|bulk)|r2\s+bucket\s+(?:create|delete|lifecycle|lock|cors|domain|dev-url|notification)|r2\s+object\s+(?:put|delete))\b/.test(s), 'Cloudflare setting or stored object change. Owner approval needed.'],
  [(s) => /\bnpm\s+run\s+audio:sync:r2\b/.test(s), 'Uploading to the live audio bucket. Owner approval needed.'],
  [(s) => /\bapi\.render\.com\b/.test(s) && mutates(s), 'Render API change (deploy, rollback, settings). Owner approval needed.'],
  [(s) => /\bapi\.cloudflare\.com\b/.test(s) && mutates(s), 'Cloudflare API change. Owner approval needed.'],
];

export function decide(command) {
  const parts = segments(command);
  for (const [test, reason] of DENY) if (parts.some(test)) return ['deny', reason];
  for (const [test, reason] of ASK) if (parts.some(test)) return ['ask', reason];
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
