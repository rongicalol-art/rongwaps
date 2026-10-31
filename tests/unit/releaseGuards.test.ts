import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// GitHub cannot lock branches on a free private repo, so these guards are the
// lock. A regression here would let an AI session push straight to learners.

function claudeGuard(command: string): string {
  const run = spawnSync('node', ['.claude/hooks/guard.mjs'], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  return run.stdout ? JSON.parse(run.stdout).hookSpecificOutput.permissionDecision : 'allow';
}

function prePush(remoteRef: string, env: Record<string, string> = {}): number | null {
  const sha = '1'.repeat(40);
  return spawnSync('sh', ['.githooks/pre-push', 'origin', 'https://example.invalid/repo.git'], {
    input: `refs/heads/work ${sha} ${remoteRef} ${'0'.repeat(40)}\n`,
    encoding: 'utf8',
    env: { ...process.env, ALLOW_PROTECTED_PUSH: '', ...env },
  }).status;
}

test('Claude guard blocks pushes that skip pull requests', () => {
  for (const command of [
    'git push origin main',
    'git push origin HEAD:main',
    'git add -A && git push origin production',
    'git -C ../other push origin refs/heads/main',
    "git pu'sh' --no-'verify' origin feature",
    'git push --force origin feature',
    'git push -fu origin feature',
    'git push origin +feature',
    'git push --no-verify origin feature',
    'git push origin --delete feature',
    'git push origin :feature',
    'git push --prune origin',
    'ALLOW_PROTECTED_PUSH=1 git push origin main',
    'git config core.hooksPath /dev/null',
    'git config core.hooksPath .githooks-disabled',
    'git -c core.hooksPath=/tmp/none push origin feature',
    'git config --unset core.hooksPath',
    'gh repo delete rongicalol-art/rongwaps',
    'curl -X DELETE https://api.github.com/repos/o/r/git/refs/heads/x',
    'gh api --method=DELETE repos/o/r/git/refs/heads/x',
  ]) assert.equal(claudeGuard(command), 'deny', command);
});

test('Claude guard asks the owner before live-affecting commands', () => {
  for (const command of [
    'gh pr merge 12 --squash',
    'gh api -X PUT repos/o/r/pulls/12/merge',
    'gh api repos/o/r/pulls/12/merge -f merge_method=squash',
    'gh repo edit --visibility private',
    'gh secret set SUPABASE_DB_URL',
    'gh workflow run backup.yml -f reason=pre-migration',
    'supabase db push',
    'supabase link --project-ref abc',
    'supabase db dump --linked -f prod.sql',
    'psql "$DATABASE_URL" -c "select 1"',
    'DATABASE_URL=$PROD scripts/release/backup/dump.sh out',
    'pg_dump postgresql://postgres@db.ylpzxpqyfaayavkvhikw.supabase.co/postgres',
    'npm run games:deploy',
    'npx wrangler deploy --config games/wrangler.jsonc --dry-run=false',
    'npx wrangler deploy --name staging-but-not-really',
    'npx wrangler r2 bucket create rongwaps-backups',
    'curl -X POST https://api.render.com/v1/services/srv/deploys',
    'curl --request=POST https://api.render.com/v1/services/srv/rollback',
    'curl -d "{}" https://api.render.com/v1/services/srv/deploys',
    'curl --json "{}" https://api.cloudflare.com/client/v4/accounts/a/workers/scripts/x',
  ]) assert.equal(claudeGuard(command), 'ask', command);
});

test('Claude guard allows normal branch and local work', () => {
  for (const command of [
    'git push -u origin chore/guards-and-checks',
    'git push origin feature/main-menu',
    'gh pr create --base main --fill',
    'gh pr view 6 --json reviews',
    'gh api repos/o/r/pulls/6/comments',
    'gh api repos/o/r/pulls/6/comments/123/replies -f body=Fixed',
    'gh api graphql -f query="{ viewer { login } }"',
    'gh api graphql -f query="mutation { resolveReviewThread(input: {threadId: \\"x\\"}) { thread { id } } }"',
    'supabase db push --dry-run',
    'npx wrangler deploy --dry-run --config games/wrangler.jsonc',
    'npx wrangler deploy --config games/wrangler.staging.jsonc',
    'docker exec -i db psql -h localhost -U postgres -c "select 1"',
    'docker exec db bash /tmp/backup-scripts/dump.sh /tmp/out',
    'git config core.hooksPath .githooks',
    'git config --get core.hooksPath && git status',
    'curl https://api.render.com/v1/services',
    'grep -rn ylpzxpqyfaayavkvhikw docs',
    'npm test',
  ]) assert.equal(claudeGuard(command), 'allow', command);
});

test('pre-push hook rejects main and production, accepts feature branches', () => {
  assert.equal(prePush('refs/heads/main'), 1);
  assert.equal(prePush('refs/heads/production'), 1);
  assert.equal(prePush('refs/heads/feature/main-menu'), 0);
  assert.equal(prePush('refs/heads/main', { ALLOW_PROTECTED_PUSH: '1' }), 0);
});
