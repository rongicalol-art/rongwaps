import type {
  DisplayLabelBasis,
  EvidenceLicenseStatus,
  FormationVisualRelationSpec,
  RelationshipEvidenceSlot,
  RelationshipRole,
  TargetSemanticBridge,
} from '../../features/character-memory-hooks/model';

export interface ReviewedComponentSelection {
  glyph: string;
  treePaths: string[];
  displayLabel: string;
  labelBasis: DisplayLabelBasis;
  role: RelationshipRole;
  evidenceSlotId?: string;
}

export interface PilotFrameReview {
  character: string;
  targetDisplayLabel?: string;
  decision: 'approved-scene' | 'scene-candidate' | 'formation-candidate' | 'no-useful-hook';
  components: ReviewedComponentSelection[];
  sceneGuidance?: string;
  requiredMnemonicProps?: string[];
  formationRenderSpec?: FormationVisualRelationSpec;
  benchmarkHook?: string;
  benchmarkAhaConnection?: string;
  noHookReason?: 'unhelpful-components' | 'weak-modern-phonetic-relationship' | 'reviewed-no-useful-hook';
  rationale: string;
}

const MOE_SIT = 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=7723';
const MOE_EMOTION = 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=15163&la=0&powerMode=2';
const MOE_INVITE = 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=41903&q=1';
const CUHK_MOTHER = 'https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E5%AA%BD';
const MOE_SPEAK = 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=41811&la=0';

function evidence(
  id: string,
  targetCharacter: string,
  treePath: string,
  proposedRole: Exclude<RelationshipRole, 'unclassified'>,
  proposedDisplayLabel: string,
  labelBasis: DisplayLabelBasis,
  sourceRef: string,
  modernLearnerUsefulness: 'strong' | 'limited' = 'strong',
  licenseStatus: EvidenceLicenseStatus = 'review-required',
  semanticBridge?: TargetSemanticBridge,
): RelationshipEvidenceSlot {
  return {
    id,
    targetCharacter,
    componentOccurrenceIds: [`${targetCharacter}:${treePath}`],
    proposedRole,
    proposedDisplayLabel,
    labelBasis,
    sourceRefs: [sourceRef],
    evidenceStatus: 'candidate',
    licenseStatus,
    modernLearnerUsefulness,
    semanticBridge,
  };
}

function bridge(
  targetCharacter: string,
  componentOccurrenceId: string,
  phrase: string,
  sourceRef: string,
): TargetSemanticBridge {
  return {
    targetCharacter,
    componentOccurrenceIds: [componentOccurrenceId],
    phrase,
    sourceRefs: [sourceRef],
    evidenceStatus: 'candidate',
    licenseStatus: 'review-required',
  };
}

export const PILOT_RELATIONSHIP_EVIDENCE_SLOTS: RelationshipEvidenceSlot[] = [
  evidence('坐:从:visual-v1', '坐', '1', 'visual', 'two people', 'visual', MOE_SIT),
  evidence('坐:土:visual-v1', '坐', '0', 'visual', 'ground', 'visual', MOE_SIT),
  evidence(
    '情:忄:semantic-v1',
    '情',
    '0',
    'semantic',
    'heart',
    'meaning',
    MOE_EMOTION,
    'strong',
    'review-required',
    bridge('情', '情:0', 'feelings and emotions are associated with the heart', MOE_EMOTION),
  ),
  evidence('情:青:phonetic-v1', '情', '1', 'phonetic', 'qīng', 'reading', MOE_EMOTION),
  evidence(
    '請:言:semantic-v1',
    '請',
    '0',
    'semantic',
    'speech',
    'meaning',
    MOE_INVITE,
    'strong',
    'review-required',
    bridge('請', '請:0', 'inviting or asking someone is done through speech', MOE_INVITE),
  ),
  evidence('請:青:phonetic-v1', '請', '1', 'phonetic', 'qīng', 'reading', MOE_INVITE),
  evidence('媽:女:semantic-v1', '媽', '0', 'semantic', 'woman', 'meaning', CUHK_MOTHER),
  evidence('媽:馬:phonetic-v1', '媽', '1', 'phonetic', 'mǎ', 'reading', CUHK_MOTHER),
  evidence('說:言:semantic-v1', '說', '0', 'semantic', 'speech', 'meaning', MOE_SPEAK),
  evidence('說:兌:phonetic-v1', '說', '1', 'phonetic', 'duì', 'reading', MOE_SPEAK, 'limited'),
];

export const PILOT_FRAME_REVIEWS: PilotFrameReview[] = [
  {
    character: '好',
    decision: 'no-useful-hook',
    components: [],
    noHookReason: 'unhelpful-components',
    rationale: 'Woman plus child does not provide a neutral, non-tautological learner connection without further evidence.',
  },
  {
    character: '點',
    decision: 'scene-candidate',
    components: [
      { glyph: '黑', treePaths: ['0'], displayLabel: 'black', labelBasis: 'meaning', role: 'unclassified' },
      { glyph: '占', treePaths: ['1'], displayLabel: 'takes a spot', labelBasis: 'meaning', role: 'unclassified' },
    ],
    sceneGuidance: 'Use one visible black mark taking one precise spot; do not claim etymology. The target-specific learner label is 占(takes a spot); keep that token exact.',
    rationale: 'The current abstract wording can become a concrete dot/spot image.',
  },
  {
    character: '坐',
    decision: 'formation-candidate',
    components: [
      { glyph: '土', treePaths: ['0'], displayLabel: 'ground', labelBasis: 'visual', role: 'visual', evidenceSlotId: '坐:土:visual-v1' },
      { glyph: '从', treePaths: ['1'], displayLabel: 'two people', labelBasis: 'visual', role: 'visual', evidenceSlotId: '坐:从:visual-v1' },
    ],
    formationRenderSpec: {
      kind: 'visual-relation',
      subjectOccurrenceId: '坐:1',
      relation: 'sit-on',
      objectOccurrenceId: '坐:0',
    },
    rationale: 'Target-scoped visual labels provide the useful two-people-on-ground connection; global follow is rejected.',
  },
  {
    character: '情',
    decision: 'formation-candidate',
    components: [
      { glyph: '忄', treePaths: ['0'], displayLabel: 'heart', labelBasis: 'meaning', role: 'semantic', evidenceSlotId: '情:忄:semantic-v1' },
      { glyph: '青', treePaths: ['1'], displayLabel: 'qīng', labelBasis: 'reading', role: 'phonetic', evidenceSlotId: '情:青:phonetic-v1' },
    ],
    rationale: 'Meaning and modern sound cues are both useful, pending evidence and license clearance.',
  },
  {
    character: '請',
    decision: 'formation-candidate',
    components: [
      { glyph: '言', treePaths: ['0'], displayLabel: 'speech', labelBasis: 'meaning', role: 'semantic', evidenceSlotId: '請:言:semantic-v1' },
      { glyph: '青', treePaths: ['1'], displayLabel: 'qīng', labelBasis: 'reading', role: 'phonetic', evidenceSlotId: '請:青:phonetic-v1' },
    ],
    rationale: 'Speech and a useful modern qīng/qǐng sound cue support a formation explanation, pending clearance.',
  },
  {
    character: '媽',
    decision: 'formation-candidate',
    components: [
      { glyph: '女', treePaths: ['0'], displayLabel: 'woman', labelBasis: 'meaning', role: 'semantic', evidenceSlotId: '媽:女:semantic-v1' },
      { glyph: '馬', treePaths: ['1'], displayLabel: 'mǎ', labelBasis: 'reading', role: 'phonetic', evidenceSlotId: '媽:馬:phonetic-v1' },
    ],
    rationale: 'The reading label mǎ is useful; the irrelevant global horse story is rejected.',
  },
  {
    character: '喝',
    decision: 'scene-candidate',
    components: [
      { glyph: '口', treePaths: ['0'], displayLabel: 'mouth', labelBasis: 'meaning', role: 'unclassified' },
      { glyph: '曷', treePaths: ['1'], displayLabel: 'what', labelBasis: 'meaning', role: 'unclassified' },
    ],
    requiredMnemonicProps: ['cup'],
    sceneGuidance: 'Use one physical action: a cup tips toward 口(mouth) and leads directly to 喝(drink). Keep 曷(what) as a quiet word cue, never a speaking character or a question-answer puzzle. If you mention cup, declare it in mnemonicProps.',
    rationale: 'A concise cup scene can connect both supplied labels without historical claims.',
  },
  {
    character: '吃',
    decision: 'scene-candidate',
    components: [
      { glyph: '口', treePaths: ['0'], displayLabel: 'mouth', labelBasis: 'meaning', role: 'unclassified' },
      { glyph: '乞', treePaths: ['1'], displayLabel: 'beg', labelBasis: 'meaning', role: 'unclassified' },
    ],
    requiredMnemonicProps: ['food'],
    sceneGuidance: 'Use one causal food action: 口(mouth) has to 乞(beg) for food before it can 吃(eat). Keep the labels grammatical, avoid a generic “when you” opening, and declare food in mnemonicProps.',
    rationale: 'The connection is memorable when both labels participate naturally in one food scene.',
  },
  {
    character: '休',
    decision: 'approved-scene',
    components: [
      { glyph: '亻', treePaths: ['0'], displayLabel: 'person', labelBasis: 'meaning', role: 'unclassified' },
      { glyph: '木', treePaths: ['1'], displayLabel: 'tree', labelBasis: 'meaning', role: 'unclassified' },
    ],
    sceneGuidance: 'A person rests against a tree; do not claim history.',
    benchmarkHook: '亻(person) rests against 木(tree)—that scene is 休(rest).',
    benchmarkAhaConnection: 'A person leaning against a tree creates a direct image of rest.',
    rationale: 'Approved benchmark: one concrete spatial action leads directly to rest.',
  },
  {
    character: '明',
    decision: 'approved-scene',
    components: [
      { glyph: '日', treePaths: ['0'], displayLabel: 'sun', labelBasis: 'meaning', role: 'unclassified' },
      { glyph: '月', treePaths: ['1'], displayLabel: 'moon', labelBasis: 'meaning', role: 'unclassified' },
    ],
    sceneGuidance: 'Sun and moon fill the sky with light; do not claim history.',
    benchmarkHook: '日(sun) and 月(moon) fill the sky with light: 明(bright).',
    benchmarkAhaConnection: 'Sun and moon together create the visible image of brightness.',
    rationale: 'Approved benchmark: both visible components create one immediate brightness image.',
  },
  {
    character: '問',
    targetDisplayLabel: 'ask a question',
    decision: 'approved-scene',
    components: [
      { glyph: '門', treePaths: ['0'], displayLabel: 'door', labelBasis: 'meaning', role: 'unclassified' },
      { glyph: '口', treePaths: ['1'], displayLabel: 'mouth', labelBasis: 'meaning', role: 'unclassified' },
    ],
    sceneGuidance: 'A mouth calls through a door to ask a question; do not claim history.',
    benchmarkHook: 'A 口(mouth) calls through a 門(door) to 問(ask a question).',
    benchmarkAhaConnection: 'A mouth calling through a door is a concrete scene for asking.',
    rationale: 'Approved benchmark: a concrete action at a door naturally expresses asking.',
  },
  {
    character: '說',
    decision: 'no-useful-hook',
    components: [],
    noHookReason: 'weak-modern-phonetic-relationship',
    rationale: 'The historical 兌 sound role is supported but duì does not provide a useful modern cue for shuō.',
  },
];

export const PILOT_FRAME_REVIEWS_BY_CHARACTER = new Map(
  PILOT_FRAME_REVIEWS.map((review) => [review.character, review]),
);

export const PILOT_EVIDENCE_BY_ID = new Map(
  PILOT_RELATIONSHIP_EVIDENCE_SLOTS.map((slot) => [slot.id, slot]),
);
