/**
 * Render deploys for the release workflows (.github/workflows/deploy.yml,
 * rollback.yml). Render's own auto-deploy stays off: GitHub Actions deploys an
 * exact commit only after its checks pass, so a rollback never re-enables a
 * bad commit and every release is one auditable workflow run.
 *
 *   tsx scripts/release/render.ts deploy   <serviceId> <commitSha>   → prints previous live deploy id
 *   tsx scripts/release/render.ts rollback <serviceId> <deployId|previous>
 *   tsx scripts/release/render.ts live     <serviceId>
 *
 * Needs RENDER_API_KEY. Writes `key=value` lines to $GITHUB_OUTPUT when set.
 */
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = 'https://api.render.com/v1';
const DONE_OK = new Set(['live']);
const DONE_FAILED = new Set(['build_failed', 'update_failed', 'canceled', 'pre_deploy_failed', 'deactivated']);

export interface Deploy {
  id: string;
  status: string;
  trigger?: string;
  commit?: { id?: string; message?: string };
  createdAt?: string;
  finishedAt?: string;
}

async function render<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error('RENDER_API_KEY is not set');
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
    });
    if (response.ok) return (response.status === 202 ? {} : await response.json()) as T;
    if ((response.status === 429 || response.status >= 500) && attempt < 5) {
      await sleep(attempt * 5_000);
      continue;
    }
    throw new Error(`Render ${init.method ?? 'GET'} ${path}: ${response.status} ${(await response.text()).slice(0, 300)}`);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function listDeploys(serviceId: string): Promise<Deploy[]> {
  const rows = await render<Array<{ deploy: Deploy }>>(`/services/${serviceId}/deploys?limit=30`);
  return rows.map((row) => row.deploy);
}

/** The deploy serving traffic now (undefined on a brand-new service). */
export async function liveDeploy(serviceId: string): Promise<Deploy | undefined> {
  return (await listDeploys(serviceId)).find((deploy) => deploy.status === 'live');
}

/** Most recent deploy that was live before the current one: the rollback target. */
export function previousGood(deploys: Deploy[]): Deploy | undefined {
  const sorted = [...deploys].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const liveIndex = sorted.findIndex((deploy) => deploy.status === 'live');
  return sorted.slice(liveIndex + 1).find((deploy) => deploy.status === 'deactivated' && deploy.finishedAt);
}

async function waitUntilLive(serviceId: string, deployId: string, timeoutMinutes = 30): Promise<Deploy> {
  const deadline = Date.now() + timeoutMinutes * 60_000;
  let last = '';
  while (Date.now() < deadline) {
    const deploy = await render<Deploy>(`/services/${serviceId}/deploys/${deployId}`);
    if (deploy.status !== last) console.log(`render: ${deployId} ${deploy.status}`);
    last = deploy.status;
    if (DONE_OK.has(deploy.status)) return deploy;
    if (DONE_FAILED.has(deploy.status)) throw new Error(`deploy ${deployId} ended as ${deploy.status}`);
    await sleep(15_000);
  }
  throw new Error(`deploy ${deployId} not live after ${timeoutMinutes} minutes`);
}

function output(values: Record<string, string>) {
  for (const [key, value] of Object.entries(values)) {
    console.log(`${key}=${value}`);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

async function main([command, serviceId, target]: string[]) {
  if (!serviceId) throw new Error('service id required');
  if (command === 'live') {
    const live = await liveDeploy(serviceId);
    output({ live_deploy: live?.id ?? '', live_commit: live?.commit?.id ?? '' });
    return;
  }
  if (command === 'deploy') {
    if (!/^[0-9a-f]{40}$/.test(target ?? '')) throw new Error('full commit sha required');
    const previous = await liveDeploy(serviceId);
    if (previous?.commit?.id === target) {
      console.log(`render: ${target.slice(0, 8)} is already live`);
      output({ previous_deploy: previous.id, deploy: previous.id });
      return;
    }
    output({ previous_deploy: previous?.id ?? '' });
    const created = await render<Deploy>(`/services/${serviceId}/deploys`, { method: 'POST', body: JSON.stringify({ commitId: target, clearCache: 'do_not_clear' }) });
    if (!created.id) throw new Error('Render queued the deploy without an id; another deploy is in progress');
    output({ deploy: created.id });
    await waitUntilLive(serviceId, created.id);
    return;
  }
  if (command === 'rollback') {
    const deploys = await listDeploys(serviceId);
    const goal = target && target !== 'previous' ? deploys.find((deploy) => deploy.id === target) : previousGood(deploys);
    if (!goal) throw new Error(`no rollback target (${target ?? 'previous'}) among the last ${deploys.length} deploys`);
    console.log(`render: rolling back to ${goal.id} (${goal.commit?.id?.slice(0, 8)} ${goal.commit?.message?.split('\n')[0] ?? ''})`);
    const created = await render<Deploy>(`/services/${serviceId}/rollback`, { method: 'POST', body: JSON.stringify({ deployId: goal.id }) });
    output({ deploy: created.id, commit: goal.commit?.id ?? '' });
    await waitUntilLive(serviceId, created.id, 15);
    return;
  }
  throw new Error(`unknown command ${command}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    console.error(`render: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
