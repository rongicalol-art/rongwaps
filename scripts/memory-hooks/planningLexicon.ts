import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMPONENT_LEXICON_BY_KEY } from '../../src/data/memoryHooks/componentLexicon';
import type { ComponentLexiconEntry, ComponentSense } from '../../src/types/memoryHooks';
import { FUNCTION_WORD_LABEL, TECHNICAL_LABEL } from './componentRules';

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');

export const PLANNING_LEXICON_VERSION = 'book1-lexicon: pilot-v1 + curated-labels-v1 + proposals-47-v1';

interface CuratedLabelRecord {
  glyph: string;
  label: string | null;
  status: 'seed' | 'proposed' | 'approved' | 'needs-review';
  use?: 'label' | 'skip';
  alternatives?: string[];
}

interface ProposalRecord {
  glyph: string;
  metadataStatus: 'withhold' | 'review-required' | 'candidate-review';
  existingCandidateLabels?: Array<{ label: string; confidence: 'high' | 'medium' | 'low' }>;
}

function isValidLabel(label: string): boolean {
  if (label.length < 2 || /\p{Script=Han}/u.test(label)) return false;
  if (label.split(/\s+/).length > 3) return false;
  if (TECHNICAL_LABEL.test(label) || FUNCTION_WORD_LABEL.test(label)) return false;
  return true;
}

function sense(glyph: string, label: string, source: string): ComponentSense {
  return {
    id: `${glyph}:${source}`,
    label,
    sourceRefs: [source],
    safeForMemoryAid: true,
  };
}

function entry(glyph: string, sense: ComponentSense): ComponentLexiconEntry {
  return { key: `g:${glyph}`, glyph, senses: [sense] };
}

/**
 * Pure merge order: the hand-authored pilot lexicon wins; approved curated
 * labels fill missing glyphs next; high-confidence batch-47 label proposals
 * fill what remains. Skip-marked and review-only labels never become senses.
 */
export function mergePlanningLexicon(options: {
  base: Map<string, ComponentLexiconEntry>;
  curated: CuratedLabelRecord[];
  proposals: ProposalRecord[];
}): Map<string, ComponentLexiconEntry> {
  const lexicon = new Map(options.base);
  for (const record of options.curated) {
    if (lexicon.has(`g:${record.glyph}`)) continue;
    if (record.use === 'skip' || !record.label || !isValidLabel(record.label)) continue;
    lexicon.set(`g:${record.glyph}`, entry(record.glyph, sense(record.glyph, record.label, 'book-1-curated-component-labels-v1')));
  }
  for (const record of options.proposals) {
    if (lexicon.has(`g:${record.glyph}`)) continue;
    const candidate = record.existingCandidateLabels?.find((label) => label.confidence === 'high');
    if (!candidate || !isValidLabel(candidate.label)) continue;
    lexicon.set(`g:${record.glyph}`, entry(record.glyph, sense(record.glyph, candidate.label, 'book-1-frozen-47-component-label-proposals-v1')));
  }
  return lexicon;
}

export function loadCuratedSkipGlyphs(): Set<string> {
  const curatedPath = resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json');
  if (!existsSync(curatedPath)) throw new Error(`Missing curated labels artifact: ${curatedPath}`);
  const records = (JSON.parse(readFileSync(curatedPath, 'utf8')) as { records: CuratedLabelRecord[] }).records;
  return new Set(records.filter((record) => record.use === 'skip').map((record) => record.glyph));
}

export function loadPlanningLexicon(): Map<string, ComponentLexiconEntry> {
  const curatedPath = resolve(OUTPUT_DIR, 'book-1-curated-component-labels-v1.json');
  const proposalsPath = resolve(OUTPUT_DIR, 'book-1-frozen-47-component-label-proposals-v1.json');
  if (!existsSync(curatedPath)) throw new Error(`Missing curated labels artifact: ${curatedPath}`);
  const curated = (JSON.parse(readFileSync(curatedPath, 'utf8')) as { records: CuratedLabelRecord[] }).records;
  const proposals = existsSync(proposalsPath)
    ? (JSON.parse(readFileSync(proposalsPath, 'utf8')) as { records: ProposalRecord[] }).records
    : [];
  return mergePlanningLexicon({ base: COMPONENT_LEXICON_BY_KEY, curated, proposals });
}
