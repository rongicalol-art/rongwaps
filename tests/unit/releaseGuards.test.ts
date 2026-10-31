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
    'git push --force origin feature',
    'git push origin +feature',
    'git push --no-verify origin feature',
    'git push origin --delete feature',
    'ALLOW_PROTECTED_PUSH=1 git push origin main',
    'git config core.hooksPath /dev/null',
    'git -c core.hooksPath=/tmp/none push origin feature',
    'git config --unset core.hooksPath',
    'gh repo delete rongicalol-art/rongwaps',
  ]) assert.equal(claudeGuard(command), 'deny', command);
});

test('Claude guard asks the owner before live-affecting commands', () => {
  for (const command of [
    'gh pr merge 12 --squash',
    'gh repo edit --visibility private',
    'gh secret set SUPABASE_DB_URL',
    'supabase db push',
    'supabase db dump --linked -f prod.sql',
    'pg_dump postgresql://postgres@db.ylpzxpqyfaayavkvhikw.supabase.co/postgres',
    'npm run games:deploy',
    'curl -X POST https://api.render.com/v1/services/srv/deploys',
  ]) assert.equal(claudeGuard(command), 'ask', command);
});

test('Claude guard allows normal branch work', () => {
  for (const command of [
    'git push -u origin chore/guards-and-checks',
    'git push origin feature/main-menu',
    'gh pr create --base main --fill',
    'supabase db push --dry-run',
    'npx wrangler deploy --dry-run --config games/wrangler.jsonc',
    'npx wrangler deploy --config games/wrangler.staging.jsonc',
    'git config core.hooksPath .githooks',
    'git config --get core.hooksPath && git status',
    'curl https://api.render.com/v1/services',
    'npm test',
  ]) assert.equal(claudeGuard(command), 'allow', command);
});

test('pre-push hook rejects main and production, accepts feature branches', () => {
  assert.equal(prePush('refs/heads/main'), 1);
  assert.equal(prePush('refs/heads/production'), 1);
  assert.equal(prePush('refs/heads/feature/main-menu'), 0);
  assert.equal(prePush('refs/heads/main', { ALLOW_PROTECTED_PUSH: '1' }), 0);
});
