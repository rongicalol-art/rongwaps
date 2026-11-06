import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Dev-only: one Codex call, read-only in an empty folder, waiting out usage limits. */
const CODEX = '/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex';
const USAGE_WAIT_MS = 20 * 60_000;
const CALL_TIMEOUT_MS = 15 * 60_000;

function runOnce(model: string, effort: string, prompt: string, sandbox: string, lastMessage: string, log: string): Promise<string> {
  return new Promise((resolveRun) => {
    const child = spawn(CODEX, ['exec', '-m', model, '-c', `model_reasoning_effort=${effort}`, '-s', 'read-only', '--skip-git-repo-check', '--ephemeral', '-C', sandbox, '-o', lastMessage, prompt], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const timer = setTimeout(() => child.kill('SIGTERM'), CALL_TIMEOUT_MS);
    child.on('close', () => { clearTimeout(timer); void writeFile(log, output, 'utf8').then(() => resolveRun(output)); });
  });
}

/** Codex's last message for `prompt` ('' when it gave none); logs go to `<dir>/logs/<name>.*`. */
export async function askCodex(dir: string, name: string, model: string, effort: string, prompt: string): Promise<string> {
  for (const sub of ['logs', 'sandbox']) await mkdir(resolve(dir, sub), { recursive: true });
  const last = resolve(dir, 'logs', `${name}.last.md`);
  // Entry ids hold a NUL separator; argv can't, so write it the way JSON does.
  const safePrompt = prompt.split(String.fromCharCode(0)).join('\\u0000');
  for (let wait = 0; wait < 8; wait += 1) {
    const output = await runOnce(model, effort, safePrompt, resolve(dir, 'sandbox'), last, resolve(dir, 'logs', `${name}.log`));
    if (!/usage limit/i.test(output)) break;
    console.log(`[${name}] Codex usage limit, waiting 20 min`);
    await new Promise((done) => setTimeout(done, USAGE_WAIT_MS));
  }
  return existsSync(last) ? readFile(last, 'utf8') : '';
}

/** The JSON array in a reply, or null. */
export function replyArray(text: string): unknown {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  try {
    return start >= 0 && end > start ? JSON.parse(text.slice(start, end + 1)) : null;
  } catch {
    return null;
  }
}

/** Runs `task` over `items`, `concurrency` at a time. */
export async function eachLimited<T>(items: readonly T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => { while (next < items.length) await task(items[next++]); };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
}
