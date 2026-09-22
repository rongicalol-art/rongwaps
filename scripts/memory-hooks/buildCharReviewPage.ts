/**
 * Human review page for the Book 1 character pass.
 *
 * Groups:
 *   unresolved  — 262-flagged hooks the repair loop could not fix (needs a call)
 *   ledger      — hooks blocked on missing/conflicting ledger labels
 *   audit       — 10% random sample of machine passes (trust check)
 *   repair      — verified rewrites, approve or revert (bulk approve available)
 *
 * Output: output/memory-hooks/review/char-review.html
 * Exports: char-review-feedback.json (decisions for the apply step)
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface TriageItem {
  character: string;
  severity: string;
  category: string;
  audit: boolean;
  reasons: string[];
  gapComponents: string[];
  scores: { labels: number; scene: number; parts: number; memory: number };
  soundStripped: boolean;
  hook: string;
  originalHook: string;
}

interface Candidate {
  hook: string;
  issues: string[];
  scores?: { labels: number; scene: number; parts: number; memory: number };
  pass?: boolean;
  chosen?: boolean;
}

interface RepairedItem {
  character: string;
  status: 'fixed' | 'unresolved';
  rounds: number;
  originalHook: string;
  strippedHook: string;
  chosenHook: string | null;
  chosenScores: Candidate['scores'] | null;
  chosenIssues: string[];
  candidates: Candidate[];
}

interface V3Record {
  character: string;
  meaning: string;
  targetDisplayLabel?: string;
  componentsUsed: Array<{ glyph: string; label: string }>;
}

interface ReviewItem {
  character: string;
  group: 'unresolved' | 'ledger' | 'audit' | 'repair';
  meaning: string;
  targetLabel: string;
  components: Array<{ glyph: string; label: string }>;
  beforeText: string;
  afterText: string | null;
  reasons: string[];
  gapComponents: string[];
  scores: Candidate['scores'] | null;
  candidates: Candidate[];
  note: string;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function main() {
  mkdirSync(REVIEW_DIR, { recursive: true });

  const triage = readJson<{ items: TriageItem[] }>(resolve(REVIEW_DIR, 'char-triage-v1.json')).items;
  const repairs = readJson<{ items: RepairedItem[] }>(resolve(REVIEW_DIR, 'char-repairs-v1.json')).items;
  const records = readJson<{ records: V3Record[] }>(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json')).records;
  const recordByCharacter = new Map(records.map((record) => [record.character, record]));
  const triageByCharacter = new Map(triage.map((item) => [item.character, item]));

  const items: ReviewItem[] = [];

  for (const repair of repairs.filter((item) => item.status === 'unresolved')) {
    const record = recordByCharacter.get(repair.character);
    items.push({
      character: repair.character,
      group: 'unresolved',
      meaning: record?.meaning ?? '',
      targetLabel: record?.targetDisplayLabel ?? record?.meaning ?? '',
      components: record?.componentsUsed ?? [],
      beforeText: repair.originalHook,
      afterText: repair.chosenHook,
      reasons: triageByCharacter.get(repair.character)?.reasons ?? [],
      gapComponents: [],
      scores: repair.chosenScores,
      candidates: repair.candidates.filter((candidate) => candidate.hook !== repair.chosenHook).slice(0, 2),
      note: '',
    });
  }

  for (const item of triage.filter((entry) => entry.category === 'ledger-review')) {
    const record = recordByCharacter.get(item.character);
    items.push({
      character: item.character,
      group: 'ledger',
      meaning: record?.meaning ?? '',
      targetLabel: record?.targetDisplayLabel ?? record?.meaning ?? '',
      components: record?.componentsUsed ?? [],
      beforeText: item.originalHook,
      afterText: null,
      reasons: item.reasons,
      gapComponents: item.gapComponents,
      scores: item.scores,
      candidates: [],
      note: '',
    });
  }

  for (const item of triage.filter((entry) => entry.audit)) {
    const record = recordByCharacter.get(item.character);
    items.push({
      character: item.character,
      group: 'audit',
      meaning: record?.meaning ?? '',
      targetLabel: record?.targetDisplayLabel ?? record?.meaning ?? '',
      components: record?.componentsUsed ?? [],
      beforeText: item.hook,
      afterText: null,
      reasons: item.reasons,
      gapComponents: [],
      scores: item.scores,
      candidates: [],
      note: '',
    });
  }

  for (const repair of repairs.filter((item) => item.status === 'fixed')) {
    const record = recordByCharacter.get(repair.character);
    items.push({
      character: repair.character,
      group: 'repair',
      meaning: record?.meaning ?? '',
      targetLabel: record?.targetDisplayLabel ?? record?.meaning ?? '',
      components: record?.componentsUsed ?? [],
      beforeText: repair.originalHook,
      afterText: repair.chosenHook,
      reasons: triageByCharacter.get(repair.character)?.reasons ?? [],
      gapComponents: [],
      scores: repair.chosenScores,
      candidates: [],
      note: '',
    });
  }

  const summary = {
    unresolved: items.filter((item) => item.group === 'unresolved').length,
    ledger: items.filter((item) => item.group === 'ledger').length,
    audit: items.filter((item) => item.group === 'audit').length,
    repair: items.filter((item) => item.group === 'repair').length,
  };

  const html = buildHtml(items);
  writeFileSync(resolve(REVIEW_DIR, 'char-review.html'), html);
  console.log(`Review page: ${items.length} items (${JSON.stringify(summary)})`);
  console.log('Wrote output/memory-hooks/review/char-review.html');
}

function buildHtml(items: ReviewItem[]): string {
  const data = JSON.stringify(items);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Book 1 character hooks — review</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #faf9f7; color: #1c1917; }
  header { position: sticky; top: 0; z-index: 5; background: #faf9f7f2; backdrop-filter: blur(6px); padding: 14px 20px 10px; border-bottom: 1px solid #e7e5e4; }
  h1 { font-size: 16px; margin: 0 0 6px; }
  .tabs { display: flex; gap: 6px; flex-wrap: wrap; }
  .tabs button { font: inherit; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: 999px; border: 1px solid #d6d3d1; background: #fff; cursor: pointer; }
  .tabs button[aria-pressed="true"] { background: #1c1917; color: #fff; border-color: #1c1917; }
  .progress { color: #78716c; font-size: 13px; margin-top: 6px; }
  main { max-width: 780px; margin: 0 auto; padding: 16px 20px 140px; }
  .card { background: #fff; border: 1px solid #e7e5e4; border-radius: 14px; padding: 16px; margin-bottom: 14px; }
  .head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .char { font-size: 28px; font-weight: 700; }
  .meta { color: #57534e; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0 10px; }
  .chip { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #f5f5f4; border: 1px solid #e7e5e4; color: #44403c; }
  .chip.bad { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
  .chip.good { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
  .chip.flag { background: #fef3c7; border-color: #fde68a; color: #92400e; }
  .hook { margin: 6px 0; }
  .hook .label { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #a8a29e; display: block; }
  .before { color: #78716c; }
  .after { font-weight: 600; }
  .cand { border-top: 1px dashed #e7e5e4; margin-top: 8px; padding-top: 8px; color: #57534e; font-size: 14px; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
  button.act { font: inherit; font-weight: 600; padding: 8px 14px; border-radius: 10px; border: 1px solid #d6d3d1; background: #fff; cursor: pointer; }
  button.act[aria-pressed="true"].approve { background: #dcfce7; border-color: #86efac; color: #166534; }
  button.act[aria-pressed="true"].revert { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  button.act[aria-pressed="true"].flag { background: #fef9c3; border-color: #fde047; color: #854d0e; }
  textarea { width: 100%; margin-top: 8px; padding: 8px 10px; border-radius: 10px; border: 1px solid #d6d3d1; font: inherit; resize: vertical; min-height: 40px; }
  .bulk { margin: 0 0 14px; }
  .export { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 20px; background: #ffffffee; backdrop-filter: blur(6px); border-top: 1px solid #e7e5e4; display: flex; gap: 10px; align-items: center; }
  .export button { font: inherit; font-weight: 600; padding: 8px 14px; border-radius: 10px; border: 1px solid #1c1917; background: #1c1917; color: #fff; cursor: pointer; }
  .export .status { color: #78716c; font-size: 13px; }
  .hidden { display: none; }
</style>
</head>
<body>
<header>
  <h1>Book 1 character hooks — review</h1>
  <div class="tabs" id="tabs"></div>
  <div class="progress" id="progress"></div>
</header>
<main id="list"></main>
<div class="export">
  <button id="export">Export feedback</button>
  <span class="status" id="status">Saved locally as you go. Export → save char-review-feedback.json in output/memory-hooks/review/.</span>
</div>
<script>
const items = ${data};
const storeKey = 'char-review-v1';
const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
const groups = [
  ['unresolved', 'Unresolved rewrites'],
  ['ledger', 'Ledger blocked'],
  ['audit', 'Audit sample'],
  ['repair', 'Repairs'],
];
let activeGroup = 'unresolved';
const list = document.getElementById('list');
const progress = document.getElementById('progress');
const statusEl = document.getElementById('status');

function stateFor(character) { return saved[character] || {}; }

function scoreChips(item) {
  const chips = [];
  if (item.gapComponents.length) chips.push('<span class="chip bad">ledger gap: ' + item.gapComponents.join(' ') + '</span>');
  for (const reason of item.reasons) chips.push('<span class="chip flag">' + reason + '</span>');
  if (item.scores) {
    if (item.scores.labels < 0.5) chips.push('<span class="chip bad">labels ' + item.scores.labels + '</span>');
    if (item.scores.memory >= 1.8) chips.push('<span class="chip good">memory ' + item.scores.memory + '</span>');
    else chips.push('<span class="chip bad">memory ' + item.scores.memory + '</span>');
  }
  return chips.join('');
}

function render() {
  const buttons = document.getElementById('tabs');
  buttons.innerHTML = '';
  for (const [key, label] of groups) {
    const count = items.filter((item) => item.group === key).length;
    const button = document.createElement('button');
    button.textContent = label + ' (' + count + ')';
    if (key === activeGroup) button.setAttribute('aria-pressed', 'true');
    button.addEventListener('click', () => { activeGroup = key; render(); });
    buttons.appendChild(button);
  }

  const groupItems = items.filter((item) => item.group === activeGroup);
  list.innerHTML = '';
  if (activeGroup === 'repair') {
    const bulk = document.createElement('div');
    bulk.className = 'bulk';
    const button = document.createElement('button');
    button.className = 'act';
    button.textContent = 'Approve all repairs in this list';
    button.addEventListener('click', () => {
      for (const item of groupItems) {
        const next = stateFor(item.character);
        next.action = 'approve';
        next.hook = item.afterText;
        saved[item.character] = next;
      }
      localStorage.setItem(storeKey, JSON.stringify(saved));
      render();
    });
    bulk.appendChild(button);
    list.appendChild(bulk);
  }

  for (const item of groupItems) {
    const state = stateFor(item.character);
    const card = document.createElement('section');
    card.className = 'card';
    const candidateHtml = (item.candidates || []).map((candidate) =>
      '<div class="cand"><b>Alternative:</b> ' + candidate.hook +
      (candidate.issues && candidate.issues.length ? ' <span class="chip flag">' + candidate.issues.join(', ') + '</span>' : '') +
      (candidate.scores ? ' <span class="chip">memory ' + candidate.scores.memory + '</span>' : '') +
      '</div>').join('');
    card.innerHTML =
      '<div class="head"><span class="char">' + item.character + '</span><span class="meta">' + item.meaning + '</span></div>' +
      '<div class="chips">' + scoreChips(item) + '</div>' +
      '<div class="hook"><span class="label">Current</span><span class="before">' + item.beforeText + '</span></div>' +
      (item.afterText
        ? '<div class="hook"><span class="label">Proposed</span><span class="after" data-role="proposed">' + item.afterText + '</span></div>'
        : '') +
      candidateHtml +
      '<div class="actions"></div>' +
      '<textarea placeholder="Note (optional) — e.g. the ledger label you want">' + (state.note || '') + '</textarea>';

    const actionRow = card.querySelector('.actions');
    const actions = item.group === 'repair' || item.group === 'unresolved'
      ? [['approve', 'Approve proposed'], ['revert', 'Keep current'], ['edit', 'Use my text (from note)']]
      : [['approve', 'Looks good'], ['flag', 'Needs a look'], ['revert', 'Not sure']];
    for (const [action, label] of actions) {
      const button = document.createElement('button');
      button.className = 'act ' + (action === 'approve' ? 'approve' : action === 'revert' ? 'revert' : 'flag');
      button.textContent = label;
      if (state.action === action) button.setAttribute('aria-pressed', 'true');
      button.addEventListener('click', () => {
        const next = stateFor(item.character);
        next.action = next.action === action ? null : action;
        next.note = card.querySelector('textarea').value;
        next.before = item.beforeText;
        if (next.action === 'approve') next.hook = item.afterText || item.beforeText;
        if (next.action === 'edit') next.hook = next.note;
        if (next.action === 'revert') next.hook = item.beforeText;
        saved[item.character] = next;
        localStorage.setItem(storeKey, JSON.stringify(saved));
        render();
      });
      actionRow.appendChild(button);
    }
    card.querySelector('textarea').addEventListener('input', (event) => {
      const next = stateFor(item.character);
      next.note = event.target.value;
      saved[item.character] = next;
      localStorage.setItem(storeKey, JSON.stringify(saved));
    });
    list.appendChild(card);
  }

  const decided = items.filter((item) => (stateFor(item.character).action)).length;
  progress.textContent = decided + '/' + items.length + ' decided · showing ' + activeGroup + ' (' + groupItems.length + ')';
}

document.getElementById('export').addEventListener('click', () => {
  const decisions = items.map((item) => {
    const state = stateFor(item.character);
    return {
      character: item.character,
      group: item.group,
      action: state.action || null,
      hook: state.action === 'edit' ? (state.note || item.afterText || item.beforeText) : (state.hook || null),
      note: state.note || '',
    };
  });
  const payload = { artifact: 'char-review-v1', exportedAt: new Date().toISOString(), decisions };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'char-review-feedback.json';
  link.click();
  statusEl.textContent = 'Exported char-review-feedback.json — save it to output/memory-hooks/review/.';
});

render();
</script>
</body>
</html>
`;
}

main();
