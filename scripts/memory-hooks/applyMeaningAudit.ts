import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface AuditRecord {
  character: string;
  currentMeaning: string | null;
  currentPinyin: string | null;
  verdict: 'keep' | 'change' | 'unclear';
  suggestedMeaning: string | null;
  suggestedPinyin: string | null;
  reason: string;
}

/** Proposals to reject outright: compound/name overfits where the character's real sense should stay. */
const KEEP = new Set(['美', '星', '元', '顏', '克', '巧', '力', '沙', '菲', '律', '賓', '荷', '蘭', '越', '尼', '印', '淇', '冒', '察', '科', '魯', '臺', '漂']);

/** Reviewer overrides, applied regardless of the proposal. */
const OVERRIDES: Record<string, string> = {
  '道': 'way; path',
  '宜': 'suitable; cheap',
  '分': 'minute; part',
  '便': 'convenient; cheap',
  '護': 'protect',
  '理': 'reason',
  '成': 'become; succeed',
  '戶': 'household; door',
  '方': 'direction; side',
  '士': 'scholar',
  '淋': 'to pour; drench',
  '台': 'Taiwan; platform',
  '嗎': 'sentence-final particle for a "Yes / No" question',
  '子': 'child',
};

function main(): void {
  const apply = process.argv.includes('--apply');
  const charactersFlagIndex = process.argv.indexOf('--characters');
  const charactersFilter = charactersFlagIndex > -1
    ? new Set(process.argv[charactersFlagIndex + 1]?.split(/[\s,]+/u).filter(Boolean))
    : null;
  if (charactersFlagIndex > -1 && (!charactersFilter || charactersFilter.size === 0)) {
    throw new Error('--characters requires a list of characters.');
  }
  const audit = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-meaning-audit-v1.json'), 'utf8')) as {
    records: AuditRecord[];
  };
  const inventory = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), 'utf8')) as {
    entries: Array<{
      character: string;
      meaningDecision: { selectedMeaning: string | null; selectedPinyin: string | null; method?: string; confidence?: string; reviewReasons?: string[] };
    }>;
  };
  const plans = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'book-1-plans.json'), 'utf8')) as {
    plans: Array<{
      character: string;
      meaningDecision: { selectedMeaning: string | null; selectedPinyin: string | null };
    }>;
  };
  const frozenPath = resolve(OUTPUT_DIR, 'book-1-frozen-47-reviewed-construction-meanings-v1.json');
  const frozen = JSON.parse(readFileSync(frozenPath, 'utf8')) as {
    records: Array<{ character: string; constructionMeaning: string | null; constructionReading: string | null; status: string }>;
  };
  const frozenByCharacter = new Map(frozen.records.map((record) => [record.character, record]));
  const inventoryByCharacter = new Map(inventory.entries.map((entry) => [entry.character, entry]));
  const planByCharacter = new Map(plans.plans.map((plan) => [plan.character, plan]));

  const decisions: Array<{ character: string; from: string | null; to: string; source: string; note: string }> = [];
  for (const record of audit.records) {
    if (charactersFilter && !charactersFilter.has(record.character)) continue;
    if (KEEP.has(record.character)) continue;
    const override = OVERRIDES[record.character];
    const proposal = record.verdict === 'change' ? record.suggestedMeaning : null;
    if (!override && !proposal) continue;
    const frozenRecord = frozenByCharacter.get(record.character);
    const effectiveCurrent = frozenRecord?.status === 'approved' && frozenRecord.constructionMeaning
      ? frozenRecord.constructionMeaning
      : inventoryByCharacter.get(record.character)?.meaningDecision.selectedMeaning ?? null;
    const to = override ?? proposal!;
    if (to === effectiveCurrent) continue;
    decisions.push({
      character: record.character,
      from: effectiveCurrent,
      to,
      source: override ? 'reviewer' : 'audit',
      note: override ? 'reviewer override' : record.reason,
    });
  }

  const changedCharacters = decisions.map((decision) => decision.character);
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    changes: decisions.length,
    kept: KEEP.size,
    changesSample: decisions.slice(0, 30).map((decision) => `${decision.character}: ${decision.from ?? '(none)'} -> ${decision.to}`),
  }, null, 2));

  if (!apply) return;

  for (const decision of decisions) {
    const inventoryEntry = inventoryByCharacter.get(decision.character);
    if (inventoryEntry) {
      inventoryEntry.meaningDecision.selectedMeaning = decision.to;
      inventoryEntry.meaningDecision.method = 'meaning-audit';
      inventoryEntry.meaningDecision.confidence = 'high';
      inventoryEntry.meaningDecision.reviewReasons = [
        ...(inventoryEntry.meaningDecision.reviewReasons ?? []).filter((reason) => reason !== 'meaning-audit-updated'),
        'meaning-audit-updated',
      ];
    }
    const plan = planByCharacter.get(decision.character);
    if (plan) plan.meaningDecision.selectedMeaning = decision.to;
    const frozenRecord = frozenByCharacter.get(decision.character);
    if (frozenRecord && frozenRecord.status === 'approved') {
      frozenRecord.constructionMeaning = decision.to;
    }
  }

  writeFileSync(resolve(OUTPUT_DIR, 'book-1-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-plans.json'), `${JSON.stringify(plans, null, 2)}\n`);
  writeFileSync(frozenPath, `${JSON.stringify(frozen, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-meaning-changes-v1.json'), `${JSON.stringify({
    schemaVersion: 1,
    appliedAt: new Date().toISOString(),
    changes: decisions,
  }, null, 2)}\n`);
  writeFileSync(resolve(OUTPUT_DIR, 'book-1-meaning-changed-characters.json'), `${JSON.stringify({
    characters: changedCharacters,
  }, null, 2)}\n`);
}

main();
