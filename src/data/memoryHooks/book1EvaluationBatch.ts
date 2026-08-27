/**
 * Frozen, development-only selection for the second Book 1 Traditional
 * memory-hook evaluation. These are selection labels only; they do not
 * prescribe a hook, frame, component role, or learner-facing wording.
 */
export interface EvaluationBatchGroup {
  id: string;
  purpose: string;
  characters: readonly string[];
}

export const BOOK_ONE_EVALUATION_BATCH_47 = {
  batchId: 'book-1-evaluation-batch-47-v1',
  bookId: 1,
  script: 'traditional' as const,
  groups: [
    {
      id: 'atomic-origin-controls',
      purpose: 'Atomic characters; test origin evidence gating and safe withholding.',
      characters: ['人', '心', '女'],
    },
    {
      id: 'transparent-two-part-baseline',
      purpose: 'Two-part characters with currently approved component labels; test ordinary Scene/Formation generalization without target-specific answer metadata.',
      characters: ['信', '間', '生', '大', '東', '果', '來', '近', '渴', '們'],
    },
    {
      id: 'canonical-meaning-selection',
      purpose: 'Multiple lesson meanings, readings, or dictionary conflicts; test canonical learner-facing meaning selection.',
      characters: ['過', '了', '家', '上', '還', '會'],
    },
    {
      id: 'repeated-components',
      purpose: 'Repeated direct occurrences; test occurrence identity and repeated-token validation.',
      characters: ['朋', '多', '哥', '比', '畫'],
    },
    {
      id: 'encoded-intermediate-depth',
      purpose: 'Rare or expandable direct components; test pedagogical frame selection versus raw decomposition depth.',
      characters: ['學', '愛', '新', '聽', '覺', '親'],
    },
    {
      id: 'metadata-and-label-gaps',
      purpose: 'Missing or ambiguous component metadata; test label availability without inventing labels.',
      characters: ['男', '看', '開', '買', '語'],
    },
    {
      id: 'unknown-unencoded-structural-stress',
      purpose: 'Unknown/unencoded pieces, variant shapes, and excessive direct components; test safe structural withholding.',
      characters: ['不', '在', '年', '非', '長', '飛', '慶'],
    },
    {
      id: 'weak-or-nohook-controls',
      purpose: 'Weak or opaque modern relationships and grammatical meanings; test conservative NoHook/review outcomes.',
      characters: ['課', '誰', '該', '的', '得'],
    },
  ] satisfies readonly EvaluationBatchGroup[],
  /** No ordinary-character relationship, label, or frame overrides are embedded. */
  manualMetadata: {
    relationshipEvidence: [] as const,
    targetSpecificLabels: [] as const,
    frameOverrides: [] as const,
  },
} as const;

export const BOOK_ONE_EVALUATION_BATCH_CHARACTERS = BOOK_ONE_EVALUATION_BATCH_47.groups
  .flatMap((group) => group.characters);

