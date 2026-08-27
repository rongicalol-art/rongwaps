import type { ApprovedDefaultLabel, ComponentProfile } from '../../features/character-memory-hooks/model';

export interface RawComponentMetadata {
  character: string;
  definition: string | null;
  pinyin: string[] | null;
}

const APPROVED_DEFAULT_MEANING_LABELS: Record<string, string> = {
  '亻': 'person',
  '人': 'person',
  '口': 'mouth',
  '土': 'ground',
  '女': 'woman',
  '子': 'child',
  '忄': 'heart',
  '心': 'heart',
  '日': 'sun',
  '月': 'moon',
  '木': 'tree',
  '言': 'speech',
  '門': 'door',
  '馬': 'horse',
  '青': 'blue-green',
  '乞': 'beg',
  '曷': 'what',
  '兌': 'exchange',
  '黑': 'black',
  '占': 'occupy',
};

function splitRawGlosses(definition: string | null): string[] {
  if (!definition) return [];
  return definition.split(/[;,/]/).map((gloss) => gloss.trim()).filter(Boolean);
}

function approvedLabelsFor(glyph: string): ApprovedDefaultLabel[] {
  const label = APPROVED_DEFAULT_MEANING_LABELS[glyph];
  if (!label) return [];
  return [{
    id: `${glyph}:default-meaning-v2`,
    label,
    sourceRefs: ['project-curated-component-defaults-v2'],
  }];
}

/** Raw dictionary data and reusable defaults only; target overrides belong in plans. */
export function buildComponentProfile(metadata: RawComponentMetadata): ComponentProfile {
  return {
    key: `g:${metadata.character}`,
    glyph: metadata.character,
    rawGlosses: splitRawGlosses(metadata.definition),
    readings: metadata.pinyin ?? [],
    approvedDefaultLabels: approvedLabelsFor(metadata.character),
    sourceRefs: ['legacy-breakdown-metadata'],
  };
}

export function getApprovedDefaultMeaningLabel(glyph: string): string | null {
  return APPROVED_DEFAULT_MEANING_LABELS[glyph] ?? null;
}
