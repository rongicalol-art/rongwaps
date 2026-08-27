import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type CandidateStatus =
  | 'accepted-development-evidence'
  | 'accepted-with-caveat'
  | 'disputed'
  | 'insufficient'
  | 'rejected';
type EvidenceStrength = 'direct' | 'supporting' | 'weak';
type PedagogicalUse =
  | 'formation-useful'
  | 'origin-useful'
  | 'context-only'
  | 'not-useful-for-beginner';
type PublicationStatus = 'blocked-license' | 'review-required' | 'cleared';
type Relationship = 'semantic' | 'phonetic' | 'visual' | 'origin' | 'historical-group';
type Route = 'Formation' | 'Origin' | 'Scene' | 'NoHook' | 'Unresolved';
type Confidence = 'high' | 'medium' | 'low';

interface PilotCandidate {
  target: string;
  constructionMeaning: string;
  constructionReading: string;
  component: string | null;
  componentPath: string | null;
  relationship: Relationship;
  claim: string;
  exactSourceEvidence: string;
  evidenceStrength: 'direct' | 'supporting' | 'weak' | 'none';
  directSupport: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  sourceRefs: string[];
  sourceQuality: string[];
  licenseStatus: string;
  modernStructureCompatibility: string;
  usableForFormation: boolean;
  usableForOrigin: boolean;
  reviewReasons: string[];
}

interface PilotHistoricalFrame {
  status: 'supported' | 'partial' | 'none';
  description: string;
  components: string[];
  sourceRefs: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  differsMateriallyFromPhase4: boolean;
  caveats: string[];
}

interface PilotRecord {
  target: string;
  constructionMeaning: string | null;
  constructionReading: string | null;
  meaningStatus: string;
  meaningConfidence: string;
  meaningBasis: string;
  lessonSpecificMeanings: unknown[];
  meaningReviewReasons: string[];
  phase4: {
    recordId: string | null;
    sourceId: string | null;
    sourceVersion: string | null;
    rawTree: string | null;
    directVisibleComponents: string[];
    structuralOnly: true;
  };
  componentMetadata: unknown[];
  supportedRelationships: PilotCandidate[];
  unsupportedRelationshipNotes: string[];
  historicalFrame: PilotHistoricalFrame;
}

interface PilotArtifact {
  artifact: string;
  publishable: false;
  developmentOnly: true;
  records: PilotRecord[];
  sourceRecords: Array<{
    id: string;
    title: string;
    publisherOrAuthor: string;
    url: string;
    sourceType: string;
    exactClaim: string;
    accessDate: string;
    licenseStatus: string;
    licenseOrReuse: string;
    reuseMode: string;
  }>;
  runtimeLicenseGate: unknown;
}

interface AdjudicatedRelationshipEvidence {
  recordKind: 'candidate-fact' | 'excluded-interpretation';
  sourceCandidateKey: string;
  target: string;
  constructionMeaning: string;
  constructionReading: string;
  relationship: Relationship;
  componentOrGroup: string;
  componentPath: string | null;
  claim: string;
  status: CandidateStatus;
  evidenceStrength: EvidenceStrength;
  pedagogicalUse: PedagogicalUse;
  sourceRefs: string[];
  publicationStatus: PublicationStatus;
  historicalFrameDiffersFromModern: boolean;
  reviewNotes: string[];
  futureRendererUse: 'formation' | 'origin' | 'none';
}

interface ExcludedInterpretation {
  sourceCandidateKey: string;
  target: string;
  claim: string;
  status: CandidateStatus;
  pedagogicalUse: PedagogicalUse;
  sourceRefs: string[];
  publicationStatus: PublicationStatus;
  reason: string;
}

interface RouteDecision {
  route: Route;
  confidence: Confidence;
  reason: string;
  eligibleAfterAdjudication: false;
  missingBeforeEligibility: string[];
}

interface TargetAdjudicationRecord {
  target: string;
  constructionMeaning: string;
  constructionReading: string;
  modernStructuralFrame: {
    rawTree: string | null;
    directVisibleComponents: string[];
    sourceId: string | null;
    sourceVersion: string | null;
    structuralOnly: true;
  };
  historicalEvidenceFrame: PilotHistoricalFrame;
  evidence: AdjudicatedRelationshipEvidence[];
  excludedInterpretations: ExcludedInterpretation[];
  factsForFutureRenderers: string[];
  historicallyTrueButHiddenFromBeginnerHooks: string[];
  routeDecision: RouteDecision;
  meaningReviewReasons: string[];
}

interface CountSet {
  'accepted-development-evidence': number;
  'accepted-with-caveat': number;
  disputed: number;
  insufficient: number;
  rejected: number;
}

interface AdjudicationArtifact {
  schemaVersion: 1;
  artifact: 'book-1-eight-character-adjudicated-relationship-evidence-v1';
  distribution: 'development-only-adjudication';
  developmentOnly: true;
  publishable: false;
  externalResearchPerformed: false;
  sourcePilotArtifact: string;
  apiCalls: 0;
  hooksGenerated: false;
  plannerChanged: false;
  metadataChanged: false;
  constructionMeaningChanged: false;
  phase4Changed: false;
  pilotFrameReviewsChanged: false;
  productionDataChanged: false;
  sourceCandidateCount: number;
  adjudicatedRecordCount: number;
  exactTargets: string[];
  sourceRecords: PilotArtifact['sourceRecords'];
  runtimeLicenseGate: unknown;
  counts: {
    candidateFacts: CountSet;
    excludedInterpretations: CountSet;
    allAdjudicatedClaims: CountSet;
  };
  routeSummary: {
    formationReadyAfterReview: string[];
    originReadyAfterReview: string[];
    lackingPedagogicallyUsefulRoute: string[];
    materialHistoricalDifferences: string[];
  };
  records: TargetAdjudicationRecord[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const INPUT_PATH = resolve(OUTPUT_DIR, 'book-1-eight-character-relationship-evidence-pilot-v1.json');
const OUTPUT_JSON_PATH = resolve(OUTPUT_DIR, 'book-1-eight-character-adjudicated-relationship-evidence-v1.json');
const OUTPUT_MD_PATH = resolve(OUTPUT_DIR, 'book-1-eight-character-adjudicated-relationship-evidence-v1.md');

const TARGETS = ['課', '語', '開', '看', '學', '愛', '新', '買'];

type CandidateRule = Omit<AdjudicatedRelationshipEvidence, 'recordKind' | 'sourceCandidateKey' | 'target' | 'constructionMeaning' | 'constructionReading' | 'sourceRefs' | 'publicationStatus' | 'historicalFrameDiffersFromModern'> & {
  sourceRefs?: string[];
};

const CANDIDATE_RULES: Record<string, CandidateRule> = {
  '課|semantic|0|言': {
    componentPath: '0',
    componentOrGroup: '言',
    relationship: 'semantic',
    claim: 'In 課, 言 is identified in the cited Shuowen analysis as the semantic-side component; the same source gives the older gloss “testing/evaluation,” not a direct modern lesson explanation.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'context-only',
    reviewNotes: [
      'The target-specific role is source-backed.',
      'The reviewed learner meaning is lesson, while the cited historical gloss is testing/evaluation.',
      'Do not render 言(speech) as if the source directly explains lesson.',
      'A historical-to-modern meaning bridge is missing.',
    ],
    futureRendererUse: 'none',
  },
  '課|phonetic|1|果': {
    componentPath: '1',
    componentOrGroup: '果',
    relationship: 'phonetic',
    claim: 'In 課, 果 is identified in the cited Shuowen analysis as the phonetic element.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'not-useful-for-beginner',
    reviewNotes: [
      'The historical phonetic role is explicit.',
      'The source does not provide a useful modern guǒ→kè sound cue.',
      'Keep as historical context; do not ask a beginner to infer pronunciation from modern pinyin similarity.',
    ],
    futureRendererUse: 'none',
  },
  '語|semantic|0|言': {
    componentPath: '0',
    componentOrGroup: '言',
    relationship: 'semantic',
    claim: 'In 語, 言 is identified as the semantic component, and the source’s talk/speech meaning directly supports the reviewed learner meaning language.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'formation-useful',
    reviewNotes: [
      'This is target-specific evidence, not a global role assertion for 言.',
      'A future renderer still needs a separately approved target-specific bridge phrase.',
    ],
    futureRendererUse: 'formation',
  },
  '語|phonetic|1|吾': {
    componentPath: '1',
    componentOrGroup: '吾',
    relationship: 'phonetic',
    claim: 'In 語, 吾 is identified as the phonetic component in the cited Shuowen analysis.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'context-only',
    reviewNotes: [
      'The historical role is accepted without relying on reading similarity.',
      '吾 has no globally approved learner label in the current metadata layer.',
      'The source does not make modern wú→yǔ pronunciation an obvious beginner cue.',
      'A future Formation renderer may use this only if the product accepts a historical phonetic fact as context rather than a sound-memory aid.',
    ],
    futureRendererUse: 'formation',
  },
  '開|origin|historical-phonetic-or-component|幵': {
    componentPath: 'historical-phonetic-or-component',
    componentOrGroup: '幵',
    relationship: 'origin',
    claim: 'The historical evidence for 開 includes 門 plus 幵; the cited source preserves an edition disagreement about whether 幵 is simply a second component or a phonetic element.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'origin-useful',
    reviewNotes: [
      'Preserve both Shuowen analyses; do not collapse them into one uncontested claim.',
      'The historical frame differs from the modern Phase 4 門+开 frame.',
      '幵 has no approved learner label and should not be silently replaced by 开(open).',
    ],
    futureRendererUse: 'origin',
  },
  '開|phonetic|historical-phonetic|幵': {
    componentPath: 'historical-phonetic',
    componentOrGroup: '幵',
    relationship: 'phonetic',
    claim: 'One cited Shuowen edition identifies 幵 as the phonetic element of 開, while another treats it as a second component.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'context-only',
    reviewNotes: [
      'This is a source disagreement, not a single verified role.',
      'Do not infer a modern sound cue from 开(kāi) merely because the Phase 4 token resembles the historical form.',
    ],
    futureRendererUse: 'origin',
  },
  '看|visual|0|龵': {
    componentPath: '0',
    componentOrGroup: '龵',
    relationship: 'visual',
    claim: 'In 看, the cited source identifies the upper 龵-shaped form as a graphic variant of 手 and describes the character through a hand-and-eye configuration.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'formation-useful',
    reviewNotes: [
      'The hand identification is scoped to 龵 in 看; it is not a global 龵(hand) label.',
      'This supports a target-specific visual Formation relation, not a general radical meaning.',
    ],
    futureRendererUse: 'formation',
  },
  '看|visual|1|目': {
    componentPath: '1',
    componentOrGroup: '目',
    relationship: 'visual',
    claim: 'In 看, the cited source explicitly pairs the hand form with 目 in the look/see configuration.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'formation-useful',
    reviewNotes: [
      'The useful fact is the target-specific hand-and-eye configuration, not a claim that 目 alone explains every sense of 看.',
    ],
    futureRendererUse: 'formation',
  },
  '學|phonetic|historical-shuowen-phonetic|𦥑': {
    componentPath: 'historical-shuowen-phonetic',
    componentOrGroup: '𦥑',
    relationship: 'phonetic',
    claim: 'The cited official entry records an image-rendered 𦥑 phonetic element in its Shuowen analysis of 學.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'context-only',
    reviewNotes: [
      'The source glyph is image-rendered and is not proven equivalent to the repository token 𦥯.',
      'No modern beginner sound cue is established.',
      'Keep this as bounded historical context, not as a direct label for 𦥯.',
    ],
    futureRendererUse: 'origin',
  },
  '學|historical-group|historical-grouped-analysis|爻 + 臼 + 宀 + 子': {
    componentPath: 'historical-grouped-analysis',
    componentOrGroup: '爻 + 臼 + 宀 + 子',
    relationship: 'historical-group',
    claim: 'A cited scholarly review discusses a historical analysis involving 爻 as educational content, 臼 as hands/process, 宀 as a building or roof under one interpretation, and 子 appearing later; the review preserves disagreement and an explicit need for more evidence for one alternative.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'supporting',
    pedagogicalUse: 'origin-useful',
    reviewNotes: [
      'This is a bounded scholarly interpretation, not a synthetic consensus etymology.',
      'Do not map the whole group onto the current 𦥯 token without a separate identity decision.',
      'A future Origin renderer must choose one bounded claim and preserve the disagreement.',
    ],
    futureRendererUse: 'origin',
  },
  '愛|semantic|historical-㤅|心': {
    componentPath: 'historical-㤅',
    componentOrGroup: '心',
    relationship: 'semantic',
    claim: 'In the older 㤅 analysis associated with 愛, the cited source connects the kindness/benefit gloss with 心.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'origin-useful',
    reviewNotes: [
      'This is a target-specific historical relationship for the older 㤅 analysis.',
      'It does not establish 心=love in the modern Phase 4 tree.',
      'Keep the kindness/benefit gloss distinct from the modern learner meaning love.',
    ],
    futureRendererUse: 'origin',
  },
  '愛|origin|historical-𢜤|夊 + 㤅': {
    componentPath: 'historical-𢜤',
    componentOrGroup: '夊 + 㤅',
    relationship: 'origin',
    claim: 'The cited source preserves a separate 𢜤 analysis involving 夊 and 㤅 and explains that the modern 愛 graph reflects later borrowing or reassignment.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'context-only',
    reviewNotes: [
      'Keep the 𢜤 and 㤅 analyses separate.',
      'This explains historical graph development, not a direct modern love meaning.',
      'The historical components differ from the Phase 4 爫+冖+𢖻 frame.',
    ],
    futureRendererUse: 'origin',
  },
  '愛|phonetic|historical-㤅-phonetic-element|': {
    componentPath: 'historical-㤅-phonetic-element',
    componentOrGroup: '(source-image phonetic element)',
    relationship: 'phonetic',
    claim: 'The cited source marks a phonetic element in the older 㤅 analysis, but the source glyph is image-rendered and is not normalized here.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'not-useful-for-beginner',
    reviewNotes: [
      'Accept only the existence of a source-marked phonetic element.',
      'Do not infer its glyph identity, modern pinyin, or a current component label.',
    ],
    futureRendererUse: 'none',
  },
  '新|origin|1|斤': {
    componentPath: '1',
    componentOrGroup: '斤',
    relationship: 'origin',
    claim: 'The cited source connects 斤 with the original taking/cutting-wood sense of 新 and describes the modern “new” meaning as an extension.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'origin-useful',
    reviewNotes: [
      'This supports a bounded cut-wood origin explanation.',
      'The source does not identify a tree component and does not support tree+axe=new.',
      'A future renderer must explain the historical meaning extension without adding 木(tree).',
    ],
    futureRendererUse: 'origin',
  },
  '新|phonetic|historical-phonetic-element|': {
    componentPath: 'historical-phonetic-element',
    componentOrGroup: '(source-image phonetic element)',
    relationship: 'phonetic',
    claim: 'The cited source explicitly marks a historical phonetic element in 新, but its glyph is source-image/variant dependent and is not normalized to the Phase 4 亲 token.',
    status: 'accepted-with-caveat',
    evidenceStrength: 'direct',
    pedagogicalUse: 'not-useful-for-beginner',
    reviewNotes: [
      'The existence of a historical phonetic element is accepted.',
      'Do not infer that 亲 is that element without a separate identity decision.',
      'Do not use the fact as a modern pronunciation cue.',
    ],
    futureRendererUse: 'none',
  },
  '買|origin|0 + 1|网/罒 + 貝|structure': {
    componentPath: '0 + 1',
    componentOrGroup: '網/罒 + 貝',
    relationship: 'origin',
    claim: 'The cited sources support the historical 网+貝 structure corresponding to the modern 罒+貝 frame.',
    status: 'accepted-development-evidence',
    evidenceStrength: 'direct',
    pedagogicalUse: 'context-only',
    reviewNotes: [
      'This is a structural/origin fact only.',
      'It does not by itself explain why the character means buy.',
      'Keep it separate from the proposed shell/net semantic story.',
    ],
    futureRendererUse: 'none',
  },
  '買|origin|0 + 1|网/罒 + 貝|shell-net-story': {
    componentPath: '0 + 1',
    componentOrGroup: '網/罒 + 貝',
    relationship: 'origin',
    claim: 'A cited interpretation proposes a net-taking-shells image, while the same source gives a hedged practical alternative and notes that early examples do not yet show the later buy/sell sense.',
    status: 'disputed',
    evidenceStrength: 'supporting',
    pedagogicalUse: 'not-useful-for-beginner',
    reviewNotes: [
      'The shell/net story is not a settled semantic explanation.',
      'Do not promote 貝(shell) to money/currency for this target from component metadata alone.',
      'Do not render net catches shells therefore buy.',
    ],
    futureRendererUse: 'none',
  },
};

const EXCLUDED_CLAIMS: Record<string, Array<Omit<ExcludedInterpretation, 'target' | 'sourceCandidateKey'>>> = {
  課: [
    { claim: '言(speech) + 果(fruit) directly explains 課(lesson).', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: [], publicationStatus: 'blocked-license', reason: 'No source supports this scene or semantic bridge; it is an arbitrary composition.' },
    { claim: 'The historical testing/evaluation gloss directly equals the reviewed learner meaning lesson.', status: 'insufficient', pedagogicalUse: 'context-only', sourceRefs: ['moe-ke'], publicationStatus: 'blocked-license', reason: 'The cited source records both facts but does not supply the needed meaning bridge.' },
  ],
  語: [
    { claim: '吾(wú) sounds like 語(yǔ), so the phonetic relationship is a modern sound cue.', status: 'insufficient', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: [], publicationStatus: 'blocked-license', reason: 'The source-backed role is accepted independently; reading similarity alone cannot establish a modern cue.' },
    { claim: '吾 means I in this target character.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: [], publicationStatus: 'blocked-license', reason: 'The target-specific phonetic role does not authorize a semantic label or global meaning.' },
  ],
  開: [
    { claim: '門(door) + 开(open) is a useful Formation explanation for 開(open).', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: [], publicationStatus: 'blocked-license', reason: 'The strict Scene review correctly identified this as tautological, and the modern 开 token is not the historical 幵 fact.' },
    { claim: '門 is semantic in 開 simply because 門 means door.', status: 'insufficient', pedagogicalUse: 'context-only', sourceRefs: ['moe-kai'], publicationStatus: 'blocked-license', reason: 'The source supports the historical frame and disagreement, not this semantic-role inference.' },
  ],
  看: [
    { claim: '龵 is globally equivalent to the learner label hand.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['moe-kan'], publicationStatus: 'blocked-license', reason: 'The evidence is target-scoped to 龵 in 看 as a graphic variant of 手.' },
    { claim: '目 alone explains every sense of 看.', status: 'insufficient', pedagogicalUse: 'context-only', sourceRefs: ['moe-kan'], publicationStatus: 'blocked-license', reason: 'The source supports a hand-and-eye configuration, not a one-component explanation of all senses.' },
  ],
  學: [
    { claim: '𦥯 means learning because it is the direct Phase 4 component of 學.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: [], publicationStatus: 'blocked-license', reason: 'The repository cluster note is structural/reuse metadata, not a semantic relationship.' },
    { claim: '爻 + 臼 + 宀 + 子 is the single correct historical etymology of 學.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['sage-xue', 'moe-xue'], publicationStatus: 'blocked-license', reason: 'The sources present multiple analyses and disagreements; merging them would fabricate consensus.' },
    { claim: '子(child) directly explains the modern learner meaning learn.', status: 'insufficient', pedagogicalUse: 'context-only', sourceRefs: ['sage-xue'], publicationStatus: 'blocked-license', reason: 'The source discusses the later appearance of 子, but does not make child alone the meaning explanation.' },
  ],
  愛: [
    { claim: '心(heart) = love in the modern Phase 4 frame 爫 + 冖 + 𢖻.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['moe-ai'], publicationStatus: 'blocked-license', reason: '心 belongs to the older 㤅 analysis, not the current direct Phase 4 tree, and the source’s gloss is kindness/benefit.' },
    { claim: 'The 㤅 and 𢜤 analyses can be merged into one simple origin story.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['moe-ai'], publicationStatus: 'blocked-license', reason: 'The source explicitly preserves separate analyses and later graph reassignment.' },
    { claim: 'The older kindness/benefit gloss directly equals modern love.', status: 'insufficient', pedagogicalUse: 'context-only', sourceRefs: ['moe-ai'], publicationStatus: 'blocked-license', reason: 'A historical-to-modern meaning bridge is not supplied by the candidate evidence.' },
  ],
  新: [
    { claim: '木(tree) + 斤(axe) = 新(new) is the historical formation.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['moe-xin'], publicationStatus: 'blocked-license', reason: 'The cited source identifies 斤 and a phonetic element and does not identify 木 as the historical semantic component.' },
    { claim: '亲 is the historical phonetic element in 新.', status: 'insufficient', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['moe-xin'], publicationStatus: 'blocked-license', reason: 'The source element is image/variant dependent and was not normalized to the Phase 4 亲 token.' },
  ],
  買: [
    { claim: '貝(shell) → money → buy is established by the supplied component metadata.', status: 'disputed', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['moe-mai', 'cuhk-mai'], publicationStatus: 'blocked-license', reason: 'The shell/money relation is general metadata, while the target-specific historical path is hedged.' },
    { claim: '網(net) catches 貝(shell), therefore 買 means buy.', status: 'disputed', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: ['cuhk-mai'], publicationStatus: 'blocked-license', reason: 'The source presents this as a cited interpretation with a hedged alternative and historical timing caveats.' },
    { claim: '網(net) + 貝(shell) is already a useful learner Formation frame for buy.', status: 'rejected', pedagogicalUse: 'not-useful-for-beginner', sourceRefs: [], publicationStatus: 'blocked-license', reason: 'The structural fact is accepted, but the semantic story has not survived adjudication.' },
  ],
};

const ROUTES: Record<string, RouteDecision> = {
  課: {
    route: 'Unresolved',
    confidence: 'low',
    reason: 'The source-backed 言/果 roles and older testing/evaluation meaning are real, but no supported bridge reaches the reviewed learner meaning lesson.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['A reviewed target-specific bridge from testing/evaluation to lesson/class.', 'A decision that the historical 果 phonetic fact is worth exposing to beginners.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  語: {
    route: 'Formation',
    confidence: 'medium',
    reason: '言 semantic and 吾 phonetic are directly source-backed in 語; the semantic relation is formation-useful, while the phonetic fact is historically valid but only context-useful for beginners.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['Target-specific semantic bridge phrase.', 'Decision on whether to include the historical 吾 role despite weak modern sound salience.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  開: {
    route: 'Origin',
    confidence: 'medium',
    reason: 'The historical 門+幵 evidence can support an Origin explanation, provided the competing Shuowen analyses and modern 开/old 幵 distinction remain visible.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['Human-approved bounded wording for the source disagreement.', 'A reviewed handling/label for historical 幵.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  看: {
    route: 'Formation',
    confidence: 'high',
    reason: 'The cited source directly supports the target-scoped hand-variant plus eye visual configuration, making 看 the strongest visual Formation route in this pass.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['Target-specific display label for 龵 as a graphic hand variant, not a global label.', 'Deterministic wording review.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  學: {
    route: 'Origin',
    confidence: 'low',
    reason: 'Bounded historical claims exist, but the sources disagree and do not map cleanly to 𦥯; only a carefully selected Origin fact is defensible.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['Human selection of one bounded historical claim.', 'A decision whether and how to relate that claim to 𦥯 without flattening it.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  愛: {
    route: 'Origin',
    confidence: 'low',
    reason: 'The separate 㤅/𢜤 analyses are source-backed, but neither maps directly to the modern Phase 4 tree or supplies a simple modern love bridge.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['Human choice of one historical analysis.', 'Explicit scope for the older 心/kindness relationship.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  新: {
    route: 'Origin',
    confidence: 'medium',
    reason: 'The cut-wood origin and meaning extension are directly source-backed and pedagogically more defensible than tree+axe, but require controlled wording.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['Human-approved cut-wood→new explanation.', 'Decision on whether to omit the opaque historical phonetic element.', 'License clearance or an approved non-redistributive citation policy.'],
  },
  買: {
    route: 'Unresolved',
    confidence: 'low',
    reason: 'Historical 网+貝 structure is accepted only as context; the shell/net semantic path to buy remains disputed, so no pedagogically useful Origin route survives yet.',
    eligibleAfterAdjudication: false,
    missingBeforeEligibility: ['A stronger or explicitly approved target-specific semantic/origin claim.', 'A decision not to use shell/money assumptions.', 'License clearance or an approved non-redistributive citation policy.'],
  },
};

const FUTURE_FACTS: Record<string, string[]> = {
  課: [],
  語: ['In 語, 言 is the source-identified semantic component.', 'In 語, 吾 is the source-identified phonetic component (historical role; modern cue usefulness remains limited).'],
  開: ['Historical evidence describes 開 with 門 and 幵, with a preserved source disagreement about 幵’s role.', 'The modern Phase 4 token 开 must remain separate from historical 幵.'],
  看: ['In 看, 龵 is identified as a graphic variant of 手.', 'The cited source describes a hand-and-eye configuration for 看.'],
  學: ['A bounded scholarly account discusses historical 爻/臼/宀/子 elements, but it must remain caveated and separate from 𦥯.', 'The official source records an image-rendered phonetic element in a Shuowen analysis.'],
  愛: ['The older 㤅 analysis associates a kindness/benefit gloss with 心.', 'A separate 𢜤 analysis involves 夊 and 㤅 and later graph reassignment.'],
  新: ['The source identifies 斤 in the original taking/cutting-wood sense and describes new as an extension.', 'The historical phonetic element remains unnormalized and should usually stay hidden from beginner hooks.'],
  買: [],
};

const HIDDEN_FACTS: Record<string, string[]> = {
  課: ['The historical testing/evaluation gloss.', 'The historical 果 phonetic role, because it is not a useful modern beginner cue.'],
  語: ['The historical 吾 phonetic role if the product chooses not to expose an opaque sound relationship.'],
  開: ['The edition disagreement over 幵’s role, unless an advanced/source note is intentionally shown.', 'The historical 幵 glyph itself if no learner-safe label is approved.'],
  看: ['The fact that 龵 is a graphic variant of 手 must remain target-scoped and should not become a global component meaning.'],
  學: ['The unresolved alternative analyses and the source’s explicit “needs more evidence” caveat.', 'The image-rendered 𦥑 phonetic element without a stable glyph mapping.'],
  愛: ['The separate 㤅 and 𢜤 analyses unless a source note is intentionally shown.', 'The old phonetic element’s identity and pronunciation.'],
  新: ['The historical phonetic element unless its identity and learner usefulness are separately reviewed.', 'Any tree+axe explanation, which is rejected by this evidence set.'],
  買: ['The hedged net-taking-shells interpretation.', 'Any shell→money→buy chain inferred from general component metadata.'],
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function countSet(): CountSet {
  return {
    'accepted-development-evidence': 0,
    'accepted-with-caveat': 0,
    disputed: 0,
    insufficient: 0,
    rejected: 0,
  };
}

function increment(counts: CountSet, status: CandidateStatus): void {
  counts[status] += 1;
}

function candidateKey(candidate: PilotCandidate): string {
  return `${candidate.target}|${candidate.relationship}|${candidate.componentPath ?? ''}|${candidate.component ?? ''}`;
}

function publicationStatus(candidate: PilotCandidate): PublicationStatus {
  return candidate.licenseStatus === 'cleared' ? 'review-required' : 'blocked-license';
}

function adjudicateCandidate(candidate: PilotCandidate, ruleKeyOverride?: string): AdjudicatedRelationshipEvidence {
  const key = ruleKeyOverride ?? candidateKey(candidate);
  const rule = CANDIDATE_RULES[key];
  if (!rule) throw new Error(`Missing adjudication rule for candidate ${key}`);
  return {
    recordKind: 'candidate-fact',
    sourceCandidateKey: key,
    target: candidate.target,
    constructionMeaning: candidate.constructionMeaning,
    constructionReading: candidate.constructionReading,
    relationship: rule.relationship,
    componentOrGroup: rule.componentOrGroup,
    componentPath: rule.componentPath,
    claim: rule.claim,
    status: rule.status,
    evidenceStrength: rule.evidenceStrength,
    pedagogicalUse: rule.pedagogicalUse,
    sourceRefs: candidate.sourceRefs,
    publicationStatus: publicationStatus(candidate),
    historicalFrameDiffersFromModern: candidate.modernStructureCompatibility === 'historical-frame-differs',
    reviewNotes: rule.reviewNotes,
    futureRendererUse: rule.futureRendererUse,
  };
}

function buildExcluded(target: string, item: Omit<ExcludedInterpretation, 'target' | 'sourceCandidateKey'>, index: number): ExcludedInterpretation {
  return {
    ...item,
    target,
    sourceCandidateKey: `${target}|excluded|${index}`,
  };
}

function buildTargetRecord(record: PilotRecord): TargetAdjudicationRecord {
  const route = ROUTES[record.target];
  if (!route) throw new Error(`Missing route rule for ${record.target}`);
  const evidence = record.supportedRelationships.flatMap((candidate) => {
    const key = candidateKey(candidate);
    if (record.target === '買' && candidate.relationship === 'origin') {
      return [
        adjudicateCandidate(candidate, `${key}|structure`),
        adjudicateCandidate(candidate, `${key}|shell-net-story`),
      ];
    }
    return [adjudicateCandidate(candidate)];
  });
  const excluded = (EXCLUDED_CLAIMS[record.target] ?? []).map((item, index) => buildExcluded(record.target, item, index));
  return {
    target: record.target,
    constructionMeaning: record.constructionMeaning ?? '',
    constructionReading: record.constructionReading ?? '',
    modernStructuralFrame: {
      rawTree: record.phase4.rawTree,
      directVisibleComponents: record.phase4.directVisibleComponents,
      sourceId: record.phase4.sourceId,
      sourceVersion: record.phase4.sourceVersion,
      structuralOnly: true,
    },
    historicalEvidenceFrame: record.historicalFrame,
    // The 買 candidate is deliberately normalized into two facts: accepted structure and disputed semantic interpretation.
    evidence,
    excludedInterpretations: excluded,
    factsForFutureRenderers: FUTURE_FACTS[record.target] ?? [],
    historicallyTrueButHiddenFromBeginnerHooks: HIDDEN_FACTS[record.target] ?? [],
    routeDecision: route,
    meaningReviewReasons: record.meaningReviewReasons,
  };
}

function mdCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function countFor(items: Array<{ status: CandidateStatus }>): CountSet {
  const counts = countSet();
  for (const item of items) increment(counts, item.status);
  return counts;
}

function mergeCounts(a: CountSet, b: CountSet): CountSet {
  return {
    'accepted-development-evidence': a['accepted-development-evidence'] + b['accepted-development-evidence'],
    'accepted-with-caveat': a['accepted-with-caveat'] + b['accepted-with-caveat'],
    disputed: a.disputed + b.disputed,
    insufficient: a.insufficient + b.insufficient,
    rejected: a.rejected + b.rejected,
  };
}

function renderCounts(counts: CountSet): string {
  return `accepted=${counts['accepted-development-evidence']}; accepted-with-caveat=${counts['accepted-with-caveat']}; disputed=${counts.disputed}; insufficient=${counts.insufficient}; rejected=${counts.rejected}`;
}

function renderMarkdown(artifact: AdjudicationArtifact): string {
  const lines: string[] = [];
  lines.push('# Book 1 eight-character adjudicated relationship evidence', '');
  lines.push('> Development-only adjudication of the existing eight-character evidence pilot. No new external research was performed, no DeepSeek calls were made, no hooks or frames were generated, and no planner, label, construction-meaning, Phase 4, registry, or production data was changed.', '');
  lines.push('## Boundary and status model', '');
  lines.push('- Factual status and publication/licensing status are separate. Accepted facts remain `blocked-license` until licensing is resolved.');
  lines.push('- Modern Phase 4 structure and historical evidence frames remain separate.');
  lines.push('- Accepted facts are target-specific; they do not create global component meanings or roles.');
  lines.push('- `eligibleAfterAdjudication` is false for every route: this pass prepares evidence, not final frames.', '');
  lines.push('## Summary', '');
  lines.push(`- Exact targets: ${artifact.exactTargets.join('、')}.`);
  lines.push(`- Existing source candidates read: ${artifact.sourceCandidateCount}; normalized/adjudicated evidence records: ${artifact.adjudicatedRecordCount}.`);
  lines.push(`- Candidate-fact statuses: ${renderCounts(artifact.counts.candidateFacts)}.`);
  lines.push(`- Excluded-interpretation statuses: ${renderCounts(artifact.counts.excludedInterpretations)}.`);
  lines.push(`- All claims combined: ${renderCounts(artifact.counts.allAdjudicatedClaims)}.`);
  lines.push(`- Formation route candidates after review: ${artifact.routeSummary.formationReadyAfterReview.join('、') || 'none'}.`);
  lines.push(`- Origin route candidates after review: ${artifact.routeSummary.originReadyAfterReview.join('、') || 'none'}.`);
  lines.push(`- Targets still lacking a pedagogically useful route: ${artifact.routeSummary.lackingPedagogicallyUsefulRoute.join('、') || 'none'}.`);
  lines.push(`- Material historical/Phase 4 differences: ${artifact.routeSummary.materialHistoricalDifferences.join('、')}.`, '');

  lines.push('## Accepted / caveated / disputed / excluded claim table', '');
  lines.push('| Target | Component/group | Relationship | Status | Pedagogical use | Publication | Claim |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    for (const fact of record.evidence) {
      lines.push(`| ${record.target} | ${mdCell(fact.componentOrGroup)} | ${fact.relationship} | ${fact.status} | ${fact.pedagogicalUse} | ${fact.publicationStatus} | ${mdCell(fact.claim)} |`);
    }
    for (const excluded of record.excludedInterpretations) {
      lines.push(`| ${record.target} | — | — | ${excluded.status} | ${excluded.pedagogicalUse} | ${excluded.publicationStatus} | ${mdCell(excluded.claim)} |`);
    }
  }
  lines.push('', '## Target route decisions', '');
  lines.push('| Target | Modern Phase 4 | Historical evidence | Preferred route | Confidence | Reason |');
  lines.push('|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    lines.push(`| ${record.target} | ${mdCell(record.modernStructuralFrame.rawTree ?? 'missing')} | ${mdCell(record.historicalEvidenceFrame.description)} | ${record.routeDecision.route} | ${record.routeDecision.confidence} | ${mdCell(record.routeDecision.reason)} |`);
  }
  lines.push('');

  for (const record of artifact.records) {
    lines.push(`## ${record.target} — ${record.constructionMeaning} (${record.constructionReading})`, '');
    lines.push(`**Modern structural frame:** ${mdCell(record.modernStructuralFrame.rawTree ?? 'missing')} — ${record.modernStructuralFrame.directVisibleComponents.join(' + ') || 'none'}; source=${record.modernStructuralFrame.sourceId ?? 'none'}; version=${record.modernStructuralFrame.sourceVersion ?? 'none'}. Structural only.`);
    lines.push(`**Historical evidence frame:** ${record.historicalEvidenceFrame.description}`);
    lines.push(`- Components/groups: ${record.historicalEvidenceFrame.components.join(' + ')}.`);
    lines.push(`- Source refs: ${record.historicalEvidenceFrame.sourceRefs.join(', ') || 'none'}; confidence=${record.historicalEvidenceFrame.confidence}; differs materially=${record.historicalEvidenceFrame.differsMateriallyFromPhase4 ? 'yes' : 'no'}.`);
    lines.push(`- Caveats: ${record.historicalEvidenceFrame.caveats.join(' ')}`);
    lines.push('', '### Adjudicated candidate facts', '');
    lines.push('| Status | Relationship | Component/group | Smallest defensible fact | Pedagogical use | Future renderer | Publication |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const fact of record.evidence) {
      lines.push(`| ${fact.status} | ${fact.relationship} | ${mdCell(fact.componentOrGroup)} | ${mdCell(fact.claim)} | ${fact.pedagogicalUse} | ${fact.futureRendererUse} | ${fact.publicationStatus} |`);
    }
    lines.push('');
    for (const fact of record.evidence) {
      lines.push(`- **${fact.relationship} / ${fact.componentOrGroup}:** ${fact.status}; ${fact.pedagogicalUse}. ${fact.reviewNotes.join(' ')}`);
    }
    lines.push('', '### Historically true or proposed, but excluded from beginner hooks', '');
    for (const item of record.historicallyTrueButHiddenFromBeginnerHooks) lines.push(`- ${item}`);
    if (record.historicallyTrueButHiddenFromBeginnerHooks.length === 0) lines.push('- none');
    lines.push('', '### Rejected/insufficient/disputed interpretations', '');
    for (const item of record.excludedInterpretations) lines.push(`- **${item.status}:** ${item.claim} — ${item.reason}`);
    if (record.excludedInterpretations.length === 0) lines.push('- none');
    lines.push('', '### Facts that could eventually feed a renderer', '');
    for (const fact of record.factsForFutureRenderers) lines.push(`- ${fact}`);
    if (record.factsForFutureRenderers.length === 0) lines.push('- none until a pedagogical bridge survives review.');
    lines.push('', '### Route gate', '');
    lines.push(`- Preferred route: **${record.routeDecision.route}** (${record.routeDecision.confidence}).`);
    lines.push(`- ${record.routeDecision.reason}`);
    lines.push(`- Eligible after this adjudication: no.`);
    lines.push(`- Missing before eligibility: ${record.routeDecision.missingBeforeEligibility.join('; ')}`);
    lines.push(`- Meaning-layer review reasons: ${record.meaningReviewReasons.join('; ') || 'none'}.`, '');
  }

  lines.push('## Licensing and provenance', '');
  lines.push('- The ten source records and their unresolved licensing notes are inherited unchanged from the evidence pilot. This pass does not attempt to resolve licensing.');
  lines.push('- Every accepted or caveated fact is marked `blocked-license`; disputed/insufficient/rejected interpretations are also not publishable.');
  lines.push('- Reliability adjudication does not imply redistribution permission.', '');
  lines.push('## Exact inputs and outputs', '');
  lines.push(`- Input: \`${artifact.sourcePilotArtifact}\``);
  lines.push(`- Output JSON: \`output/memory-hooks/book-1-eight-character-adjudicated-relationship-evidence-v1.json\``);
  lines.push(`- No records were written into \`src/data/memoryHooks/pilotFrameReviews.ts\`.`, '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const pilot = readJson<PilotArtifact>(INPUT_PATH);
  const records = TARGETS.map((target) => {
    const record = pilot.records.find((item) => item.target === target);
    if (!record) throw new Error(`Missing pilot record for ${target}`);
    return buildTargetRecord(record);
  });
  const candidateFacts = records.flatMap((record) => record.evidence);
  const excludedInterpretations = records.flatMap((record) => record.excludedInterpretations);
  const candidateCounts = countFor(candidateFacts);
  const excludedCounts = countFor(excludedInterpretations);
  const artifact: AdjudicationArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-eight-character-adjudicated-relationship-evidence-v1',
    distribution: 'development-only-adjudication',
    developmentOnly: true,
    publishable: false,
    externalResearchPerformed: false,
    sourcePilotArtifact: 'output/memory-hooks/book-1-eight-character-relationship-evidence-pilot-v1.json',
    apiCalls: 0,
    hooksGenerated: false,
    plannerChanged: false,
    metadataChanged: false,
    constructionMeaningChanged: false,
    phase4Changed: false,
    pilotFrameReviewsChanged: false,
    productionDataChanged: false,
    sourceCandidateCount: pilot.records.reduce((sum, record) => sum + record.supportedRelationships.length, 0),
    adjudicatedRecordCount: candidateFacts.length,
    exactTargets: TARGETS,
    sourceRecords: pilot.sourceRecords,
    runtimeLicenseGate: pilot.runtimeLicenseGate,
    counts: {
      candidateFacts: candidateCounts,
      excludedInterpretations: excludedCounts,
      allAdjudicatedClaims: mergeCounts(candidateCounts, excludedCounts),
    },
    routeSummary: {
      formationReadyAfterReview: records.filter((record) => record.routeDecision.route === 'Formation').map((record) => record.target),
      originReadyAfterReview: records.filter((record) => record.routeDecision.route === 'Origin').map((record) => record.target),
      lackingPedagogicallyUsefulRoute: records.filter((record) => record.routeDecision.route === 'Unresolved' || record.routeDecision.route === 'NoHook').map((record) => record.target),
      materialHistoricalDifferences: records.filter((record) => record.historicalEvidenceFrame.differsMateriallyFromPhase4).map((record) => record.target),
    },
    records,
  };
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(OUTPUT_MD_PATH, renderMarkdown(artifact));
  console.log(`Wrote ${OUTPUT_JSON_PATH}`);
  console.log(`Wrote ${OUTPUT_MD_PATH}`);
  console.log(`Targets=${artifact.exactTargets.length}; sourceCandidates=${artifact.sourceCandidateCount}; adjudicatedFacts=${artifact.adjudicatedRecordCount}; publishable=${artifact.publishable}; apiCalls=${artifact.apiCalls}`);
  console.log(`All claims: ${renderCounts(artifact.counts.allAdjudicatedClaims)}`);
}

main();
