import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface ReviewRecord {
  character: string;
  meaning: string | null;
  pinyin: string | null;
  strategy: string;
  hook: string | null;
  reason: string | null;
  acceptance: string;
  parts: Array<{ glyph: string; suggestedLabel: string | null; glosses: string[]; inside: string | null }>;
  validation: { valid: boolean; issues: Array<{ code: string; severity: string; message: string }> };
  reviewed?: boolean;
}

function parseArgs(): { artifact: string; out: string; samplePct: number; includeFailed: boolean } {
  const args = process.argv.slice(2);
  const value = (flag: string, fallback: string): string => {
    const index = args.indexOf(flag);
    return index > -1 ? args[index + 1] : fallback;
  };
  return {
    artifact: value('--artifact', 'book-1-hooks-v3.json'),
    out: value('--out', 'book-1-review-v1'),
    samplePct: Number(value('--sample-pct', '10')),
    includeFailed: args.includes('--include-failed'),
  };
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function partLabel(part: ReviewRecord['parts'][number]): string {
  const label = part.suggestedLabel ?? part.glosses[0] ?? null;
  return `${part.glyph}${label ? `(${label})` : ''}${part.inside ? ` inside ${part.inside}` : ''}`;
}

function buildHtml(records: ReviewRecord[], artifactName: string): string {
  const payload = JSON.stringify(records.map((record) => ({
    character: record.character,
    meaning: record.meaning,
    pinyin: record.pinyin,
    strategy: record.strategy,
    hook: record.hook,
    reason: record.reason,
    acceptance: record.acceptance,
    parts: record.parts.map(partLabel),
    issues: record.validation.issues.map((issue) => issue.message),
  })));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Book 1 hook review</title>
<style>
  :root { color-scheme: light dark; --card:#fff; --bg:#f4f5f7; --ink:#1c1d21; --muted:#6b7280; --line:#e5e7eb; --brand:#2563eb; --good:#059669; --bad:#dc2626; }
  @media (prefers-color-scheme: dark) { :root { --card:#1e1f24; --bg:#131417; --ink:#eceef2; --muted:#9aa1ad; --line:#2c2e35; --brand:#60a5fa; --good:#34d399; --bad:#f87171; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  header { position: sticky; top:0; z-index:2; background:var(--card); border-bottom:1px solid var(--line); padding:12px 20px; display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  h1 { font-size:16px; margin:0 16px 0 0; }
  #progress { color:var(--muted); font-variant-numeric: tabular-nums; }
  .spacer { flex:1; }
  button { font:inherit; border:1px solid var(--line); background:var(--card); color:var(--ink); border-radius:8px; padding:6px 12px; cursor:pointer; }
  button:hover { border-color:var(--brand); color:var(--brand); }
  button.primary { background:var(--brand); border-color:var(--brand); color:#fff; }
  button.primary:hover { opacity:.9; color:#fff; }
  main { display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(420px, 1fr)); padding:20px; max-width:1400px; margin:0 auto; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; display:flex; flex-direction:column; gap:10px; }
  .card.done { opacity:.55; }
  .top { display:flex; gap:14px; align-items:flex-start; }
  .hanzi { font-size:64px; line-height:1; font-family:"PingFang TC","Noto Sans TC","Microsoft JhengHei",serif; }
  .meta { flex:1; }
  .meaning { font-weight:600; }
  .sub { color:var(--muted); font-size:13px; }
  .hook { background:color-mix(in srgb, var(--brand) 8%, transparent); border-radius:10px; padding:10px 12px; }
  .hook.empty { color:var(--muted); font-style:italic; }
  .parts { display:flex; flex-wrap:wrap; gap:6px; }
  .chip { font-size:12px; border:1px solid var(--line); border-radius:999px; padding:2px 9px; color:var(--muted); }
  .issues { font-size:13px; color:var(--bad); }
  .actions { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
  .actions .grow { flex:1; }
  textarea { width:100%; min-height:64px; font:inherit; border:1px solid var(--line); border-radius:8px; padding:8px; background:var(--bg); color:var(--ink); }
  .badge { font-size:12px; border-radius:999px; padding:2px 10px; border:1px solid var(--line); color:var(--muted); }
  .badge.approve { color:var(--good); border-color:var(--good); }
  .badge.edit { color:var(--brand); border-color:var(--brand); }
  .badge.reject { color:var(--bad); border-color:var(--bad); }
  input.note { flex:1; font:inherit; border:1px solid var(--line); border-radius:8px; padding:6px 9px; background:var(--bg); color:var(--ink); }
</style>
</head>
<body>
<header>
  <h1>Book 1 hooks — review</h1>
  <span id="progress"></span>
  <span class="spacer"></span>
  <span class="sub" id="hint">Approve, fix, or reject each hook. Progress saves in this browser.</span>
  <button id="export" class="primary">Export decisions</button>
  <button id="clear">Clear all</button>
</header>
<main id="cards"></main>
<script>
const ARTIFACT = ${JSON.stringify(artifactName)};
const RECORDS = ${payload};
const KEY = 'book1-hook-review-v1:' + ARTIFACT;
const state = JSON.parse(localStorage.getItem(KEY) || '{}');
const cards = document.getElementById('cards');

function save() { localStorage.setItem(KEY, JSON.stringify(state)); render(); }

function decide(character, action, hook, note) {
  if (action === 'clear') delete state[character];
  else state[character] = { character, action, hook: hook ?? null, note: note || null, at: new Date().toISOString() };
  save();
}

function render() {
  cards.innerHTML = '';
  let done = 0;
  for (const record of RECORDS) {
    const decision = state[record.character];
    if (decision) done++;
    const card = document.createElement('section');
    card.className = 'card' + (decision ? ' done' : '');
    const issues = record.issues.length ? '<div class="issues">' + record.issues.map(issue => '· ' + escapeHtml(issue)).join('<br>') + '</div>' : '';
    const hook = record.hook ? escapeHtml(record.hook) : '<span class="empty">no hook</span>';
    const badge = decision ? '<span class="badge ' + decision.action + '">' + decision.action + '</span>' : '';
    card.innerHTML =
      '<div class="top"><div class="hanzi">' + record.character + '</div><div class="meta">' +
      '<div class="meaning">' + escapeHtml(record.meaning || 'no meaning') + (record.pinyin ? ' · ' + escapeHtml(record.pinyin) : '') + '</div>' +
      '<div class="sub">' + record.strategy + ' · ' + record.acceptance + '</div>' +
      '<div class="parts">' + record.parts.map(part => '<span class="chip">' + escapeHtml(part) + '</span>').join('') + '</div>' +
      '</div>' + badge + '</div>' +
      '<div class="hook">' + hook + '</div>' + issues +
      '<div class="actions">' +
      '<button data-approve>Approve</button>' +
      '<button data-edit>Edit</button>' +
      '<button data-reject>Reject</button>' +
      '<button data-clear>Reset</button>' +
      '<input class="note" placeholder="note (optional)" value="' + escapeHtml(decision?.note || '') + '">' +
      '</div>' +
      '<div class="editor" hidden><textarea>' + escapeHtml(record.hook || '') + '</textarea><div class="actions" style="margin-top:8px"><button class="primary" data-save>Save edit</button><button data-cancel>Cancel</button></div></div>';
    const note = () => card.querySelector('.note').value;
    card.querySelector('[data-approve]').onclick = () => decide(record.character, 'approve', record.hook, note());
    card.querySelector('[data-reject]').onclick = () => decide(record.character, 'reject', null, note());
    card.querySelector('[data-clear]').onclick = () => decide(record.character, 'clear');
    const editor = card.querySelector('.editor');
    card.querySelector('[data-edit]').onclick = () => { editor.hidden = false; };
    card.querySelector('[data-cancel]').onclick = () => { editor.hidden = true; };
    card.querySelector('[data-save]').onclick = () => decide(record.character, 'edit', card.querySelector('textarea').value.trim(), note());
    cards.appendChild(card);
  }
  document.getElementById('progress').textContent = done + ' / ' + RECORDS.length + ' reviewed';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

document.getElementById('export').onclick = () => {
  const decisions = Object.values(state);
  const blob = new Blob([JSON.stringify({ artifact: ARTIFACT, exportedAt: new Date().toISOString(), decisions }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = ARTIFACT.replace(/\\.json$/, '') + '-decisions.json';
  link.click();
};
document.getElementById('clear').onclick = () => { if (confirm('Clear all review decisions in this browser?')) { localStorage.removeItem(KEY); location.reload(); } };

render();
</script>
</body>
</html>
`;
}

function main(): void {
  const options = parseArgs();
  const artifact = JSON.parse(readFileSync(resolve(OUTPUT_DIR, options.artifact), 'utf8')) as {
    records: ReviewRecord[];
  };
  const unreviewed = artifact.records.filter((record) => !record.reviewed);
  const queue = unreviewed.filter((record) => (
    record.acceptance === 'flagged'
    || record.acceptance === 'none'
    || (options.includeFailed && record.acceptance === 'failed')
  ));
  const clean = unreviewed.filter((record) => record.acceptance === 'clean');
  const random = seededRandom(20260914);
  const sample = clean.filter(() => random() < options.samplePct / 100);
  const selected = [...queue, ...sample];

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(resolve(OUTPUT_DIR, `${options.out}.html`), buildHtml(selected, options.artifact));
  writeFileSync(resolve(OUTPUT_DIR, `${options.out}.json`), `${JSON.stringify({
    artifact: options.artifact,
    generatedAt: new Date().toISOString(),
    counts: {
      queue: queue.length,
      cleanSample: sample.length,
      selected: selected.length,
    },
    decisions: selected.map((record) => ({ character: record.character, action: null, hook: null, note: null })),
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    artifact: options.artifact,
    flagged: unreviewed.filter((record) => record.acceptance === 'flagged').length,
    failed: unreviewed.filter((record) => record.acceptance === 'failed').length,
    none: unreviewed.filter((record) => record.acceptance === 'none').length,
    cleanSample: sample.length,
    selected: selected.length,
    html: resolve(OUTPUT_DIR, `${options.out}.html`),
    json: resolve(OUTPUT_DIR, `${options.out}.json`),
  }, null, 2));
}

main();
