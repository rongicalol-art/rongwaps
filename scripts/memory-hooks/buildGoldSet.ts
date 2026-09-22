/**
 * Builds the ~30-hook gold set for rubric calibration. The user labels each
 * hook good / bad / borderline under the meaning-only rubric; those labels
 * tune the Jev thresholds and validate the question set before the full run.
 *
 * Outputs:
 *   output/memory-hooks/review/gold-set-v1.json
 *   output/memory-hooks/review/gold-set-v1.html  (label and export decisions)
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface ScanItem {
  character: string;
  meaning: string;
  hook: string;
  soundFree: boolean;
  soundSnippets: string[];
  templateSnippets: string[];
  ungroundedLabels: Array<{ glyph: string; label: string }>;
}

interface GoldItem extends ScanItem {
  bucket: 'sound' | 'template' | 'ungrounded-label' | 'clean' | 'explicit';
  userLabel: 'good' | 'bad' | 'borderline' | null;
  userNote: string;
}

/** Deterministic spread picks so reruns are stable and diverse. */
function spread<T>(items: T[], count: number): T[] {
  if (items.length <= count) return [...items];
  const picks: T[] = [];
  for (let i = 0; i < count; i += 1) {
    picks.push(items[Math.floor((i * items.length) / count)]);
  }
  return picks;
}

function main() {
  mkdirSync(REVIEW_DIR, { recursive: true });

  const scan = JSON.parse(
    readFileSync(resolve(REVIEW_DIR, 'char-sound-scan-v1.json'), 'utf8'),
  ).items as ScanItem[];

  const sound = scan.filter((item) => !item.soundFree);
  const template = scan.filter((item) => item.soundFree && item.templateSnippets.length > 0);
  const ungrounded = scan.filter((item) => item.ungroundedLabels.length > 0);
  const clean = scan.filter(
    (item) => item.soundFree && item.templateSnippets.length === 0 && item.ungroundedLabels.length === 0,
  );
  const explicit = scan.filter((item) => item.character === '圖');

  const selected: GoldItem[] = [
    ...spread(sound, 8).map((item) => ({ ...item, bucket: 'sound' as const, userLabel: null, userNote: '' })),
    ...spread(template, 4).map((item) => ({ ...item, bucket: 'template' as const, userLabel: null, userNote: '' })),
    ...spread(ungrounded, 8).map((item) => ({ ...item, bucket: 'ungrounded-label' as const, userLabel: null, userNote: '' })),
    ...spread(clean, 9).map((item) => ({ ...item, bucket: 'clean' as const, userLabel: null, userNote: '' })),
    ...explicit.map((item) => ({ ...item, bucket: 'explicit' as const, userLabel: null, userNote: '' })),
  ];

  const seen = new Set<string>();
  const items: GoldItem[] = [];
  for (const item of selected) {
    if (seen.has(item.character)) continue;
    seen.add(item.character);
    items.push(item);
  }

  const artifact = {
    schemaVersion: 1,
    rubricVersion: 'book-1-meaning-only-v1',
    purpose: 'Label each hook good, bad, or borderline under the meaning-only rubric.',
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };
  writeFileSync(resolve(REVIEW_DIR, 'gold-set-v1.json'), `${JSON.stringify(artifact, null, 2)}\n`);

  const html = buildHtml(items);
  writeFileSync(resolve(REVIEW_DIR, 'gold-set-v1.html'), html);

  console.log(`Gold set: ${items.length} hooks`);
  for (const item of items) console.log(`  ${item.character} (${item.bucket})`);
  console.log('Wrote output/memory-hooks/review/gold-set-v1.json');
  console.log('Wrote output/memory-hooks/review/gold-set-v1.html');
}

function buildHtml(items: GoldItem[]): string {
  const data = JSON.stringify(items);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gold set — Book 1 character hooks</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #faf9f7; color: #1c1917; }
  header { position: sticky; top: 0; background: #faf9f7ee; backdrop-filter: blur(6px); padding: 16px 20px 12px; border-bottom: 1px solid #e7e5e4; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  .hint { color: #78716c; font-size: 13px; }
  .progress { font-weight: 600; }
  main { max-width: 720px; margin: 0 auto; padding: 16px 20px 120px; }
  .card { background: #fff; border: 1px solid #e7e5e4; border-radius: 14px; padding: 16px; margin-bottom: 14px; }
  .char { font-size: 30px; font-weight: 700; margin-right: 8px; }
  .meaning { color: #57534e; }
  .hook { margin: 10px 0 12px; font-size: 15.5px; }
  .flags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .flag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .flag.label { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; }
  button { font: inherit; font-weight: 600; padding: 8px 14px; border-radius: 10px; border: 1px solid #d6d3d1; background: #fff; cursor: pointer; }
  button[aria-pressed="true"].good { background: #dcfce7; border-color: #86efac; color: #166534; }
  button[aria-pressed="true"].bad { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
  button[aria-pressed="true"].borderline { background: #fef9c3; border-color: #fde047; color: #854d0e; }
  textarea { width: 100%; margin-top: 10px; padding: 8px 10px; border-radius: 10px; border: 1px solid #d6d3d1; font: inherit; resize: vertical; min-height: 44px; }
  .export { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 20px; background: #ffffffee; backdrop-filter: blur(6px); border-top: 1px solid #e7e5e4; display: flex; gap: 10px; align-items: center; }
  .export button { background: #1c1917; color: #fff; border-color: #1c1917; }
  .export .status { color: #78716c; font-size: 13px; }
</style>
</head>
<body>
<header>
  <h1>Gold set — Book 1 character hooks</h1>
  <div class="hint">Label each hook under the meaning-only rubric: <b>good</b> = parts → retellable scene → meaning, honest labels, no sound; <b>bad</b> = broken chain, fake label, or sound content; <b>borderline</b> = works but weak. Add a note when it helps. <span class="progress" id="progress"></span></div>
</header>
<main id="list"></main>
<div class="export">
  <button id="export">Export decisions</button>
  <span class="status" id="status">Saved locally as you go.</span>
</div>
<script>
const items = ${data};
const storeKey = 'gold-set-v1';
const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
const list = document.getElementById('list');
const progress = document.getElementById('progress');

function render() {
  list.innerHTML = '';
  let labeled = 0;
  for (const item of items) {
    const state = saved[item.character] || {};
    if (state.label) labeled += 1;
    const card = document.createElement('section');
    card.className = 'card';
    const flags = [];
    if (!item.soundFree) flags.push('<span class="flag">sound: ' + item.soundSnippets.join(', ') + '</span>');
    for (const snippet of item.templateSnippets) flags.push('<span class="flag">template: ' + snippet + '</span>');
    for (const label of item.ungroundedLabels) flags.push('<span class="flag label">' + label.glyph + ' = "' + label.label + '" not in ledger</span>');
    if (item.bucket === 'explicit') flags.push('<span class="flag label">known problem case</span>');
    card.innerHTML =
      '<div><span class="char">' + item.character + '</span><span class="meaning">' + item.meaning + '</span></div>' +
      '<div class="hook">' + item.hook + '</div>' +
      '<div class="flags">' + flags.join('') + '</div>' +
      '<div class="actions">' +
        '<button class="good">Good</button>' +
        '<button class="bad">Bad</button>' +
        '<button class="borderline">Borderline</button>' +
      '</div>' +
      '<textarea placeholder="Note (optional): what works or what is wrong">' + (state.note || '') + '</textarea>';
    const buttons = card.querySelectorAll('.actions button');
    buttons.forEach((button) => {
      const label = button.className;
      if (state.label === label) button.setAttribute('aria-pressed', 'true');
      button.addEventListener('click', () => {
        const next = saved[item.character] || {};
        next.label = next.label === label ? null : label;
        next.note = card.querySelector('textarea').value;
        next.at = new Date().toISOString();
        saved[item.character] = next;
        localStorage.setItem(storeKey, JSON.stringify(saved));
        render();
      });
    });
    card.querySelector('textarea').addEventListener('input', (event) => {
      const next = saved[item.character] || {};
      next.note = event.target.value;
      saved[item.character] = next;
      localStorage.setItem(storeKey, JSON.stringify(saved));
    });
    list.appendChild(card);
  }
  progress.textContent = labeled + '/' + items.length + ' labeled';
}

document.getElementById('export').addEventListener('click', () => {
  const decisions = items.map((item) => ({
    character: item.character,
    bucket: item.bucket,
    hook: item.hook,
    label: (saved[item.character] || {}).label || null,
    note: (saved[item.character] || {}).note || '',
  }));
  const payload = {
    artifact: 'gold-set-v1.json',
    exportedAt: new Date().toISOString(),
    decisions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'gold-set-v1-decisions.json';
  link.click();
  document.getElementById('status').textContent = 'Exported gold-set-v1-decisions.json — save it to output/memory-hooks/review/.';
});

render();
</script>
</body>
</html>
`;
}

main();
