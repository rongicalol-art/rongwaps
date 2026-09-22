/**
 * Composes the Jev answers into the phase worklist:
 *   pass           → audit pool (10% sampled for human review)
 *   repair         → regenerate under the meaning-only rubric, then re-verify
 *   ledger-review  → a component has no usable ledger entry; fix the ledger first
 *
 * Output: output/memory-hooks/review/char-triage-v1.json
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const REVIEW_DIR = resolve(OUTPUT_DIR, 'review');

interface RawItem {
  character: string;
  answers: Record<string, unknown>;
  state: {
    hook: string;
    needs_rewrite: boolean;
    sound_stripped: boolean;
    breakdown: Array<{ glyph: string; label_in_hook: string }>;
  };
}

interface Thresholds {
  labelsHonest: number;
  scenePresent: number;
  partsMeaningful: number;
  memorability: number;
}

interface LedgerEntry {
  glyph: string;
  status: 'complete' | 'needs-confirmation' | 'gap';
}

function answerScores(answers: Record<string, unknown>) {
  const labelProbs = Object.entries(answers)
    .filter(([key]) => key.startsWith('label_grounded_'))
    .map(([, value]) => (value as { noul: number }).noul);
  return {
    labels: labelProbs.length > 0 ? Math.min(...labelProbs) : 1,
    scene: (answers.scene_present as { noul: number } | undefined)?.noul ?? 0,
    parts: (answers.parts_meaningful as { noul: number } | undefined)?.noul ?? 0,
    memory: (answers.memorability as { score: number } | undefined)?.score ?? 0,
  };
}

function main() {
  mkdirSync(REVIEW_DIR, { recursive: true });

  const raw = JSON.parse(readFileSync(resolve(REVIEW_DIR, 'char-typesafe-raw-v1.json'), 'utf8')) as { items: RawItem[] };
  const thresholds = JSON.parse(
    readFileSync(resolve(REVIEW_DIR, 'typesafe-thresholds-v1.json'), 'utf8'),
  ).thresholds as Thresholds;
  const ledger = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'component-ledger-v1.json'), 'utf8'),
  ) as { entries: LedgerEntry[] };
  const ledgerByGlyph = new Map(ledger.entries.map((entry) => [entry.glyph, entry]));
  const records = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-hooks-v3.json'), 'utf8'),
  ).records as Array<{ character: string; hook: string }>;
  const originalByCharacter = new Map(records.map((record) => [record.character, record.hook]));

  const items = raw.items.map((item, index) => {
    const scores = answerScores(item.answers);
    const reasons: string[] = [];
    if (scores.labels < thresholds.labelsHonest) reasons.push('labels');
    if (scores.scene < thresholds.scenePresent) reasons.push('scene');
    if (scores.parts < thresholds.partsMeaningful) reasons.push('parts');
    if (scores.memory < thresholds.memorability) reasons.push('memory');
    if (item.state.needs_rewrite) reasons.push('sound-leftover');

    const pass = reasons.length === 0;
    const gapComponents = item.state.breakdown
      .filter((component) => (ledgerByGlyph.get(component.glyph)?.status ?? 'gap') !== 'complete')
      .map((component) => component.glyph);
    const category = pass ? 'pass' : gapComponents.length > 0 ? 'ledger-review' : 'repair';
    const severity = scores.labels < thresholds.labelsHonest
      || scores.scene < thresholds.scenePresent
      || scores.parts < thresholds.partsMeaningful
      || scores.memory < 1.2
      ? 'high'
      : 'medium';
    return {
      character: item.character,
      severity: pass ? 'low' : severity,
      category,
      audit: pass && index % 10 === 0,
      reasons,
      gapComponents,
      scores: {
        labels: Math.round(scores.labels * 100) / 100,
        scene: Math.round(scores.scene * 100) / 100,
        parts: Math.round(scores.parts * 100) / 100,
        memory: Math.round(scores.memory * 100) / 100,
      },
      soundStripped: item.state.sound_stripped,
      hook: item.state.hook,
      originalHook: originalByCharacter.get(item.character) ?? item.state.hook,
    };
  });

  const summary = {
    total: items.length,
    pass: items.filter((item) => item.category === 'pass').length,
    auditSample: items.filter((item) => item.audit).length,
    repair: items.filter((item) => item.category === 'repair').length,
    ledgerReview: items.filter((item) => item.category === 'ledger-review').length,
    high: items.filter((item) => item.severity === 'high').length,
    medium: items.filter((item) => item.severity === 'medium').length,
    reasonCounts: {
      labels: items.filter((item) => item.reasons.includes('labels')).length,
      scene: items.filter((item) => item.reasons.includes('scene')).length,
      parts: items.filter((item) => item.reasons.includes('parts')).length,
      memory: items.filter((item) => item.reasons.includes('memory')).length,
      soundLeftover: items.filter((item) => item.reasons.includes('sound-leftover')).length,
    },
  };

  const artifact = {
    schemaVersion: 1,
    rubricVersion: 'book-1-meaning-only-v1',
    thresholds,
    generatedAt: new Date().toISOString(),
    summary,
    items: items.sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity] || a.character.localeCompare(b.character);
    }),
  };
  writeFileSync(resolve(REVIEW_DIR, 'char-triage-v1.json'), `${JSON.stringify(artifact, null, 2)}\n`);

  console.log(`Triage: ${summary.total} hooks`);
  console.log(`  pass ${summary.pass} (audit sample ${summary.auditSample})`);
  console.log(`  repair ${summary.repair} · ledger-review ${summary.ledgerReview}`);
  console.log(`  severity high ${summary.high} · medium ${summary.medium}`);
  console.log(`  reasons: ${JSON.stringify(summary.reasonCounts)}`);
  console.log('Wrote output/memory-hooks/review/char-triage-v1.json');
}

main();
