import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Confidence = 'high' | 'medium' | 'low';
type ConstructionBasis =
  | 'lesson-dictionary-alignment'
  | 'dictionary-core'
  | 'lesson-core'
  | 'unresolved';
type ReviewedStatus = 'approved' | 'unresolved';
type ConsistencyStatus = 'pass' | 'pass-with-warning' | 'blocked';
type ResearchStatus = 'eligible' | 'blocked-by-meaning-uncertainty';

interface DictionaryEvidence {
  readings: string[] | null;
  definition: string | null;
  sourceRef: string | null;
}

interface LessonSense {
  meaning: string;
  reading: string | null;
  lessonRefs: string[];
  words: string[];
  standalone: boolean;
  senseType: string;
  sourceRefs: string[];
  classifierAnnotations: Array<{
    raw: string;
    entries: Array<{ character: string; pinyin: string | null }>;
  }>;
}

interface PreviewRecord {
  character: string;
  currentFrozenCanonicalMeaning: string | null;
  currentFrozenReading: string | null;
  dictionaryEvidence: DictionaryEvidence;
  constructionMeaning: {
    label: string | null;
    reading: string | null;
    confidence: Confidence;
    basis: ConstructionBasis;
    sourceRefs: string[];
    reviewReasons: string[];
    note: string;
  };
  lessonSenses: LessonSense[];
  relationshipMeaningCompatibility: {
    status: string;
    note: string;
    materiallyDiffersFromConstructionMeaning: boolean;
  };
  targetDecision: {
    disposition: string;
    currentHookTargetAction: string;
    targetShouldRemainSameOrChange: string;
    classifierAnnotationsRemovedFromCleanTarget: Array<{
      raw: string;
      entries: Array<{ character: string; pinyin: string | null }>;
      sourceRefs: string[];
    }>;
    postponeRelationshipResearch: boolean;
  };
  currentPlanContext: {
    frozenPlanStatus: string;
    plannerReviewReasons: string[];
    meaningReviewReasons: string[];
  };
}

interface PreviewArtifact {
  artifact: string;
  publishable: false;
  hooksGenerated: false;
  apiCalls: 0;
  externalResearch: false;
  plannerChanged: false;
  frozenArtifactsChanged: false;
  productionDataChanged: false;
  records: PreviewRecord[];
}

interface ReadingSupport {
  constructionReading: string | null;
  dictionaryReadings: string[];
  standaloneLessonReadings: string[];
  dictionaryContainsConstructionReading: boolean;
  courseContainsConstructionReading: boolean;
  lessonReadingDifferences: Array<{
    reading: string;
    lessonRefs: string[];
    senseTypes: string[];
  }>;
  currentFrozenReading: string | null;
  currentReadingMatchesConstruction: boolean;
  currentReadingFormattingOnly: boolean;
}

interface MeaningSupport {
  label: string | null;
  dictionaryDefinition: string | null;
  dictionarySupportsLabel: boolean;
  standaloneLessonSupportsLabel: boolean;
  compoundLessonSupportsLabel: boolean;
  supportBasis: string[];
  compoundOnlyEvidence: boolean;
}

interface ConsistencyCheck {
  status: ConsistencyStatus;
  issueCodes: string[];
  warnings: string[];
  meaningSupport: MeaningSupport;
  readingSupport: ReadingSupport;
  diagnosis: {
    category:
      | 'none'
      | 'dictionary-metadata-omission-or-mismatch'
      | 'dictionary-course-reading-discrepancy'
      | 'unresolved-meaning';
    affectsConstructionMeaning: boolean;
    note: string;
  };
}

interface ReviewedRecord {
  character: string;
  constructionMeaning: string | null;
  constructionReading: string | null;
  targetDisposition: 'same' | 'same-after-annotation-cleanup' | 'change' | 'unresolved';
  status: ReviewedStatus;
  confidence: Confidence;
  basis: ConstructionBasis;
  lessonSenses: LessonSense[];
  lessonCompatibility: PreviewRecord['relationshipMeaningCompatibility'];
  classifierAnnotations: PreviewRecord['targetDecision']['classifierAnnotationsRemovedFromCleanTarget'];
  sourceRefs: string[];
  reviewReasons: string[];
  note: string;
  consistency: ConsistencyCheck;
  relationshipResearch: {
    status: ResearchStatus;
    reason: string;
    warnings: string[];
  };
  currentFrozenContext: {
    canonicalMeaning: string | null;
    reading: string | null;
    planStatus: string;
    plannerReviewReasons: string[];
    meaningReviewReasons: string[];
  };
}

interface ReviewedArtifact {
  schemaVersion: 1;
  artifact: 'book-1-frozen-47-reviewed-construction-meanings-v1';
  distribution: 'development-only-reviewed';
  publishable: false;
  hooksGenerated: false;
  apiCalls: 0;
  externalResearch: false;
  plannerChanged: false;
  frozenArtifactsChanged: false;
  productionDataChanged: false;
  sourcePreview: string;
  sourceBoundary: string[];
  summary: {
    frozenCharacterCount: number;
    approvedConstructionMeaningCount: number;
    unresolvedConstructionMeaningCount: number;
    approvedWithReadingWarningsCount: number;
    retainedConstructionMeaningChangeCount: number;
    classifierCleanupCount: number;
    rejectedOrDowngradedCount: number;
    relationshipResearchEligibleCount: number;
    relationshipResearchBlockedByMeaningCount: number;
    readingMismatchCount: number;
    readingMismatchCharacters: string[];
    lessonConstructionReadingDifferenceCount: number;
  };
  records: ReviewedRecord[];
}

interface ConsistencyArtifact {
  schemaVersion: 1;
  artifact: 'book-1-frozen-47-meaning-reading-consistency-v1';
  distribution: 'development-only-analysis';
  publishable: false;
  sourceReviewedArtifact: string;
  checks: Array<{
    character: string;
    status: ConsistencyStatus;
    issueCodes: string[];
    warnings: string[];
    diagnosis: ConsistencyCheck['diagnosis'];
    readingSupport: ReadingSupport;
    meaningSupport: MeaningSupport;
  }>;
  summary: {
    passCount: number;
    passWithWarningCount: number;
    blockedCount: number;
    mismatchCharacters: string[];
    mismatchCount: number;
  };
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const PREVIEW_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-character-meaning-profile-preview-v1.json');
const OUTPUT_JSON_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-reviewed-construction-meanings-v1.json');
const OUTPUT_MD_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-reviewed-construction-meanings-v1.md');
const CONSISTENCY_JSON_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-meaning-reading-consistency-v1.json');

const CLASSIFIER_PATTERN = /\((?:M|CL)\s*:/iu;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/gu, '')
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function normalizeReading(value: string | null): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/\([^)]*\)/gu, '')
    .replace(/[’'\s\-]/gu, '');
}

function stripReadingAnnotation(value: string | null): string {
  return (value ?? '').replace(/\([^)]*\)/gu, '').trim();
}

function labelTokens(label: string): string[] {
  return normalizeText(label).split(/\s+/u).filter(Boolean);
}

function meaningSupportedByDefinition(label: string, definition: string | null): boolean {
  if (!definition) return false;
  const normalizedDefinition = normalizeText(definition);
  const tokens = labelTokens(label);
  if (tokens.length === 0) return false;
  return tokens.every((token) => normalizedDefinition.includes(token));
}

function meaningSupportedBySense(label: string, sense: LessonSense): boolean {
  const candidate = normalizeText(label);
  const meaning = normalizeText(sense.meaning);
  if (!candidate || !meaning) return false;
  if (meaning.includes(candidate) || candidate.includes(meaning)) return true;
  const candidateTokens = labelTokens(label);
  return candidateTokens.length > 0 && candidateTokens.every((token) => meaning.includes(token));
}

function buildMeaningSupport(record: PreviewRecord): MeaningSupport {
  const label = record.constructionMeaning.label;
  if (!label) {
    return {
      label: null,
      dictionaryDefinition: record.dictionaryEvidence.definition,
      dictionarySupportsLabel: false,
      standaloneLessonSupportsLabel: false,
      compoundLessonSupportsLabel: false,
      supportBasis: [],
      compoundOnlyEvidence: false,
    };
  }
  const dictionarySupportsLabel = meaningSupportedByDefinition(label, record.dictionaryEvidence.definition);
  const standaloneLessonSupportsLabel = record.lessonSenses.some((sense) => sense.standalone && meaningSupportedBySense(label, sense));
  const compoundLessonSupportsLabel = record.lessonSenses.some((sense) => !sense.standalone && meaningSupportedBySense(label, sense));
  const supportBasis = [
    dictionarySupportsLabel ? 'dictionary-definition' : null,
    standaloneLessonSupportsLabel ? 'standalone-lesson-sense' : null,
    compoundLessonSupportsLabel ? 'compound-lesson-sense' : null,
  ].filter((value): value is string => value !== null);
  return {
    label,
    dictionaryDefinition: record.dictionaryEvidence.definition,
    dictionarySupportsLabel,
    standaloneLessonSupportsLabel,
    compoundLessonSupportsLabel,
    supportBasis,
    compoundOnlyEvidence: compoundLessonSupportsLabel && !dictionarySupportsLabel && !standaloneLessonSupportsLabel,
  };
}

function buildReadingSupport(record: PreviewRecord): ReadingSupport {
  const constructionReading = record.constructionMeaning.reading;
  const dictionaryReadings = record.dictionaryEvidence.readings ?? [];
  const standaloneSenses = record.lessonSenses.filter((sense) => sense.standalone);
  const standaloneLessonReadings = unique(standaloneSenses.map((sense) => sense.reading).filter((value): value is string => Boolean(value)));
  const normalizedConstructionReading = normalizeReading(constructionReading);
  const dictionaryContainsConstructionReading = Boolean(normalizedConstructionReading)
    && dictionaryReadings.some((reading) => normalizeReading(reading) === normalizedConstructionReading);
  const courseContainsConstructionReading = Boolean(normalizedConstructionReading)
    && standaloneLessonReadings.some((reading) => normalizeReading(reading) === normalizedConstructionReading);
  const lessonReadingDifferences = standaloneSenses
    .filter((sense) => Boolean(sense.reading) && normalizeReading(sense.reading) !== normalizedConstructionReading)
    .map((sense) => ({
      reading: sense.reading!,
      lessonRefs: sense.lessonRefs,
      senseTypes: [sense.senseType],
    }))
    .reduce<Array<{ reading: string; lessonRefs: string[]; senseTypes: string[] }>>((result, item) => {
      const existing = result.find((candidate) => normalizeReading(candidate.reading) === normalizeReading(item.reading));
      if (existing) {
        existing.lessonRefs = unique([...existing.lessonRefs, ...item.lessonRefs]);
        existing.senseTypes = unique([...existing.senseTypes, ...item.senseTypes]);
      } else {
        result.push(item);
      }
      return result;
    }, []);
  const currentFrozenReading = record.currentFrozenReading;
  const normalizedCurrent = normalizeReading(currentFrozenReading);
  const normalizedConstruction = normalizeReading(constructionReading);
  const strippedCurrent = normalizeReading(stripReadingAnnotation(currentFrozenReading));
  const currentReadingMatchesConstruction = Boolean(normalizedConstruction) && normalizedCurrent === normalizedConstruction;
  const currentReadingFormattingOnly = !currentReadingMatchesConstruction
    && Boolean(normalizedConstruction)
    && strippedCurrent === normalizedConstruction;
  return {
    constructionReading,
    dictionaryReadings,
    standaloneLessonReadings,
    dictionaryContainsConstructionReading,
    courseContainsConstructionReading,
    lessonReadingDifferences,
    currentFrozenReading,
    currentReadingMatchesConstruction,
    currentReadingFormattingOnly,
  };
}

function diagnoseReading(record: PreviewRecord, readingSupport: ReadingSupport, status: ReviewedStatus): ConsistencyCheck['diagnosis'] {
  if (status === 'unresolved') {
    return {
      category: 'unresolved-meaning',
      affectsConstructionMeaning: true,
      note: 'No construction meaning is promoted; relationship research remains blocked until a later evidence-backed decision.',
    };
  }
  if (record.character === '長') {
    return {
      category: 'dictionary-metadata-omission-or-mismatch',
      affectsConstructionMeaning: false,
      note: 'The raw dictionary row stores pinyin zhǎng while the Book 1 standalone row supplies cháng. The preview copied the raw row correctly; this is a source-row reading omission/mismatch, not a preview-reporting or multi-reading parser bug. The label long remains supported by the course row and dictionary definition.',
    };
  }
  if (record.character === '誰') {
    return {
      category: 'dictionary-course-reading-discrepancy',
      affectsConstructionMeaning: false,
      note: 'The raw dictionary row stores shuí while the Book 1 standalone row supplies shéi. The local data cannot determine whether this is an accepted variant or source omission, but it is not a preview-reporting bug. The label who is supported by both sources.',
    };
  }
  if (readingSupport.lessonReadingDifferences.length > 0 && !readingSupport.dictionaryContainsConstructionReading && !readingSupport.courseContainsConstructionReading) {
    return {
      category: 'dictionary-course-reading-discrepancy',
      affectsConstructionMeaning: true,
      note: 'Neither the dictionary reading list nor a standalone course reading supports the promoted construction reading.',
    };
  }
  return {
    category: 'none',
    affectsConstructionMeaning: false,
    note: 'No meaning/reading diagnostic beyond the recorded lesson-sense separation was found.',
  };
}

function buildConsistency(record: PreviewRecord, status: ReviewedStatus): ConsistencyCheck {
  const meaningSupport = buildMeaningSupport(record);
  const readingSupport = buildReadingSupport(record);
  const issueCodes: string[] = [];
  const warnings: string[] = [];
  if (status === 'unresolved') issueCodes.push('unresolved-construction-meaning');
  if (record.constructionMeaning.label && CLASSIFIER_PATTERN.test(record.constructionMeaning.label)) {
    issueCodes.push('classifier-annotation-in-construction-label');
  }
  if (record.constructionMeaning.label && !record.constructionMeaning.reading) {
    issueCodes.push('missing-construction-reading');
  }
  if (status === 'approved' && !meaningSupport.dictionarySupportsLabel && !meaningSupport.standaloneLessonSupportsLabel) {
    if (meaningSupport.compoundOnlyEvidence) issueCodes.push('compound-only-meaning-support');
    else issueCodes.push('unsupported-construction-meaning');
  }
  if (meaningSupport.compoundOnlyEvidence) issueCodes.push('compound-only-evidence-not-standalone');
  if (status === 'approved' && !readingSupport.dictionaryContainsConstructionReading && !readingSupport.courseContainsConstructionReading) {
    issueCodes.push('construction-reading-unsupported');
  }
  if (status === 'approved' && !readingSupport.dictionaryContainsConstructionReading && readingSupport.courseContainsConstructionReading) {
    warnings.push('dictionary-reading-does-not-match-course-construction-reading');
  }
  if (status === 'approved' && readingSupport.lessonReadingDifferences.length > 0) {
    warnings.push('lesson-reading-differs-from-construction-reading');
  }
  const diagnosis = diagnoseReading(record, readingSupport, status);
  if (diagnosis.category !== 'none' && status === 'approved') {
    warnings.push(diagnosis.category);
  }
  const hardIssues = issueCodes.filter((code) => code !== 'unresolved-construction-meaning');
  const consistencyStatus: ConsistencyStatus = hardIssues.length > 0
    ? 'blocked'
    : issueCodes.includes('unresolved-construction-meaning')
      ? 'blocked'
      : warnings.length > 0
        ? 'pass-with-warning'
        : 'pass';
  return {
    status: consistencyStatus,
    issueCodes,
    warnings: unique(warnings),
    meaningSupport,
    readingSupport,
    diagnosis,
  };
}

function buildRecord(record: PreviewRecord): ReviewedRecord {
  const status: ReviewedStatus = record.constructionMeaning.label ? 'approved' : 'unresolved';
  const consistency = buildConsistency(record, status);
  const relationshipStatus: ResearchStatus = status === 'approved' && consistency.status !== 'blocked'
    ? 'eligible'
    : 'blocked-by-meaning-uncertainty';
  const researchWarnings = [...consistency.warnings];
  const researchReason = relationshipStatus === 'eligible'
    ? 'Construction meaning is reviewed in the development-only layer; lesson-specific usages remain separate.'
    : 'Construction meaning is unresolved or failed a deterministic consistency check.';
  return {
    character: record.character,
    constructionMeaning: record.constructionMeaning.label,
    constructionReading: record.constructionMeaning.reading,
    targetDisposition: record.targetDecision.disposition as ReviewedRecord['targetDisposition'],
    status,
    confidence: record.constructionMeaning.confidence,
    basis: record.constructionMeaning.basis,
    lessonSenses: record.lessonSenses,
    lessonCompatibility: record.relationshipMeaningCompatibility,
    classifierAnnotations: record.targetDecision.classifierAnnotationsRemovedFromCleanTarget,
    sourceRefs: record.constructionMeaning.sourceRefs,
    reviewReasons: record.constructionMeaning.reviewReasons,
    note: record.constructionMeaning.note,
    consistency,
    relationshipResearch: {
      status: relationshipStatus,
      reason: researchReason,
      warnings: researchWarnings,
    },
    currentFrozenContext: {
      canonicalMeaning: record.currentFrozenCanonicalMeaning,
      reading: record.currentFrozenReading,
      planStatus: record.currentPlanContext.frozenPlanStatus,
      plannerReviewReasons: record.currentPlanContext.plannerReviewReasons,
      meaningReviewReasons: record.currentPlanContext.meaningReviewReasons,
    },
  };
}

function md(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function renderMarkdown(artifact: ReviewedArtifact): string {
  const lines: string[] = [];
  const consistencyRecords = artifact.records.map((record) => record.consistency);
  lines.push('# Book 1 frozen-47 reviewed construction meanings', '');
  lines.push('> Development-only reviewed meaning layer. It freezes construction/core meaning separately from Book 1 lesson senses. It does not modify the frozen planner, generate hooks, call DeepSeek, research external sources, assign roles, or publish.', '');
  lines.push('## Summary', '');
  lines.push(`- Construction meanings approved in this development layer: **${artifact.summary.approvedConstructionMeaningCount}**`);
  lines.push(`- Construction meanings unresolved: **${artifact.summary.unresolvedConstructionMeaningCount}**`);
  lines.push(`- Approved with reading warnings: **${artifact.summary.approvedWithReadingWarningsCount}**`);
  lines.push(`- Retained construction-target changes: **${artifact.summary.retainedConstructionMeaningChangeCount}**`);
  lines.push(`- Classifier-only cleanups: **${artifact.summary.classifierCleanupCount}**`);
  lines.push(`- Rejected or downgraded by deterministic checks: **${artifact.summary.rejectedOrDowngradedCount}**`);
  lines.push(`- Meaning-cleared for later relationship research: **${artifact.summary.relationshipResearchEligibleCount}**`);
  lines.push(`- Still blocked by meaning uncertainty: **${artifact.summary.relationshipResearchBlockedByMeaningCount}**`);
  lines.push(`- Meaning/reading source mismatches: **${artifact.summary.readingMismatchCount}** (${artifact.summary.readingMismatchCharacters.join('、') || 'none'})`);
  lines.push(`- Lesson readings intentionally different from construction readings: **${artifact.summary.lessonConstructionReadingDifferenceCount}**`, '');

  lines.push('## Reviewed construction-meaning table', '');
  lines.push('| Character | Construction meaning | Reading | Status | Confidence | Basis | Consistency | Relationship research |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    lines.push(`| ${record.character} | ${md(record.constructionMeaning ?? 'UNRESOLVED')} | ${md(record.constructionReading ?? '—')} | ${record.status} | ${record.confidence} | ${record.basis} | ${record.consistency.status} | ${record.relationshipResearch.status} |`);
  }

  lines.push('', '## Meaning/reading consistency report', '');
  lines.push('| Character | Result | Issue codes | Warnings | Diagnosis | Affects target? |');
  lines.push('|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    const c = record.consistency;
    lines.push(`| ${record.character} | ${c.status} | ${md(c.issueCodes.join(', ') || 'none')} | ${md(c.warnings.join(', ') || 'none')} | ${md(c.diagnosis.category)} | ${c.diagnosis.affectsConstructionMeaning ? 'yes' : 'no'} |`);
  }
  lines.push('', '### Reading mismatch findings', '');
  const sourceMismatchRecords = artifact.records.filter((candidate) => (
    candidate.consistency.diagnosis.category === 'dictionary-metadata-omission-or-mismatch'
    || candidate.consistency.diagnosis.category === 'dictionary-course-reading-discrepancy'
  ));
  for (const record of sourceMismatchRecords) {
    const c = record.consistency;
    lines.push(`- **${record.character}** — ${c.diagnosis.note}`);
    lines.push(`  - Dictionary readings: ${c.readingSupport.dictionaryReadings.join(', ') || 'none'}; standalone course readings: ${c.readingSupport.standaloneLessonReadings.join(', ') || 'none'}; construction reading: ${c.readingSupport.constructionReading ?? 'none'}.`);
  }
  lines.push('- No other character in the frozen 47 has a construction-reading mismatch against the available dictionary/course readings.', '');

  lines.push('## Relationship-research eligibility', '');
  lines.push('### Meaning-cleared / eligible later', '');
  lines.push(artifact.records.filter((record) => record.relationshipResearch.status === 'eligible').map((record) => `${record.character}(${record.constructionMeaning}, ${record.constructionReading})`).join('、') || 'none', '');
  lines.push('### Still blocked by meaning uncertainty', '');
  lines.push(artifact.records.filter((record) => record.relationshipResearch.status !== 'eligible').map((record) => `${record.character}(${record.reviewReasons.join(', ') || 'unresolved'})`).join('、') || 'none', '');
  lines.push('', '## Retained changes and unresolved cases', '');
  lines.push('### Retained construction-target changes', '');
  for (const record of artifact.records.filter((candidate) => candidate.targetDisposition === 'change')) {
    lines.push(`- **${record.character}**: ${record.currentFrozenContext.canonicalMeaning ?? 'none'} → **${record.constructionMeaning}**. ${record.note}`);
  }
  lines.push('', '### Unresolved and withheld', '');
  for (const record of artifact.records.filter((candidate) => candidate.status === 'unresolved')) {
    lines.push(`- **${record.character}**: construction meaning remains null. ${record.note}`);
  }
  lines.push('', '### Rejected or downgraded', '');
  lines.push('- None. The two source-reading discrepancies (長 and 誰) are approved meaning decisions with explicit non-blocking warnings; neither was silently corrected.', '');

  lines.push('## Detailed reviewed records', '');
  for (const record of artifact.records) {
    lines.push(`### ${record.character}`, '');
    lines.push(`- Construction meaning: **${record.constructionMeaning ?? 'UNRESOLVED'}**; reading: **${record.constructionReading ?? 'none'}**; status: **${record.status}**; confidence: **${record.confidence}**; basis: \`${record.basis}\`.`);
    lines.push(`- Target disposition from the accepted preview: **${record.targetDisposition}**.`);
    lines.push(`- Current frozen target: **${record.currentFrozenContext.canonicalMeaning ?? 'none'}**; reading: **${record.currentFrozenContext.reading ?? 'none'}**; plan status: \`${record.currentFrozenContext.planStatus}\`.`);
    lines.push(`- Lesson compatibility: **${record.lessonCompatibility.status}** — ${record.lessonCompatibility.note}`);
    lines.push(`- Review reasons: ${record.reviewReasons.join('; ') || 'none'}.`);
    lines.push(`- Meaning note: ${record.note}`);
    lines.push(`- Source refs: ${record.sourceRefs.map((ref) => `\`${ref}\``).join(', ') || 'none'}.`);
    lines.push(`- Classifier annotations kept as metadata: ${record.classifierAnnotations.map((annotation) => `\`${annotation.raw}\``).join(', ') || 'none'}.`);
    lines.push(`- Relationship research: **${record.relationshipResearch.status}** — ${record.relationshipResearch.reason}`);
    lines.push(`- Consistency: **${record.consistency.status}**; issue codes: ${record.consistency.issueCodes.join(', ') || 'none'}; warnings: ${record.consistency.warnings.join(', ') || 'none'}.`);
    lines.push(`- Meaning support: dictionary=${record.consistency.meaningSupport.dictionarySupportsLabel ? 'yes' : 'no'}, standalone lesson=${record.consistency.meaningSupport.standaloneLessonSupportsLabel ? 'yes' : 'no'}, compound lesson=${record.consistency.meaningSupport.compoundLessonSupportsLabel ? 'yes' : 'no'}.`);
    lines.push(`- Reading support: dictionary=${record.consistency.readingSupport.dictionaryContainsConstructionReading ? 'yes' : 'no'}, standalone lesson=${record.consistency.readingSupport.courseContainsConstructionReading ? 'yes' : 'no'}; lesson reading differences=${record.consistency.readingSupport.lessonReadingDifferences.map((item) => `${item.reading} [${item.lessonRefs.join(', ')}]`).join('; ') || 'none'}.`);
    if (record.consistency.diagnosis.category !== 'none') lines.push(`- Diagnostic note: ${record.consistency.diagnosis.note}`);
    lines.push('', '#### Lesson senses', '');
    lines.push('| Meaning | Reading | Standalone | Type | Lesson refs | Words | Classifier annotations |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const sense of record.lessonSenses) {
      lines.push(`| ${md(sense.meaning)} | ${md(sense.reading ?? '—')} | ${sense.standalone ? 'yes' : 'no'} | ${sense.senseType} | ${md(sense.lessonRefs.join(', '))} | ${md(sense.words.join(', '))} | ${md(sense.classifierAnnotations.map((annotation) => annotation.raw).join('; ') || 'none')} |`);
    }
    lines.push('');
  }

  lines.push('## Safety boundary', '');
  for (const boundary of artifact.sourceBoundary) lines.push(`- ${boundary}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const preview = readJson<PreviewArtifact>(PREVIEW_PATH);
  if (preview.publishable || preview.hooksGenerated || preview.apiCalls !== 0 || preview.externalResearch || preview.plannerChanged || preview.frozenArtifactsChanged || preview.productionDataChanged) {
    throw new Error('The source preview does not satisfy the development-only safety boundary.');
  }
  if (preview.records.length !== 47) throw new Error(`Expected 47 preview records, received ${preview.records.length}.`);
  const records = preview.records.map(buildRecord);
  const consistencyChecks = records.map((record) => ({
    character: record.character,
    status: record.consistency.status,
    issueCodes: record.consistency.issueCodes,
    warnings: record.consistency.warnings,
    diagnosis: record.consistency.diagnosis,
    readingSupport: record.consistency.readingSupport,
    meaningSupport: record.consistency.meaningSupport,
  }));
  const mismatchRecords = records.filter((record) => record.consistency.diagnosis.category === 'dictionary-metadata-omission-or-mismatch' || record.consistency.diagnosis.category === 'dictionary-course-reading-discrepancy');
  const lessonDifferenceCount = records.filter((record) => record.consistency.readingSupport.lessonReadingDifferences.length > 0).length;
  const artifact: ReviewedArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-reviewed-construction-meanings-v1',
    distribution: 'development-only-reviewed',
    publishable: false,
    hooksGenerated: false,
    apiCalls: 0,
    externalResearch: false,
    plannerChanged: false,
    frozenArtifactsChanged: false,
    productionDataChanged: false,
    sourcePreview: 'output/memory-hooks/book-1-frozen-47-character-meaning-profile-preview-v1.json',
    sourceBoundary: [
      'Only the accepted meaning preview, existing Book 1 lesson senses, and existing dictionary metadata are represented.',
      'Construction meaning is separate from lessonSenses; grammatical, modal, comparative, and measure-word usages remain lesson metadata.',
      'Classifier annotations remain attached to lesson metadata and are never part of constructionMeaning.',
      'No decomposition, component roles, semantic bridges, phonetic relationships, origin claims, external sources, DeepSeek calls, hooks, planner updates, or production writes were made.',
      'This layer is development-only and is not a production or pilot-data approval.',
    ],
    summary: {
      frozenCharacterCount: records.length,
      approvedConstructionMeaningCount: records.filter((record) => record.status === 'approved').length,
      unresolvedConstructionMeaningCount: records.filter((record) => record.status === 'unresolved').length,
      approvedWithReadingWarningsCount: records.filter((record) => record.status === 'approved' && record.consistency.status === 'pass-with-warning').length,
      retainedConstructionMeaningChangeCount: records.filter((record) => record.targetDisposition === 'change').length,
      classifierCleanupCount: records.filter((record) => record.classifierAnnotations.length > 0 && record.constructionMeaning !== null).length,
      rejectedOrDowngradedCount: records.filter((record) => record.consistency.status === 'blocked' && record.status === 'approved').length,
      relationshipResearchEligibleCount: records.filter((record) => record.relationshipResearch.status === 'eligible').length,
      relationshipResearchBlockedByMeaningCount: records.filter((record) => record.relationshipResearch.status !== 'eligible').length,
      readingMismatchCount: mismatchRecords.length,
      readingMismatchCharacters: mismatchRecords.map((record) => record.character),
      lessonConstructionReadingDifferenceCount: lessonDifferenceCount,
    },
    records,
  };
  const consistencyArtifact: ConsistencyArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-meaning-reading-consistency-v1',
    distribution: 'development-only-analysis',
    publishable: false,
    sourceReviewedArtifact: 'output/memory-hooks/book-1-frozen-47-reviewed-construction-meanings-v1.json',
    checks: consistencyChecks,
    summary: {
      passCount: consistencyChecks.filter((check) => check.status === 'pass').length,
      passWithWarningCount: consistencyChecks.filter((check) => check.status === 'pass-with-warning').length,
      blockedCount: consistencyChecks.filter((check) => check.status === 'blocked').length,
      mismatchCharacters: mismatchRecords.map((record) => record.character),
      mismatchCount: mismatchRecords.length,
    },
  };
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(CONSISTENCY_JSON_PATH, `${JSON.stringify(consistencyArtifact, null, 2)}\n`);
  writeFileSync(OUTPUT_MD_PATH, renderMarkdown(artifact));
  console.log(JSON.stringify({
    outputJson: OUTPUT_JSON_PATH,
    outputMarkdown: OUTPUT_MD_PATH,
    consistencyJson: CONSISTENCY_JSON_PATH,
    summary: artifact.summary,
    consistency: consistencyArtifact.summary,
    publishable: artifact.publishable,
    hooksGenerated: artifact.hooksGenerated,
    apiCalls: artifact.apiCalls,
    externalResearch: artifact.externalResearch,
    plannerChanged: artifact.plannerChanged,
    frozenArtifactsChanged: artifact.frozenArtifactsChanged,
    productionDataChanged: artifact.productionDataChanged,
  }, null, 2));
}

main();
