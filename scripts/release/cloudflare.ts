/**
 * Cloudflare deploys of the site for the release workflows (.github/workflows/deploy.yml, rollback.yml).
 * GitHub Actions is the only deployer: it uploads an exact commit after its checks pass, so every release
 * is one auditable workflow run. Each upload is a Worker "version" (the code, the built site and its
 * settings together); a rollback puts an earlier version back in seconds without rebuilding.
 *
 *   node scripts/release/cloudflare.ts deploy   <wrangler config> <commitSha>   (after `npm run build`)
 *   node scripts/release/cloudflare.ts rollback <wrangler config> <versionId|previous>
 *   node scripts/release/cloudflare.ts live     <wrangler config>
 *
 * Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID (or a local `wrangler login`); `deploy` also needs
 * SUPABASE_ANON_KEY (the public key the build used). Writes `key=value` lines to $GITHUB_OUTPUT when set.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface Deployment {
  id: string;
  created_on: string;
  versions: Array<{ version_id: string; percentage: number }>;
}

const WRANGLER = fileURLToPath(new URL('../../node_modules/.bin/wrangler', import.meta.url));

function wrangler(args: string[], inherit = false): string {
  return execFileSync(WRANGLER, args, {
    encoding: 'utf8', stdio: ['ignore', inherit ? 'inherit' : 'pipe', 'inherit'], maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
}

/** The version serving all traffic in a deployment (releases never split traffic). */
export const versionOf = (deployment: Deployment | undefined) =>
  deployment?.versions.find((version) => version.percentage === 100)?.version_id;

/** Oldest first. Empty for a Worker that has never been deployed. */
export function listDeployments(config: string): Deployment[] {
  let raw: string;
  try { raw = wrangler(['deployments', 'list', '--config', config, '--json']); } catch { return []; }
  const rows = JSON.parse(raw) as Deployment[];
  return [...rows].sort((a, b) => a.created_on.localeCompare(b.created_on));
}

/** The version that was live before the current one: the rollback target. */
export function previousVersion(deployments: Deployment[]): string | undefined {
  const live = versionOf(deployments.at(-1));
  return deployments.slice(0, -1).map(versionOf).reverse().find((version) => version && version !== live);
}

/** The commit a version was built from (recorded in its message at deploy time). */
export function commitOf(config: string, versionId: string): string {
  try {
    const view = JSON.parse(wrangler(['versions', 'view', versionId, '--config', config, '--json'])) as { annotations?: Record<string, string> };
    return /\b[0-9a-f]{40}\b/.exec(view.annotations?.['workers/message'] ?? '')?.[0] ?? '';
  } catch { return ''; }
}

function output(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function main([command, config, target]: string[]) {
  if (!config) throw new Error('wrangler config required');
  const before = listDeployments(config);
  const live = versionOf(before.at(-1));
  if (command === 'live') {
    output({ live_version: live ?? '', live_commit: live ? commitOf(config, live) : '' });
    return;
  }
  if (command === 'deploy') {
    if (!/^[0-9a-f]{40}$/.test(target ?? '')) throw new Error('full commit sha required');
    if (live && commitOf(config, live) === target) {
      console.log(`cloudflare: ${target.slice(0, 8)} is already live`);
      output({ previous_version: live, version: live });
      return;
    }
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) throw new Error('SUPABASE_ANON_KEY is not set');
    output({ previous_version: live ?? '' });
    wrangler(['deploy', '--config', config, '--tag', target.slice(0, 12), '--message', `release ${target}`,
      '--var', `COMMIT:${target}`, '--var', `SUPABASE_ANON_KEY:${anonKey}`], true);
    const version = versionOf(listDeployments(config).at(-1));
    if (!version || version === live) throw new Error('the deploy did not become the live version');
    output({ version });
    return;
  }
  if (command === 'rollback') {
    const goal = target && target !== 'previous' ? target : previousVersion(before);
    if (!goal) throw new Error(`no rollback target (${target ?? 'previous'}) among the last ${before.length} deployments`);
    const commit = commitOf(config, goal);
    console.log(`cloudflare: rolling back to version ${goal} (${commit.slice(0, 8) || 'unknown commit'})`);
    wrangler(['rollback', goal, '--config', config, '--message', `rollback from ${live ?? 'nothing'}`, '--yes'], true);
    output({ version: goal, commit });
    return;
  }
  throw new Error(`unknown command ${command}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error: unknown) {
    console.error(`cloudflare: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
    process.exit(1);
  }
}
