import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FUNCTION_WORD_LABEL, TECHNICAL_LABEL } from './componentRules';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

interface LabelRecord {
  glyph: string;
  status: 'seed' | 'proposed' | 'approved' | 'needs-review';
  label: string | null;
  use?: 'label' | 'skip';
  alternatives: string[];
  basis: 'meaning' | 'children' | 'shape' | null;
  confidence: 'high' | 'medium' | 'low' | null;
  reason: string | null;
  frequency: number;
}

/**
 * Reviewer edits applied on top of the LLM proposals.
 * Keep entries to a single concrete learner word where possible.
 */
const EDIT_MAP: Record<string, string> = {
  '𦥯': 'schoolhouse',
  '𢖻': 'heart',
  '𢛳': 'heart',
  '壬': 'pole',
  '⺊': 'crack',
  '龷': 'grass top',
  '朩': 'split wood',
  '𦘒': 'brush hand',
  '𠀐': 'terraced hill',
  '臱': 'nose in cave',
  '𭥴': 'sun in box',
  '𠮛': 'lined mouth',
  '𠮠': 'mouth with tongue',
  '𥃲': 'eye on stand',
  '𠫯': 'bent person',
  '𤴓': 'step',
  '𠔼': 'wide frame',
  '𦍌': 'horns',
  '亥': 'covered person',
  '𠅃': 'sheltered followers',
  '亼': 'gather',
  '开': 'bolt',
  '亲': 'parents',
  '㝵': 'dé',
  '𦥑': 'hands',
  '刖': 'blade',
  '或': 'guard',
  '見': 'see',
  '隹': 'bird',
  '彳': 'step',
  '夊': 'slow step',
  '爻': 'crossed sticks',
  '肀': 'brush',
  '囗': 'box',
  '咼': 'guō',
  '可': 'kě',
  '吾': 'me',
};

/** Parts that must never be used as story parts; they are decomposition scraps. */
const SKIP_GLYPHS = new Set<string>(['⺊', '壬', '𠁣', '𠃛']);

function main(): void {
  const source = JSON.parse(
    readFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.proposed.json'), 'utf8'),
  ) as { records: LabelRecord[] };
  const changes: string[] = [];
  const records = source.records.map((record) => {
    const edit = EDIT_MAP[record.glyph];
    const use = SKIP_GLYPHS.has(record.glyph) ? ('skip' as const) : ('label' as const);
    if (edit) {
      if (record.label !== edit) changes.push(`${record.glyph}: ${record.label ?? '(none)'} -> ${edit}`);
      return { ...record, label: edit, status: 'approved' as const, use };
    }
    if (record.status === 'seed' || record.status === 'proposed') {
      return { ...record, status: 'approved' as const, use };
    }
    return { ...record, use };
  });

  const present = new Set(records.map((record) => record.glyph));
  for (const [glyph, label] of Object.entries(EDIT_MAP)) {
    if (present.has(glyph)) continue;
    changes.push(`${glyph}: (new) -> ${label}`);
    records.push({
      glyph,
      status: 'approved',
      label,
      use: 'label',
      alternatives: [],
      basis: 'meaning',
      confidence: 'high',
      reason: 'reviewer-added',
      frequency: 0,
    });
  }

  const unresolved = records.filter((record) => record.status === 'needs-review' && !EDIT_MAP[record.glyph]);
  if (unresolved.length > 0) {
    throw new Error(`Unresolved labels (add edits or accept): ${unresolved.map((record) => record.glyph).join(' ')}`);
  }
  for (const record of records) {
    if (!record.label) continue;
    if (/\p{Script=Han}/u.test(record.label) || record.label.split(/\s+/).length > 3) {
      throw new Error(`Invalid label for ${record.glyph}: ${record.label}`);
    }
    if (TECHNICAL_LABEL.test(record.label)) {
      throw new Error(`Technical label for ${record.glyph}: ${record.label}`);
    }
    if (FUNCTION_WORD_LABEL.test(record.label)) {
      throw new Error(`Function-word label for ${record.glyph}: ${record.label}`);
    }
  }

  writeFileSync(resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'), `${JSON.stringify({
    schemaVersion: 1,
    distribution: 'development-only-candidate',
    publishable: false,
    source: 'book-1-curated-component-labels-v1.proposed.json',
    editMapVersion: 'reviewer-edits-v1',
    edits: changes,
    records,
  }, null, 2)}\n`);
  console.log(JSON.stringify({
    records: records.length,
    editsApplied: changes.length,
    edits: changes,
    path: resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json'),
  }, null, 2));
}

main();
