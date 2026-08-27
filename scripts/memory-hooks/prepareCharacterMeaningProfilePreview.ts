import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseClassifierAnnotation, type LegacyCharacterMetadata } from './pipeline';

type Confidence = 'high' | 'medium' | 'low';
type ConstructionBasis =
  | 'lesson-dictionary-alignment'
  | 'dictionary-core'
  | 'lesson-core'
  | 'unresolved';
type CompatibilityStatus =
  | 'compatible'
  | 'derived-lesson-sense'
  | 'grammatical-lesson-sense'
  | 'meaning-review-required';
type MeaningDisposition = 'same' | 'same-after-annotation-cleanup' | 'change' | 'unresolved';
type LessonSenseType =
  | 'lexical'
  | 'lexical-derived'
  | 'compound-lexical'
  | 'grammatical'
  | 'modal'
  | 'comparative'
  | 'measure-word'
  | 'compound-grammatical'
  | 'unclassified';

interface VocabularyRow {
  id: string;
  traditional: string;
  pinyin: string | null;
  meaning: string | null;
}

interface VocabularyArtifact {
  items: VocabularyRow[];
}

interface LessonOccurrence {
  vocabularyId: string;
  word: string;
  pinyin: string;
  meaning: string;
  standalone: boolean;
}

interface MeaningDecision {
  selectedMeaning: string | null;
  selectedPinyin: string | null;
  method: string;
  confidence: Confidence;
  lessonSpecificMeanings: LessonOccurrence[];
  dictionaryDefinition: string | null;
  reviewReasons: string[];
}

interface InventoryEntry {
  character: string;
  occurrences: LessonOccurrence[];
  meaningDecision: MeaningDecision;
}

interface InventoryArtifact {
  entries: InventoryEntry[];
}

interface FrozenPlan {
  character: string;
  canonicalMeaning: string | null;
  targetDisplayLabel: string | null;
  canonicalPinyin: string | null;
  status: string;
  meaningReviewReasons: string[];
  reviewReasons: string[];
}

interface QualityPlanArtifact {
  publishable: false;
  promptChanged: false;
  hooksRegenerated: false;
  plans: FrozenPlan[];
}

interface MeaningProposal {
  label: string | null;
  reading: string | null;
  confidence: Confidence;
  basis: ConstructionBasis;
  disposition: MeaningDisposition;
  reviewReasons: string[];
  note: string;
  compatibilityStatus: CompatibilityStatus;
  compatibilityNote: string;
  postponeRelationshipResearch: boolean;
}

interface LessonSensePreview {
  meaning: string;
  reading: string | null;
  lessonRefs: string[];
  words: string[];
  standalone: boolean;
  senseType: LessonSenseType;
  sourceRefs: string[];
  classifierAnnotations: Array<{
    raw: string;
    entries: Array<{ character: string; pinyin: string | null }>;
  }>;
}

interface CharacterMeaningProfile {
  character: string;
  currentFrozenCanonicalMeaning: string | null;
  currentFrozenReading: string | null;
  dictionaryEvidence: {
    readings: string[] | null;
    definition: string | null;
    sourceRef: string | null;
  };
  constructionMeaning: {
    label: string | null;
    reading: string | null;
    confidence: Confidence;
    basis: ConstructionBasis;
    sourceRefs: string[];
    reviewReasons: string[];
    note: string;
  };
  lessonSenses: LessonSensePreview[];
  relationshipMeaningCompatibility: {
    status: CompatibilityStatus;
    note: string;
    materiallyDiffersFromConstructionMeaning: boolean;
  };
  targetDecision: {
    disposition: MeaningDisposition;
    currentHookTargetAction: 'keep' | 'clean-annotation' | 'change' | 'withhold-unresolved';
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

interface MeaningPreviewArtifact {
  schemaVersion: 1;
  artifact: 'book-1-frozen-47-character-meaning-profile-preview-v1';
  distribution: 'development-only-analysis';
  publishable: false;
  hooksGenerated: false;
  apiCalls: 0;
  externalResearch: false;
  plannerChanged: false;
  frozenArtifactsChanged: false;
  productionDataChanged: false;
  sourceInputs: string[];
  summary: {
    frozenCharacterCount: number;
    sameConstructionMeaningCount: number;
    sameAfterAnnotationCleanupCount: number;
    changedConstructionMeaningCount: number;
    unresolvedConstructionMeaningCount: number;
    materiallyDifferentLessonSenseCount: number;
    materiallyDifferentStandaloneLessonSenseCount: number;
    relationshipResearchPostponedCount: number;
    relationshipResearchPostponedCharacters: string[];
  };
  focusedCharacters: string[];
  records: CharacterMeaningProfile[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const VOCABULARY_PATH = resolve(ROOT, 'public/data/vocabulary/book-1.json');
const INVENTORY_PATH = resolve(OUTPUT_DIR, 'book-1-inventory.json');
const QUALITY_PLANS_PATH = resolve(OUTPUT_DIR, 'book-1-evaluation-batch-47-quality-plans-v2.json');
const BREAKDOWNS_DIR = resolve(ROOT, 'public/data/breakdowns');
const OUTPUT_JSON_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-character-meaning-profile-preview-v1.json');
const OUTPUT_MD_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-character-meaning-profile-preview-v1.md');

const FOCUSED_CHARACTERS = ['的', '得', '比', '課', '語', '會', '哥'];

const SOURCE_INPUTS = [
  'public/data/vocabulary/book-1.json',
  'public/data/breakdowns/shard-00.json … shard-31.json',
  'output/memory-hooks/book-1-inventory.json',
  'output/memory-hooks/book-1-plans.json',
  'output/memory-hooks/book-1-evaluation-batch-47-quality-plans-v2.json',
  'scripts/memory-hooks/pipeline.ts (classifier parsing and existing canonical decisions only)',
];

/**
 * These are review proposals, not planner overrides. Every non-null label is
 * taken from an existing course or dictionary gloss; no decomposition data is
 * consulted when selecting it.
 */
const PROPOSALS: Record<string, MeaningProposal> = {
  人: { label: 'person', reading: 'rén', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry and dictionary both support person.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  心: { label: 'heart', reading: 'xīn', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry-evidence'], note: 'Heart is the supplied dictionary core; Book 1 teaches the character only inside compounds.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Book 1 compounds use 心 in meanings such as snack, happy, worry, mood, and careful; those usages remain separate.', postponeRelationshipResearch: false },
  女: { label: 'female', reading: 'nǚ', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports female.', compatibilityStatus: 'compatible', compatibilityNote: 'Girl and daughter are related compound uses, not a conflict with the construction target.', postponeRelationshipResearch: false },
  信: { label: 'letter', reading: 'xìn', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same-after-annotation-cleanup', reviewReasons: [], note: 'The standalone lesson sense is letter; remove the classifier annotation from the construction token.', compatibilityStatus: 'compatible', compatibilityNote: 'The lesson target is letter; 封(fēng) is classifier metadata, not part of the meaning label.', postponeRelationshipResearch: false },
  間: { label: 'space', reading: 'jiān', confidence: 'medium', basis: 'dictionary-core', disposition: 'change', reviewReasons: ['current-target-is-a-measure-word-use'], note: 'The dictionary supplies space/place and the Phase 4 character meaning should not be reduced to the room classifier use.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Book 1 teaches 間 as the measure word for rooms and also uses it in room/time/between compounds.', postponeRelationshipResearch: true },
  生: { label: 'life', reading: 'shēng', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry-evidence'], note: 'Life is the supplied dictionary core; the many Book 1 compounds remain lesson usages.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Book 1 compounds cover student, birth, illness, life, and other derived uses.', postponeRelationshipResearch: false },
  大: { label: 'big', reading: 'dà', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports big.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Loud, building, adult, and university are compound extensions of the core adjective.', postponeRelationshipResearch: false },
  東: { label: 'east', reading: 'dōng', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports east.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: '東西 is a lexicalized compound meaning thing/stuff; the standalone target remains east.', postponeRelationshipResearch: false },
  果: { label: 'fruit', reading: 'guǒ', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry-evidence'], note: 'Fruit is explicitly supplied by the dictionary; no component data was used to select it.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Book 1 teaches fruit-related compounds and the conditional compound 如果.', postponeRelationshipResearch: false },
  來: { label: 'come', reading: 'lái', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports come.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Later, originally, and discovery expressions are separate compound uses.', postponeRelationshipResearch: false },
  近: { label: 'near', reading: 'jìn', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports near.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Vicinity and recently are compound/derived uses.', postponeRelationshipResearch: false },
  渴: { label: 'thirsty', reading: 'kě', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports thirsty.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  們: { label: null, reading: 'men', confidence: 'low', basis: 'unresolved', disposition: 'unresolved', reviewReasons: ['dictionary-only-grammatical-marker', 'no-defensible-lexical-construction-meaning'], note: 'The supplied dictionary definition is itself a plural marker; no separate lexical construction meaning is available.', compatibilityStatus: 'meaning-review-required', compatibilityNote: 'Book 1 teaches plural pronoun forms such as 你們、我們、他們; keep those usages as lesson senses.', postponeRelationshipResearch: true },
  過: { label: 'pass', reading: 'guò', confidence: 'medium', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: ['multiple-standalone-lesson-senses'], note: 'Pass is supported by both the dictionary core and one standalone Book 1 sense.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'The experience particle and celebrate/spend uses are materially separate lesson senses.', postponeRelationshipResearch: false },
  了: { label: null, reading: 'le', confidence: 'low', basis: 'unresolved', disposition: 'unresolved', reviewReasons: ['multiple-readings-in-dictionary-metadata', 'all-standalone-lesson-senses-are-grammatical', 'no-reading-aligned-lexical-core'], note: 'The dictionary mixes clear/finish with the completed-action particle and supplies more than one reading; do not select finish without sense-reading evidence.', compatibilityStatus: 'meaning-review-required', compatibilityNote: 'Book 1 uses 了 for changed situations, a completed action, and a lesson-specific construction after 太.', postponeRelationshipResearch: true },
  家: { label: 'house', reading: 'jiā', confidence: 'medium', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: ['multiple-standalone-lesson-senses'], note: 'House is directly supported by the standalone home/house entry and dictionary.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'The restaurant measure-word use remains separate from the construction target.', postponeRelationshipResearch: false },
  上: { label: 'above', reading: 'shàng', confidence: 'medium', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: ['multiple-standalone-lesson-senses', 'multiple-standalone-readings'], note: 'Above is directly supported; the temporal last use is a separate extension.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Book 1 also teaches last, which is not the spatial construction core.', postponeRelationshipResearch: false },
  還: { label: null, reading: 'hái', confidence: 'low', basis: 'unresolved', disposition: 'unresolved', reviewReasons: ['no-standalone-character-entry', 'multiple-dictionary-senses-not-reading-aligned'], note: 'Also/still and return are supplied together without sense-reading alignment; do not choose one as the construction core yet.', compatibilityStatus: 'meaning-review-required', compatibilityNote: 'Book 1 teaches still and also/in addition, but the supplied dictionary also includes return.', postponeRelationshipResearch: true },
  會: { label: 'assemble', reading: 'huì', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['multiple-standalone-lesson-senses', 'dictionary-core-not-aligned-to-lesson-senses'], note: 'Assemble/meet is explicitly supplied by the dictionary and is a defensible construction target, while can/will remain lesson senses.', compatibilityStatus: 'grammatical-lesson-sense', compatibilityNote: 'Book 1 uses 會 as the modal can/will; those usages must not be silently merged into assemble.', postponeRelationshipResearch: true },
  朋: { label: 'friend', reading: 'péng', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry-evidence'], note: 'Friend is the supplied dictionary core; no Book 1 standalone character entry exists.', compatibilityStatus: 'compatible', compatibilityNote: 'No separate Book 1 character-level sense was supplied.', postponeRelationshipResearch: false },
  多: { label: 'many', reading: 'duō', confidence: 'medium', basis: 'lesson-dictionary-alignment', disposition: 'change', reviewReasons: ['current-label-underrepresents-many/much-core'], note: 'Many is a cleaner learner-facing construction label for the supplied many/much dictionary and lesson sense; much remains in lessonSenses.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Book 1 also teaches more/over and to do more, which are extensions.', postponeRelationshipResearch: true },
  哥: { label: 'elder brother', reading: 'gē', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry-evidence'], note: 'Elder brother is the supplied dictionary meaning; no course character entry exists.', compatibilityStatus: 'compatible', compatibilityNote: 'No separate Book 1 character-level sense was supplied.', postponeRelationshipResearch: false },
  比: { label: 'compare', reading: 'bǐ', confidence: 'medium', basis: 'dictionary-core', disposition: 'change', reviewReasons: ['lesson-meaning-is-comparative-function'], note: 'Compare is the lexical dictionary core; than is a grammatical/comparative Book 1 use.', compatibilityStatus: 'grammatical-lesson-sense', compatibilityNote: 'The Book 1 comparative than meaning remains a lesson sense and must not replace compare as the construction target.', postponeRelationshipResearch: true },
  畫: { label: 'painting', reading: 'huà', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same-after-annotation-cleanup', reviewReasons: [], note: 'Painting is supported by the standalone lesson meaning and dictionary; remove 張 classifier metadata from the target token.', compatibilityStatus: 'compatible', compatibilityNote: '張 is classifier metadata, not part of the construction meaning.', postponeRelationshipResearch: false },
  學: { label: 'learn', reading: 'xué', confidence: 'medium', basis: 'lesson-core', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 sense to learn/to study is the only supplied character-level lexical target.', compatibilityStatus: 'compatible', compatibilityNote: 'Learn/study is a construction-core lexical use in the supplied course data.', postponeRelationshipResearch: false },
  愛: { label: 'love', reading: 'ài', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry and dictionary both support love.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  新: { label: 'new', reading: 'xīn', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports new.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  聽: { label: 'listen', reading: 'tīng', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports listen.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  覺: { label: null, reading: 'jué', confidence: 'low', basis: 'unresolved', disposition: 'unresolved', reviewReasons: ['dictionary-has-several-unrelated-senses', 'no-standalone-character-entry', 'lesson-compounds-do-not-identify-one-core-sense'], note: 'Conscious, sleep/nap, and wake up are all supplied, while Book 1 only provides 睡覺 and 覺得 compounds; no single construction meaning is safe yet.', compatibilityStatus: 'meaning-review-required', compatibilityNote: 'Book 1 compounds use 覺 in sleep and feel/think expressions, not a standalone target meaning.', postponeRelationshipResearch: true },
  親: { label: 'relatives', reading: 'qīn', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry-evidence'], note: 'Relatives/parents is the supplied dictionary core and matches the family compounds taught in Book 1.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Father and mother are compound uses; the dictionary also lists intimate and hazelnut tree.', postponeRelationshipResearch: false },
  男: { label: 'male', reading: 'nán', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports male.', compatibilityStatus: 'compatible', compatibilityNote: 'Boy is a related compound use, not a conflict with the construction target.', postponeRelationshipResearch: false },
  看: { label: 'look', reading: 'kàn', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: ['lesson-sense-includes-related-read/watch-extensions'], note: 'Look is a concise learner-facing form of the existing to look target; the standalone Book 1 sense also includes read/watch, which remain separate lesson senses.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Read, watch, and see are related extensions kept in lessonSenses rather than merged into the construction label.', postponeRelationshipResearch: false },
  開: { label: 'open', reading: 'kāi', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports open.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Start/begin and drive are separate compound extensions.', postponeRelationshipResearch: false },
  買: { label: 'buy', reading: 'mǎi', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports buy.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  語: { label: 'language', reading: 'yǔ', confidence: 'medium', basis: 'lesson-core', disposition: 'change', reviewReasons: ['current-dictionary-first-gloss-words-is-not-the-dominant-book-1-usage', 'no-standalone-character-entry'], note: 'Language is explicitly supplied by the dictionary and is the consistent meaning in Book 1 compounds 語言、語言交換、華語.', compatibilityStatus: 'meaning-review-required', compatibilityNote: 'Book 1 teaches language compounds; no standalone character entry exists, so approve this change before relationship research.', postponeRelationshipResearch: true },
  不: { label: 'not', reading: 'bù', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry'], note: 'Not/negative prefix is the supplied dictionary core.', compatibilityStatus: 'grammatical-lesson-sense', compatibilityNote: 'Book 1 teaches negative compounds and imperatives; these are lesson uses of a grammatical core.', postponeRelationshipResearch: false },
  在: { label: 'be located', reading: 'zài', confidence: 'medium', basis: 'lesson-core', disposition: 'change', reviewReasons: ['current-label-is-prepositional-lesson-use', 'multiple-standalone-lesson-senses'], note: 'Be located is directly present in the Book 1 gloss and is supported by the dictionary “to exist”; at/in/on and progressive marking remain lesson uses.', compatibilityStatus: 'grammatical-lesson-sense', compatibilityNote: 'Book 1 teaches location and progressive-aspect uses, so this target needs meaning review before relationship work.', postponeRelationshipResearch: true },
  年: { label: 'year', reading: 'nián', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports year.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Age, New Year, and grade are related compound uses.', postponeRelationshipResearch: false },
  非: { label: 'not', reading: 'fēi', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry'], note: 'Not/negative/non- is the supplied dictionary core.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: '非常 means very in Book 1; that idiomatic degree use remains separate.', postponeRelationshipResearch: false },
  長: { label: 'long', reading: 'cháng', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports long.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  飛: { label: 'fly', reading: 'fēi', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports fly.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Airplane and take-off are compound uses built from the same lexical core.', postponeRelationshipResearch: false },
  慶: { label: 'celebrate', reading: 'qìng', confidence: 'low', basis: 'lesson-core', disposition: 'change', reviewReasons: ['dictionary-only-no-character-entry', 'course-compound-favors-celebrate-over-congratulate'], note: 'Celebrate is explicitly supplied by the dictionary and is the meaning of the Book 1 compound 慶祝; do not keep congratulate merely because it is listed first.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'The Book 1 use is a compound lexical use rather than a standalone character entry.', postponeRelationshipResearch: true },
  課: { label: 'lesson', reading: 'kè', confidence: 'medium', basis: 'lesson-dictionary-alignment', disposition: 'change', reviewReasons: ['current-subject-label-is-not-the-book-1-learner-sense', 'multiple-standalone-lesson-senses'], note: 'Lesson is supported by the dictionary and aligns with the standalone Book 1 class sense; the measure-word use remains separate.', compatibilityStatus: 'derived-lesson-sense', compatibilityNote: 'Class is the direct lexical lesson sense; measure word for lessons is a separate grammatical/measure use.', postponeRelationshipResearch: true },
  誰: { label: 'who', reading: 'shéi', confidence: 'high', basis: 'lesson-dictionary-alignment', disposition: 'same', reviewReasons: [], note: 'The standalone Book 1 entry directly supports who.', compatibilityStatus: 'compatible', compatibilityNote: 'The direct lesson sense matches the construction meaning.', postponeRelationshipResearch: false },
  該: { label: 'should', reading: 'gāi', confidence: 'low', basis: 'dictionary-core', disposition: 'same', reviewReasons: ['dictionary-only-no-character-entry'], note: 'Should/ought/must is the supplied dictionary core and the meaning of the Book 1 compound 應該.', compatibilityStatus: 'grammatical-lesson-sense', compatibilityNote: 'The Book 1 use is modal and appears only inside a compound.', postponeRelationshipResearch: false },
  的: { label: null, reading: 'de', confidence: 'low', basis: 'unresolved', disposition: 'unresolved', reviewReasons: ['dictionary-mixes-aim-goal-with-function-word-senses', 'no-reading-aligned-lexical-core-for-book-1-reading'], note: 'The dictionary supplies aim/goal, of, possessive particle, and suffix senses but does not connect them to the Book 1 de reading; do not choose aim simply because it is lexical.', compatibilityStatus: 'meaning-review-required', compatibilityNote: 'Book 1 teaches the possessive particle; keep it as a lesson sense while the construction meaning remains unresolved.', postponeRelationshipResearch: true },
  得: { label: 'obtain', reading: 'dé', confidence: 'medium', basis: 'dictionary-core', disposition: 'change', reviewReasons: ['book-1-target-is-a-grammatical-complement-marker', 'construction-reading-differs-from-lesson-reading'], note: 'Obtain/get/acquire is the supplied dictionary core with reading dé; the Book 1 de complement marker remains separate.', compatibilityStatus: 'grammatical-lesson-sense', compatibilityNote: 'The lesson use is a grammatical complement marker and must not be presented as the construction meaning.', postponeRelationshipResearch: true },
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function loadBreakdowns(): Map<string, { metadata: LegacyCharacterMetadata; sourceRef: string }> {
  const result = new Map<string, { metadata: LegacyCharacterMetadata; sourceRef: string }>();
  for (let shard = 0; shard < 32; shard += 1) {
    const file = `shard-${String(shard).padStart(2, '0')}.json`;
    const artifact = readJson<{ items: LegacyCharacterMetadata[] }>(resolve(BREAKDOWNS_DIR, file));
    for (const metadata of artifact.items) result.set(metadata.character, {
      metadata,
      sourceRef: `public/data/breakdowns/${file}`,
    });
  }
  return result;
}

function cleanMeaning(value: string): string {
  return value
    .replace(/\s*\((?:M|CL)\s*:\s*[^)]*\)\s*$/iu, '')
    .trim();
}

function lessonSenseType(meaning: string, standalone: boolean): LessonSenseType {
  const lower = meaning.toLowerCase();
  if (/measure word|classifier|m\s*:/iu.test(lower)) return 'measure-word';
  if (/particle|marker|used after|indicating|in the process|preceded by|possessive|negative prefix/iu.test(lower)) return standalone ? 'grammatical' : 'compound-grammatical';
  if (/\bcan\b|\bwill\b|be going to|should|ought to|must/iu.test(lower)) return 'modal';
  if (/than|comparative|more\.\.\./iu.test(lower)) return 'comparative';
  if (!standalone) return /sometimes|really|truly|if|turns out|originally|later|afterwards|sorry|welcome|not bad|very/iu.test(lower) ? 'lexical-derived' : 'compound-lexical';
  return 'lexical';
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function buildLessonSenses(
  target: string,
  entry: InventoryEntry,
  vocabularySource: string,
): { senses: LessonSensePreview[]; annotations: CharacterMeaningProfile['targetDecision']['classifierAnnotationsRemovedFromCleanTarget'] } {
  const grouped = new Map<string, LessonSensePreview>();
  const annotations: CharacterMeaningProfile['targetDecision']['classifierAnnotationsRemovedFromCleanTarget'] = [];
  for (const occurrence of entry.occurrences) {
    const annotation = parseClassifierAnnotation(occurrence.meaning);
    const meaning = cleanMeaning(occurrence.meaning);
    const key = `${occurrence.pinyin}|${meaning}|${occurrence.standalone ? 'standalone' : 'compound'}`;
    const current = grouped.get(key) ?? {
      meaning,
      reading: occurrence.pinyin || null,
      lessonRefs: [],
      words: [],
      standalone: occurrence.standalone,
      senseType: lessonSenseType(meaning, occurrence.standalone),
      sourceRefs: [vocabularySource, 'output/memory-hooks/book-1-inventory.json'],
      classifierAnnotations: [],
    };
    current.lessonRefs.push(occurrence.vocabularyId);
    current.words.push(occurrence.word);
    if (annotation) {
      current.classifierAnnotations.push({ raw: annotation.raw, entries: annotation.entries });
      // Only annotations attached to the standalone target itself are
      // proposed for removal from the clean construction target. Measure
      // annotations on compounds remain lesson-sense metadata, not target
      // meaning metadata (for example 間 in 房間, or 會 in 演唱會).
      if (occurrence.standalone && occurrence.word === target) {
        annotations.push({
          raw: annotation.raw,
          entries: annotation.entries,
          sourceRefs: [`${vocabularySource}#${occurrence.vocabularyId}`, 'output/memory-hooks/book-1-inventory.json'],
        });
      }
    }
    grouped.set(key, current);
  }
  for (const sense of grouped.values()) {
    sense.lessonRefs = unique(sense.lessonRefs);
    sense.words = unique(sense.words);
    sense.classifierAnnotations = sense.classifierAnnotations.filter((annotation, index, all) => (
      all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(annotation)) === index
    ));
  }
  const uniqueAnnotations = annotations.filter((annotation, index, all) => (
    all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(annotation)) === index
  ));
  return { senses: [...grouped.values()], annotations: uniqueAnnotations };
}

function currentTargetAction(disposition: MeaningDisposition): CharacterMeaningProfile['targetDecision']['currentHookTargetAction'] {
  if (disposition === 'same') return 'keep';
  if (disposition === 'same-after-annotation-cleanup') return 'clean-annotation';
  if (disposition === 'change') return 'change';
  return 'withhold-unresolved';
}

function cleanCurrentMeaning(value: string | null): string | null {
  return value ? cleanMeaning(value) : null;
}

function buildRecord(
  target: string,
  inventory: InventoryArtifact,
  qualityPlans: QualityPlanArtifact,
  breakdowns: Map<string, { metadata: LegacyCharacterMetadata; sourceRef: string }>,
): CharacterMeaningProfile {
  const entry = inventory.entries.find((candidate) => candidate.character === target);
  const frozen = qualityPlans.plans.find((candidate) => candidate.character === target);
  const proposal = PROPOSALS[target];
  if (!entry || !frozen || !proposal) throw new Error(`Missing meaning data/proposal for ${target}`);
  const breakdown = breakdowns.get(target);
  const lesson = buildLessonSenses(target, entry, 'public/data/vocabulary/book-1.json');
  const dictionaryRef = breakdown?.sourceRef ?? 'public/data/breakdowns (character row not found)';
  const constructionSourceRefs = unique([
    ...(breakdown ? [dictionaryRef] : []),
    ...(proposal.basis === 'lesson-core' || proposal.basis === 'lesson-dictionary-alignment'
      ? lesson.senses.filter((sense) => sense.standalone).flatMap((sense) => sense.lessonRefs.map((ref) => `public/data/vocabulary/book-1.json#${ref}`))
      : []),
    'output/memory-hooks/book-1-inventory.json',
    'output/memory-hooks/book-1-plans.json',
  ]);
  const currentClean = cleanCurrentMeaning(frozen.canonicalMeaning);
  const targetText = proposal.disposition === 'unresolved'
    ? `Current target ${currentClean ?? 'none'} should be withheld until a defensible construction meaning is approved.`
    : proposal.disposition === 'same-after-annotation-cleanup'
      ? `Keep the semantic target ${proposal.label}, but remove classifier text from the learner-facing token.`
      : proposal.disposition === 'same'
        ? `Keep the construction target ${proposal.label}; preserve lesson-specific usages separately.`
        : `Change the construction target from ${currentClean ?? 'none'} to ${proposal.label}; preserve the current lesson usages separately.`;
  return {
    character: target,
    currentFrozenCanonicalMeaning: frozen.canonicalMeaning,
    currentFrozenReading: frozen.canonicalPinyin,
    dictionaryEvidence: {
      readings: breakdown?.metadata.pinyin ?? null,
      definition: breakdown?.metadata.definition ?? null,
      sourceRef: breakdown?.sourceRef ?? null,
    },
    constructionMeaning: {
      label: proposal.label,
      reading: proposal.reading,
      confidence: proposal.confidence,
      basis: proposal.basis,
      sourceRefs: constructionSourceRefs,
      reviewReasons: proposal.reviewReasons,
      note: proposal.note,
    },
    lessonSenses: lesson.senses,
    relationshipMeaningCompatibility: {
      status: proposal.compatibilityStatus,
      note: proposal.compatibilityNote,
      materiallyDiffersFromConstructionMeaning: proposal.compatibilityStatus !== 'compatible',
    },
    targetDecision: {
      disposition: proposal.disposition,
      currentHookTargetAction: currentTargetAction(proposal.disposition),
      targetShouldRemainSameOrChange: targetText,
      classifierAnnotationsRemovedFromCleanTarget: lesson.annotations,
      postponeRelationshipResearch: proposal.postponeRelationshipResearch,
    },
    currentPlanContext: {
      frozenPlanStatus: frozen.status,
      plannerReviewReasons: frozen.reviewReasons,
      meaningReviewReasons: frozen.meaningReviewReasons,
    },
  };
}

function md(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function renderMarkdown(artifact: MeaningPreviewArtifact): string {
  const lines: string[] = [];
  lines.push('# Book 1 frozen-47 construction-meaning preview', '');
  lines.push('> Development-only meaning audit. This report uses only existing Book 1 vocabulary rows, current dictionary metadata, and frozen meaning decisions. It does not use decomposition data to choose meanings, call DeepSeek, research external sources, generate hooks, modify frozen artifacts, or publish.', '');
  lines.push('## Summary', '');
  lines.push(`- Frozen characters audited: **${artifact.summary.frozenCharacterCount}**`);
  lines.push(`- Same construction meaning: **${artifact.summary.sameConstructionMeaningCount}**`);
  lines.push(`- Same meaning after classifier cleanup: **${artifact.summary.sameAfterAnnotationCleanupCount}**`);
  lines.push(`- Construction meaning should change: **${artifact.summary.changedConstructionMeaningCount}**`);
  lines.push(`- Construction meaning unresolved: **${artifact.summary.unresolvedConstructionMeaningCount}**`);
  lines.push(`- Characters with materially different lesson senses/usages: **${artifact.summary.materiallyDifferentLessonSenseCount}**`);
  lines.push(`- Characters with materially different standalone lesson senses: **${artifact.summary.materiallyDifferentStandaloneLessonSenseCount}**`);
  lines.push(`- Relationship research postponed: **${artifact.summary.relationshipResearchPostponedCount}** (${artifact.summary.relationshipResearchPostponedCharacters.join('、')})`, '');
  lines.push('### Interpretation of the counts', '');
  lines.push('- “Same construction meaning” means the semantic target remains the same; classifier-only cleanup is counted separately.');
  lines.push('- “Materially different lesson senses/usages” includes grammatical, modal, measure-word, or clearly derived Book 1 meanings. The standalone count is stricter and excludes merely compound-only occurrences.');
  lines.push('- A proposed label is not an approval or planner change. It is a review candidate grounded in existing supplied evidence.', '');
  lines.push('## Frozen-47 meaning table', '');
  lines.push('| Character | Current frozen target | Proposed construction target | Basis/confidence | Lesson compatibility | Action |');
  lines.push('|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    const construction = record.constructionMeaning.label ? `${record.constructionMeaning.label}${record.constructionMeaning.reading ? ` (${record.constructionMeaning.reading})` : ''}` : 'UNRESOLVED';
    lines.push(`| ${record.character} | ${md(`${record.currentFrozenCanonicalMeaning ?? 'none'} (${record.currentFrozenReading ?? 'no reading'})`)} | ${md(construction)} | ${record.constructionMeaning.basis} / ${record.constructionMeaning.confidence} | ${record.relationshipMeaningCompatibility.status} | ${record.targetDecision.currentHookTargetAction} |`);
  }
  lines.push('', '## Focused before/after review', '');
  lines.push('| Character | Current hook target | Proposed construction target | Book 1 lesson usage remains | Why |');
  lines.push('|---|---|---|---|---|');
  for (const target of FOCUSED_CHARACTERS) {
    const record = artifact.records.find((candidate) => candidate.character === target)!;
    const proposed = record.constructionMeaning.label ?? 'UNRESOLVED';
    const senses = record.lessonSenses.map((sense) => `${sense.meaning} [${sense.reading ?? '—'}]`).join('; ') || 'none recorded';
    lines.push(`| ${target} | ${md(record.currentFrozenCanonicalMeaning ?? 'none')} | ${md(proposed)} | ${md(senses)} | ${md(record.constructionMeaning.note)} |`);
  }
  lines.push('', '## Detailed records', '');
  for (const record of artifact.records) {
    lines.push(`### ${record.character}`, '');
    lines.push(`- Current frozen canonical meaning: **${record.currentFrozenCanonicalMeaning ?? 'none'}**; reading: **${record.currentFrozenReading ?? 'none'}**.`);
    lines.push(`- Proposed construction meaning: **${record.constructionMeaning.label ?? 'UNRESOLVED'}**; reading: **${record.constructionMeaning.reading ?? 'none'}**; basis: \`${record.constructionMeaning.basis}\`; confidence: \`${record.constructionMeaning.confidence}\`.`);
    lines.push(`- Proposal note: ${record.constructionMeaning.note}`);
    lines.push(`- Dictionary evidence: readings **${record.dictionaryEvidence.readings?.join(', ') ?? 'none'}**; definition **${record.dictionaryEvidence.definition ?? 'none'}**; source ${record.dictionaryEvidence.sourceRef ? `\`${record.dictionaryEvidence.sourceRef}\`` : 'not found'}.`);
    lines.push(`- Review reasons: ${record.constructionMeaning.reviewReasons.length > 0 ? record.constructionMeaning.reviewReasons.join('; ') : 'none'}.`);
    lines.push(`- Existing planner meaning reasons: ${record.currentPlanContext.meaningReviewReasons.length > 0 ? record.currentPlanContext.meaningReviewReasons.join('; ') : 'none'}.`);
    lines.push(`- Relationship compatibility: **${record.relationshipMeaningCompatibility.status}** — ${record.relationshipMeaningCompatibility.note}`);
    lines.push(`- Materially differs from construction meaning: **${record.relationshipMeaningCompatibility.materiallyDiffersFromConstructionMeaning ? 'yes' : 'no'}**.`);
    lines.push(`- Target action: **${record.targetDecision.currentHookTargetAction}** — ${record.targetDecision.targetShouldRemainSameOrChange}`);
    lines.push(`- Relationship/evidence research: **${record.targetDecision.postponeRelationshipResearch ? 'postpone until meaning review' : 'not blocked by meaning review'}**.`);
    lines.push(`- Construction source refs: ${record.constructionMeaning.sourceRefs.map((ref) => `\`${ref}\``).join(', ')}`, '');
    lines.push('#### Book 1 lesson senses/usages', '');
    lines.push('| Clean meaning | Reading | Lesson refs | Words | Standalone? | Type | Classifier annotations |');
    lines.push('|---|---|---|---|---|---|---|');
    if (record.lessonSenses.length === 0) lines.push('| none | — | — | — | — | — | — |');
    for (const sense of record.lessonSenses) {
      const annotations = sense.classifierAnnotations.map((annotation) => annotation.raw).join('; ') || 'none';
      lines.push(`| ${md(sense.meaning)} | ${md(sense.reading ?? '—')} | ${md(sense.lessonRefs.join(', '))} | ${md(sense.words.join(', '))} | ${sense.standalone ? 'yes' : 'no'} | ${sense.senseType} | ${md(annotations)} |`);
    }
    lines.push('', '#### Annotation cleanup', '');
    if (record.targetDecision.classifierAnnotationsRemovedFromCleanTarget.length === 0) lines.push('- No classifier/annotation text was removed from the clean learner meaning.');
    for (const annotation of record.targetDecision.classifierAnnotationsRemovedFromCleanTarget) {
      lines.push(`- Removed from clean meaning: \`${annotation.raw}\`; entries=${annotation.entries.map((entry) => `${entry.character}${entry.pinyin ? `(${entry.pinyin})` : ''}`).join(', ')}; source=${annotation.sourceRefs.join(', ')}.`);
    }
    lines.push('', '#### Frozen planner context', '');
    lines.push(`- Frozen plan status: \`${record.currentPlanContext.frozenPlanStatus}\`.`);
    lines.push(`- Planner review reasons: ${record.currentPlanContext.plannerReviewReasons.length > 0 ? record.currentPlanContext.plannerReviewReasons.join('; ') : 'none'}.`, '');
  }
  lines.push('## Source and safety boundary', '');
  lines.push('- Course meanings and readings come from `public/data/vocabulary/book-1.json` and the frozen inventory snapshot.');
  lines.push('- Dictionary definitions and readings come from `public/data/breakdowns/shard-*.json`, which is already the source used by the existing canonical-meaning pipeline.');
  lines.push('- Classifier/measure annotations remain attached to lesson senses and are never included in the clean construction target.');
  lines.push('- No decomposition, component label, role, bridge, etymology, or external source was used to choose a target meaning.');
  lines.push('- `publishable:false`, `hooksGenerated:false`, `apiCalls:0`, `externalResearch:false`.', '');
  lines.push('## Exact inputs read', '');
  for (const input of artifact.sourceInputs) lines.push(`- \`${input}\``);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const vocabulary = readJson<VocabularyArtifact>(VOCABULARY_PATH);
  const inventory = readJson<InventoryArtifact>(INVENTORY_PATH);
  const qualityPlans = readJson<QualityPlanArtifact>(QUALITY_PLANS_PATH);
  const breakdowns = loadBreakdowns();
  const frozenCharacters = qualityPlans.plans.map((plan) => plan.character);
  const records = frozenCharacters.map((character) => buildRecord(character, inventory, qualityPlans, breakdowns));
  const same = records.filter((record) => record.targetDecision.disposition === 'same');
  const cleaned = records.filter((record) => record.targetDecision.disposition === 'same-after-annotation-cleanup');
  const changed = records.filter((record) => record.targetDecision.disposition === 'change');
  const unresolved = records.filter((record) => record.targetDecision.disposition === 'unresolved');
  const material = records.filter((record) => record.relationshipMeaningCompatibility.materiallyDiffersFromConstructionMeaning);
  const materialStandalone = records.filter((record) => record.lessonSenses.some((sense) => sense.standalone && (
    sense.senseType === 'grammatical'
    || sense.senseType === 'modal'
    || sense.senseType === 'comparative'
    || sense.senseType === 'measure-word'
    || (record.constructionMeaning.label != null && cleanMeaning(sense.meaning).toLowerCase() !== record.constructionMeaning.label.toLowerCase())
  )));
  const postponed = records.filter((record) => record.targetDecision.postponeRelationshipResearch);
  const artifact: MeaningPreviewArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-frozen-47-character-meaning-profile-preview-v1',
    distribution: 'development-only-analysis',
    publishable: false,
    hooksGenerated: false,
    apiCalls: 0,
    externalResearch: false,
    plannerChanged: false,
    frozenArtifactsChanged: false,
    productionDataChanged: false,
    sourceInputs: SOURCE_INPUTS,
    summary: {
      frozenCharacterCount: records.length,
      sameConstructionMeaningCount: same.length + cleaned.length,
      sameAfterAnnotationCleanupCount: cleaned.length,
      changedConstructionMeaningCount: changed.length,
      unresolvedConstructionMeaningCount: unresolved.length,
      materiallyDifferentLessonSenseCount: material.length,
      materiallyDifferentStandaloneLessonSenseCount: materialStandalone.length,
      relationshipResearchPostponedCount: postponed.length,
      relationshipResearchPostponedCharacters: postponed.map((record) => record.character),
    },
    focusedCharacters: FOCUSED_CHARACTERS,
    records,
  };
  // Keep the source read explicit so a future vocabulary change cannot make
  // this preview look valid while the source file is absent or empty.
  if (vocabulary.items.length === 0) throw new Error('Book 1 vocabulary source is empty.');
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(OUTPUT_MD_PATH, renderMarkdown(artifact));
  console.log(JSON.stringify({
    outputJson: OUTPUT_JSON_PATH,
    outputMarkdown: OUTPUT_MD_PATH,
    frozenCharacterCount: records.length,
    summary: artifact.summary,
    apiCalls: artifact.apiCalls,
    externalResearch: artifact.externalResearch,
    publishable: artifact.publishable,
  }, null, 2));
}

main();
