import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { COMPONENT_LEXICON_BY_KEY } from '../../src/data/memoryHooks/componentLexicon';

type Relationship = 'semantic' | 'phonetic' | 'visual' | 'origin' | 'historical-group' | 'none';
type EvidenceStrength = 'direct' | 'supporting' | 'weak' | 'none';
type SourceQuality = 'authoritative' | 'scholarly' | 'lexicographic' | 'secondary' | 'community';
type LicenseStatus = 'cleared' | 'review-required' | 'unknown' | 'restricted';
type ModernStructureCompatibility =
  | 'matches-direct-frame'
  | 'matches-deeper-node'
  | 'historical-frame-differs'
  | 'not-applicable';
type CandidateDecision = 'candidate' | 'withhold';
type RouteDecision = 'yes' | 'no' | 'review-required';
type RecommendedRoute = 'Formation' | 'Origin' | 'Scene' | 'NoHook' | 'unresolved';

interface RuntimeTreeNode {
  0: 's' | 'g' | 'u' | '?' | 'e';
  1: string;
  2?: RuntimeTreeNode[] | string;
}

interface RuntimeRecord {
  r: string;
  s: number;
  t: RuntimeTreeNode;
}

interface RuntimeShard {
  records: Record<string, RuntimeRecord>;
}

interface RuntimeSource {
  id: string;
  version: string;
  redistributionStatus: string;
  license: string;
  attribution: string;
}

interface RuntimeManifest {
  version: string;
  sources: RuntimeSource[];
  licenseGate: {
    status: string;
    publishable: false;
    openBlockers: string[];
    note: string;
  };
}

interface ReviewedMeaningRecord {
  character: string;
  constructionMeaning: string | null;
  constructionReading: string | null;
  status: string;
  confidence: string;
  basis: string;
  lessonSenses: Array<{
    meaning: string;
    reading: string;
    lessonRefs: string[];
    words: string[];
    standalone: boolean;
    senseType: string;
    classifierAnnotations: unknown[];
  }>;
  reviewReasons: string[];
}

interface ReviewedMeaningArtifact {
  artifact: string;
  publishable: false;
  records: ReviewedMeaningRecord[];
}

interface ComponentProfile {
  glyph: string;
  rawGlosses: string[];
  readings: string[];
  approvedDefaultLabels: Array<{ label: string; sourceRefs: string[] }>;
  sourceRefs: string[];
}

interface ComponentProfileArtifact {
  profiles: ComponentProfile[];
}

interface ReviewedLabel {
  glyph: string;
  rawDefinitions: string[];
  readings: string[];
  globalApproval: 'approved' | 'review-required';
  approvedLabel: string | null;
  proposedLabel: string;
  approvalScope: string;
  source: { proposalArtifact: string; packetHash: string; provider: string; model: string; proposalWarnings: string[] };
}

interface ReviewedLabelArtifact {
  entries: ReviewedLabel[];
}

interface ComponentMetadata {
  glyph: string;
  rawDefinitions: string[];
  readings: string[];
  labels: string[];
  approvedLabel: string | null;
  status: 'approved' | 'lexicon-only' | 'review-required' | 'unlabeled' | 'missing';
  sourceRefs: string[];
  warnings: string[];
}

interface SourceRecord {
  id: string;
  title: string;
  publisherOrAuthor: string;
  url: string;
  sourceType: SourceQuality;
  exactClaim: string;
  accessDate: string;
  licenseStatus: LicenseStatus;
  licenseOrReuse: string;
  reuseMode: 'citation-only' | 'paraphrase-factual-claim-only';
}

interface RelationshipEvidenceCandidate {
  target: string;
  constructionMeaning: string;
  constructionReading: string;
  component: string | null;
  componentPath: string | null;
  relationship: Relationship;
  decision: CandidateDecision;
  claim: string;
  exactSourceEvidence: string;
  evidenceStrength: EvidenceStrength;
  directSupport: 'target-specific' | 'component-general-only' | 'structure-only' | 'no-support';
  confidence: 'high' | 'medium' | 'low' | 'none';
  sourceRefs: string[];
  sourceQuality: SourceQuality[];
  licenseStatus: LicenseStatus;
  modernStructureCompatibility: ModernStructureCompatibility;
  usableForFormation: boolean;
  usableForOrigin: boolean;
  reviewReasons: string[];
}

interface HistoricalFrame {
  status: 'supported' | 'partial' | 'none';
  description: string;
  components: string[];
  sourceRefs: string[];
  confidence: 'high' | 'medium' | 'low' | 'none';
  differsMateriallyFromPhase4: boolean;
  caveats: string[];
}

interface TargetEvidenceRecord {
  target: string;
  constructionMeaning: string | null;
  constructionReading: string | null;
  meaningStatus: string;
  meaningConfidence: string;
  meaningBasis: string;
  lessonSpecificMeanings: ReviewedMeaningRecord['lessonSenses'];
  meaningReviewReasons: string[];
  phase4: {
    recordId: string | null;
    sourceId: string | null;
    sourceVersion: string | null;
    rawTree: string | null;
    directVisibleComponents: string[];
    structuralOnly: true;
  };
  componentMetadata: ComponentMetadata[];
  supportedRelationships: RelationshipEvidenceCandidate[];
  unsupportedRelationshipNotes: string[];
  historicalFrame: HistoricalFrame;
  formationCandidate: RouteDecision;
  originCandidate: RouteDecision;
  recommendedRoute: RecommendedRoute;
  routeReason: string;
  missingBeforeApproval: string[];
  deterministicFormationSafeNow: false;
  deterministicOriginSafeNow: false;
  remainWithheldUnlessApproved: true;
}

interface EvidencePilotArtifact {
  schemaVersion: 1;
  artifact: 'book-1-eight-character-relationship-evidence-pilot-v1';
  distribution: 'development-only-analysis';
  publishable: false;
  developmentOnly: true;
  hooksGenerated: false;
  apiCalls: 0;
  plannerChanged: false;
  metadataChanged: false;
  constructionMeaningChanged: false;
  phase4Changed: false;
  pilotFrameReviewsChanged: false;
  externalResearch: true;
  scope: {
    targetCount: number;
    targets: string[];
    note: string;
  };
  sourceInputs: string[];
  sourceRecords: SourceRecord[];
  runtimeLicenseGate: RuntimeManifest['licenseGate'];
  summary: {
    directSourceBackedSemanticEvidenceCount: number;
    directSourceBackedPhoneticEvidenceCount: number;
    usefulSourceBackedHistoricalOriginEvidenceCount: number;
    materialPhase4HistoricalDifferenceCount: number;
    formationRouteCandidateCount: number;
    originRouteCandidateCount: number;
    deterministicFormationSafeNowCount: 0;
    deterministicOriginSafeNowCount: 0;
    sceneOnlyOrNoHookCount: number;
    allCandidatesRequireReview: true;
    unresolvedLicenseSourceCount: number;
  };
  records: TargetEvidenceRecord[];
}

const ROOT = resolve(import.meta.dirname, '../..');
const OUTPUT_DIR = resolve(ROOT, 'output/memory-hooks');
const RUNTIME_ROOT = resolve(ROOT, 'output/decomposition-runtime/phase4-candidate');
const MEANING_PATH = resolve(OUTPUT_DIR, 'book-1-frozen-47-reviewed-construction-meanings-v1.json');
const PROFILE_PATH = resolve(OUTPUT_DIR, 'book-1-component-profiles-v2.json');
const REVIEW_LABEL_PATH = resolve(OUTPUT_DIR, 'book-1-component-label-review-v1.json');
const OUTPUT_JSON_PATH = resolve(OUTPUT_DIR, 'book-1-eight-character-relationship-evidence-pilot-v1.json');
const OUTPUT_MD_PATH = resolve(OUTPUT_DIR, 'book-1-eight-character-relationship-evidence-pilot-v1.md');

const TARGETS = ['課', '語', '開', '看', '學', '愛', '新', '買'];
const ACCESS_DATE = '2026-08-13';

const SOURCE_RECORDS: SourceRecord[] = [
  {
    id: 'moe-ke',
    title: '教育部《異體字字典》— A03851 課',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=41924&powerMode=2',
    sourceType: 'authoritative',
    exactClaim: 'The entry records a Shuowen analysis of 課 as a testing/evaluation character, from 言 with 果 as the phonetic element, and separately lists lesson/class meanings.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-yu',
    title: 'Ministry of Education 《Dictionary of Chinese Character Variants》— A03833 語',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=41738&la=1',
    sourceType: 'authoritative',
    exactClaim: 'The entry records 語 as discourse/talk, from 言 with 吾 as the phonetic element, and lists speech, expression, and language uses with yǔ/yù readings.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-kai',
    title: 'Ministry of Education 《Dictionary of Chinese Character Variants》— A04376 開',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=47978&la=1',
    sourceType: 'authoritative',
    exactClaim: 'The entry records two Shuowen analyses: from 門 and 幵, or from 門 with 幵 as phonetic; it also says the modern standard glyph uses 开 inside 門 as a customary form rather than preserving the historical 幵 shape.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-kan',
    title: '教育部《異體字字典》— A02764 看',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=29661',
    sourceType: 'authoritative',
    exactClaim: 'The entry records 看 as a hand-and-eye configuration (from 手 under/over 目) and notes that the upper modern form is a graphic variant of 手; the target meanings include looking and seeing.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-xue',
    title: 'Ministry of Education 《Dictionary of Chinese Character Variants》— A01001 學 research notes',
    publisherOrAuthor: 'Ministry of Education, Taiwan; researcher Jin Zhousheng',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=-10536&la=1',
    sourceType: 'authoritative',
    exactClaim: 'The entry reproduces a Shuowen analysis of 學 involving 教, 冖, and an image-rendered 𦥑 phonetic element, while its variant notes discuss historical and abbreviated forms; the source does not identify the repository token 𦥯 as a simple learner label.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'sage-xue',
    title: 'Teaching as Learning: Etymological Investigation, Canonical Analysis, and Experiential Reflection in the Chinese Cultural Context',
    publisherOrAuthor: 'Lin Li, 2024; SAGE',
    url: 'https://journals.sagepub.com/doi/10.1177/20965311231189524',
    sourceType: 'scholarly',
    exactClaim: 'The article surveys oracle, bronze, and seal forms of 學, discusses a shared 爻 core, 臼 as hands, 宀 as a building/roof with an alternative interpretation, and the later appearance of 子; it explicitly treats one attractive alternative as needing more evidence.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'Publisher-hosted scholarly article; no project-specific redistribution clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-ai',
    title: '教育部《異體字字典》— A01404 愛',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=15448',
    sourceType: 'authoritative',
    exactClaim: 'The entry preserves two Shuowen analyses: an older 㤅 form connected with kindness/benefit from 心 plus a phonetic element, and a 𢜤 form connected with walking from 夊 plus 㤅 as phonetic; it explains that the modern 愛 form reflects later reassignment.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-xin',
    title: 'Ministry of Education 《Dictionary of Chinese Character Variants》— A01757 新',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?educode=A01757',
    sourceType: 'authoritative',
    exactClaim: 'The entry records the Shuowen analysis of 新 as taking/cutting wood, from 斤 plus a phonetic element, and explains that the modern “new” sense is extended from that earlier sense; the historical phonetic glyph is rendered as a source image and is not normalized to the Phase 4 亲 token.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'moe-mai',
    title: 'Ministry of Education 《Dictionary of Chinese Character Variants》— A03946 買',
    publisherOrAuthor: 'Ministry of Education, Taiwan',
    url: 'https://dict.variants.moe.edu.tw/dictView.jsp?ID=43077&la=1',
    sourceType: 'authoritative',
    exactClaim: 'The entry records 買 as a market/buy character from 网 and 貝, and notes that the modern upper 罒 is a graphic form of 网; it does not by itself authorize a shell-to-money learner bridge.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'review-required',
    licenseOrReuse: 'The page states ©2024 Ministry of Education, R.O.C. and all rights reserved; no project-specific reuse clearance is recorded.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
  {
    id: 'cuhk-mai',
    title: '漢語多功能字庫 — 買: 形義通解',
    publisherOrAuthor: 'Chinese University of Hong Kong Humanities Computing Centre',
    url: 'https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=%E8%B2%B7',
    sourceType: 'scholarly',
    exactClaim: 'The database reports oracle and bronze forms from 貝 and 网, cites a scholar’s net-taking-shell interpretation, but also presents a hedged practical alternative and notes that early examples were names before Qin slips show the buy/sell sense.',
    accessDate: ACCESS_DATE,
    licenseStatus: 'unknown',
    licenseOrReuse: 'No project-specific reuse terms or clearance were recorded during this audit; keep citation-only until reviewed.',
    reuseMode: 'paraphrase-factual-claim-only',
  },
];

const SOURCE_BY_ID = new Map(SOURCE_RECORDS.map((source) => [source.id, source]));

interface EvidenceSpec {
  component: string | null;
  componentPath?: string;
  relationship: Relationship;
  claim: string;
  sourceRefs: string[];
  evidenceStrength: EvidenceStrength;
  directSupport: RelationshipEvidenceCandidate['directSupport'];
  confidence: RelationshipEvidenceCandidate['confidence'];
  modernStructureCompatibility: ModernStructureCompatibility;
  usableForFormation: boolean;
  usableForOrigin: boolean;
  reviewReasons: string[];
}

interface TargetSpec {
  historicalFrame: HistoricalFrame;
  supportedRelationships: EvidenceSpec[];
  unsupportedRelationshipNotes: string[];
  formationCandidate: RouteDecision;
  originCandidate: RouteDecision;
  recommendedRoute: RecommendedRoute;
  routeReason: string;
  missingBeforeApproval: string[];
}

const TARGET_SPECS: Record<string, TargetSpec> = {
  課: {
    historicalFrame: {
      status: 'supported',
      description: 'The source-backed frame is 言 plus 果 as phonetic in the Shuowen analysis. Its original gloss is testing/evaluation; lesson/class is a later listed sense.',
      components: ['言', '果'],
      sourceRefs: ['moe-ke'],
      confidence: 'high',
      differsMateriallyFromPhase4: false,
      caveats: ['The historical semantic gloss is testing/evaluation, not a direct explanation of the reviewed learner meaning lesson.', '果’s historical phonetic role is explicit, but its modern reading is not a useful beginner sound cue for kè.'],
    },
    supportedRelationships: [
      {
        component: '言',
        componentPath: '0',
        relationship: 'semantic',
        claim: '言 is explicitly the semantic-side component in the source-backed formation, but the source connects the original meaning to testing/evaluation rather than directly to the modern learner label lesson.',
        sourceRefs: ['moe-ke'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['A target-specific bridge from testing/evaluation to lesson/class is still needed.', 'Do not render 言(speech) as if the source directly explains lesson.'],
      },
      {
        component: '果',
        componentPath: '1',
        relationship: 'phonetic',
        claim: '果 is explicitly identified as the historical phonetic element of 課, but the historical relationship is not a useful modern guǒ→kè learner cue.',
        sourceRefs: ['moe-ke'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['Historical phonetic truth is not sufficient for a modern beginner hook when the sound cue is opaque.', 'No modern pronunciation bridge should be invented.'],
      },
    ],
    unsupportedRelationshipNotes: ['The source does not authorize a speech-about-fruit scene or a direct semantic explanation of lesson from the raw labels.', 'The current reviewed meaning is lesson; the older frozen plan’s subject label must not be reused.'],
    formationCandidate: 'no',
    originCandidate: 'review-required',
    recommendedRoute: 'Origin',
    routeReason: 'Source-backed historical formation exists, but the original test/evaluation meaning and weak modern phonetic cue require a curated Origin explanation rather than deterministic Formation prose.',
    missingBeforeApproval: ['Reviewed bridge from historical testing/evaluation to learner-facing lesson.', 'Human approval of whether the historical phonetic fact is worth showing.', 'License/reuse clearance for the Ministry of Education source.'],
  },
  語: {
    historicalFrame: {
      status: 'supported',
      description: 'The source-backed frame is 言 as the semantic component and 吾 as the phonetic component; the entry’s meanings include speech, expression, and language.',
      components: ['言', '吾'],
      sourceRefs: ['moe-yu'],
      confidence: 'high',
      differsMateriallyFromPhase4: false,
      caveats: ['The reviewed learner meaning language is a modern/lexical use within the source’s broader talk/expression meaning range.', '吾 is not globally approved as a learner label; target-specific evidence does not grant global label approval.'],
    },
    supportedRelationships: [
      {
        component: '言',
        componentPath: '0',
        relationship: 'semantic',
        claim: '言 is explicitly the semantic component in the source-backed formation and its speech/talk meaning directly supports the target’s language meaning.',
        sourceRefs: ['moe-yu'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: true,
        usableForOrigin: true,
        reviewReasons: ['The final renderer still needs an approved target-specific semantic bridge phrase; this research record is not that bridge.'],
      },
      {
        component: '吾',
        componentPath: '1',
        relationship: 'phonetic',
        claim: '吾 is explicitly identified as the historical phonetic component of 語; the source’s reading history must be kept separate from modern yǔ pronunciation.',
        sourceRefs: ['moe-yu'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: true,
        usableForOrigin: true,
        reviewReasons: ['吾’s global learner label remains review-required.', 'Do not claim a modern wú→yǔ sound similarity without a separate pronunciation treatment.'],
      },
    ],
    unsupportedRelationshipNotes: ['No Scene is needed to explain the relationship; the source-backed semantic/phonetic frame is stronger and should remain separate from an invented story.'],
    formationCandidate: 'review-required',
    originCandidate: 'review-required',
    recommendedRoute: 'Formation',
    routeReason: 'This is the clearest source-backed semantic-plus-phonetic Formation candidate in the pilot, pending global-label separation, target-specific bridge approval, and licensing review.',
    missingBeforeApproval: ['Target-specific semantic bridge for language, stored separately from the global 言 label.', 'Human decision on whether to expose the historically phonetic 吾 relationship to beginners.', 'License/reuse clearance for the Ministry of Education source.'],
  },
  開: {
    historicalFrame: {
      status: 'supported',
      description: 'The historical frame is 門 plus 幵. The source preserves an edition disagreement about whether 幵 is simply a second component or the phonetic element; modern standard typography uses 开 inside 門 as a customary form.',
      components: ['門', '幵'],
      sourceRefs: ['moe-kai'],
      confidence: 'high',
      differsMateriallyFromPhase4: true,
      caveats: ['The Phase 4 token 开 must not be treated as historical proof of the original 幵 form.', 'The source does not establish 門 as a semantic component merely because it is visually a door.'],
    },
    supportedRelationships: [
      {
        component: '幵',
        componentPath: 'historical-phonetic-or-component',
        relationship: 'origin',
        claim: 'The source directly supports the historical 門+幵 analysis and records the edition disagreement; it does not make the modern 門+开 scene a non-tautological learner explanation.',
        sourceRefs: ['moe-kai'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The historical phonetic/component disagreement must be preserved.', 'No approved learner label for 幵 is present.', 'A deterministic Origin renderer would need a controlled explanation of the modern 开/old 幵 difference.'],
      },
      {
        component: '幵',
        componentPath: 'historical-phonetic',
        relationship: 'phonetic',
        claim: 'One of the source’s Shuowen editions explicitly treats 幵 as the phonetic element of 開; the competing edition treats it as a second component.',
        sourceRefs: ['moe-kai'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The source preserves an edition disagreement rather than a single uncontested role.', 'The historical glyph 幵 is not the modern Phase 4 token 开 and has no approved learner label.', 'Historical role truth is not enough to make a useful modern sound cue.'],
      },
    ],
    unsupportedRelationshipNotes: ['門(door)+开(open) remains tautological under the strict Scene gate.', 'Do not infer a semantic role for 門 from the door gloss alone, and do not infer a phonetic role from matching readings alone.'],
    formationCandidate: 'no',
    originCandidate: 'review-required',
    recommendedRoute: 'Origin',
    routeReason: 'Historical evidence can rescue the character, but only as a source-backed Origin frame that distinguishes 幵 from the modern Phase 4 token 开.',
    missingBeforeApproval: ['Reviewed label or controlled display policy for historical 幵.', 'Decision on how much edition disagreement to expose in learner prose.', 'License/reuse clearance for the Ministry of Education source.'],
  },
  看: {
    historicalFrame: {
      status: 'supported',
      description: 'The source-backed visual formation places a hand over/under an eye: 手 plus 目. The modern upper form 龵 is explicitly identified as a variant of 手.',
      components: ['手', '目'],
      sourceRefs: ['moe-kan'],
      confidence: 'high',
      differsMateriallyFromPhase4: false,
      caveats: ['龵 is a target-specific graphic variant of 手 in this character; this does not create a global label approval for every 龵 occurrence.', 'The source supports a visual formation, not a broad claim that 目 alone is the semantic radical for all uses.'],
    },
    supportedRelationships: [
      {
        component: '龵',
        componentPath: '0',
        relationship: 'visual',
        claim: 'The source identifies the upper form as a variant of 手 and describes the hand-and-eye configuration as the formation of 看(look).',
        sourceRefs: ['moe-kan'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: true,
        usableForOrigin: true,
        reviewReasons: ['A target-specific visual label such as 龵(hand variant) must remain scoped to 看.', 'License/reuse clearance is still required.'],
      },
      {
        component: '目',
        componentPath: '1',
        relationship: 'visual',
        claim: 'The source explicitly pairs the hand form with 目 in the look/see formation.',
        sourceRefs: ['moe-kan'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: true,
        usableForOrigin: true,
        reviewReasons: ['Use the target-specific hand-over-eye relation rather than treating a generic 目 gloss as sufficient by itself.'],
      },
    ],
    unsupportedRelationshipNotes: ['No external source was needed to invent a scene; the hand-over-eye relation is already a concise source-backed visual formation.', 'The source does not authorize relabeling 龵 globally.'],
    formationCandidate: 'review-required',
    originCandidate: 'review-required',
    recommendedRoute: 'Formation',
    routeReason: 'A deterministic target-specific visual Formation is supported by the source and fits the existing direct frame, subject to scoped label review and licensing.',
    missingBeforeApproval: ['Target-specific visual label for 龵 as a hand variant, not a global dictionary meaning.', 'Human approval of concise hand-over-eye wording.', 'License/reuse clearance for the Ministry of Education source.'],
  },
  學: {
    historicalFrame: {
      status: 'partial',
      description: 'Sources provide multiple historical views rather than one settled learner frame: Shuowen describes a 教/冖 construction with an image-rendered phonetic element; a scholarly review discusses 爻, 臼, 宀, and the later appearance of 子.',
      components: ['爻', '臼', '宀', '子', '𦥑'],
      sourceRefs: ['moe-xue', 'sage-xue'],
      confidence: 'medium',
      differsMateriallyFromPhase4: true,
      caveats: ['The repository’s grouped token 𦥯 is not proven equivalent to one specific historical unit by these sources.', 'The scholarly article preserves disagreement and explicitly warns that one attractive association needs more evidence.', 'Do not recursively flatten 𦥯 merely to expose familiar labels.'],
    },
    supportedRelationships: [
      {
        component: '𦥑',
        componentPath: 'historical-shuowen-phonetic',
        relationship: 'phonetic',
        claim: 'The official entry explicitly records an image-rendered 𦥑 phonetic element in its Shuowen analysis of 學.',
        sourceRefs: ['moe-xue'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The source glyph is image-rendered and must not be silently normalized to 𦥯.', 'The current learner frame lacks a reviewed label for 𦥯.', 'Modern sound usefulness is not established.'],
      },
      {
        component: '爻 + 臼 + 宀 + 子',
        componentPath: 'historical-grouped-analysis',
        relationship: 'historical-group',
        claim: 'The scholarly review describes a historical analysis involving 爻 as educational content, 臼 as hands/process, 宀 as a building or roof under one interpretation, and 子 appearing later; it also records disagreement.',
        sourceRefs: ['sage-xue'],
        evidenceStrength: 'supporting',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['This is a grouped scholarly interpretation, not a one-to-one mapping to the Phase 4 𦥯 token.', 'Some subclaims are explicitly presented as debated or needing more evidence.', 'A learner-safe Origin frame would need manual selection of one bounded claim.'],
      },
    ],
    unsupportedRelationshipNotes: ['The repository note “component cluster used in 學...” is metadata about reuse, not evidence that 𦥯 means learning.', '子(child) alone does not establish the target meaning learn.', 'Do not turn the deeper tree into an invented classroom scene.'],
    formationCandidate: 'no',
    originCandidate: 'review-required',
    recommendedRoute: 'Origin',
    routeReason: 'Historical/origin evidence exists, but the sources disagree and do not map cleanly onto the current grouped component. Keep it in Origin review rather than flattening or forcing Formation.',
    missingBeforeApproval: ['Human selection of a single bounded historical claim.', 'A provenance-preserving mapping between the chosen historical group and the current 𦥯 token, or an explicit decision not to map them.', 'License/reuse clearance for MOE and SAGE sources.'],
  },
  愛: {
    historicalFrame: {
      status: 'supported',
      description: 'The source preserves two competing/related Shuowen analyses: an older 㤅 form associated with kindness/benefit and 心, and a 𢜤 form associated with walking and 夊; the modern 愛 form reflects later reassignment.',
      components: ['心', '夊', '㤅'],
      sourceRefs: ['moe-ai'],
      confidence: 'medium',
      differsMateriallyFromPhase4: true,
      caveats: ['The current Phase 4 tree 爫+冖+𢖻 is not the same as either historical analysis.', 'The old phonetic glyph is rendered as a source image and should not be normalized without a separate glyph-identification decision.', 'Do not turn the generic heart=love association into a global semantic rule.'],
    },
    supportedRelationships: [
      {
        component: '心',
        componentPath: 'historical-㤅',
        relationship: 'semantic',
        claim: 'The source explicitly associates the older 㤅 form’s kindness/benefit gloss with 心; this is a target-specific historical relationship, not a global heart=love definition.',
        sourceRefs: ['moe-ai'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The source presents more than one historical analysis.', 'The historical 㤅 path must be explicitly distinguished from the modern direct Phase 4 tree.', 'A controlled historical wording still needs human approval.'],
      },
      {
        component: '夊 + 㤅',
        componentPath: 'historical-𢜤',
        relationship: 'origin',
        claim: 'The source explicitly records a separate 𢜤 analysis involving 夊 and 㤅, with the modern 愛 form borrowing/reassigning the graph; this is origin evidence, not a direct semantic bridge for modern love.',
        sourceRefs: ['moe-ai'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The two historical analyses must remain separate.', 'No current Phase 4 component label can stand in for the historical 㤅 glyph without review.'],
      },
      {
        component: null,
        componentPath: 'historical-㤅-phonetic-element',
        relationship: 'phonetic',
        claim: 'The source explicitly marks a phonetic element in the older 㤅 analysis, but the source glyph is image-rendered and must not be silently normalized.',
        sourceRefs: ['moe-ai'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The exact historical phonetic glyph is not safely normalized in this artifact.', 'The modern reading cue and the current Phase 4 tree are not established by this fact alone.'],
      },
    ],
    unsupportedRelationshipNotes: ['The current 爫(claw)+冖(cover)+𢖻 frame has no supported semantic bridge to love in the repository or this pilot.', 'Do not present 心 as a current visible component of the direct Phase 4 frame.'],
    formationCandidate: 'no',
    originCandidate: 'review-required',
    recommendedRoute: 'Origin',
    routeReason: 'The historical evidence is useful but cannot be rendered as a direct modern Formation because the current structure and historical analyses diverge.',
    missingBeforeApproval: ['Human choice between the two historical analyses.', 'Explicit scope for the old 心 relationship and image-rendered phonetic element.', 'License/reuse clearance for the Ministry of Education source.'],
  },
  新: {
    historicalFrame: {
      status: 'supported',
      description: 'The source-backed origin is taking/cutting wood with 斤 plus a phonetic element; the “new” meaning is described as an extension from that earlier sense. The source does not support a tree+axe etymology.',
      components: ['斤', 'historical phonetic element (source image)'],
      sourceRefs: ['moe-xin'],
      confidence: 'high',
      differsMateriallyFromPhase4: true,
      caveats: ['The source’s phonetic element is image-rendered/variant-sensitive and must not be flattened to the Phase 4 亲 token.', '斤 is part of the historical cut-wood relation; the source does not identify a tree component.', 'The historical cut-wood→new bridge requires controlled wording.'],
    },
    supportedRelationships: [
      {
        component: '斤',
        componentPath: '1',
        relationship: 'origin',
        claim: 'The source explicitly connects 斤 to the original taking/cutting-wood sense of 新 and describes new as an extended meaning.',
        sourceRefs: ['moe-xin'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'high',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['The learner-facing cut-wood→new bridge needs human approval.', 'Do not introduce 木/tree unless an independent source supports it.', 'The phonetic element is not normalized to 亲 by this evidence.'],
      },
      {
        component: null,
        componentPath: 'historical-phonetic-element',
        relationship: 'phonetic',
        claim: 'The source explicitly marks a historical phonetic element, but its glyph is source-image/variant dependent and no safe modern learner label is available in this pilot.',
        sourceRefs: ['moe-xin'],
        evidenceStrength: 'direct',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'historical-frame-differs',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['Do not normalize the source-image glyph to 亲 without evidence.', 'Historical phonetic truth is not a useful modern pronunciation cue by itself.'],
      },
    ],
    unsupportedRelationshipNotes: ['The popular tree+axe story is not supported by the cited source and must not be stored as an origin fact.', 'The current 亲+斤 structural frame is not proof that 亲 contributes the meaning relatives or that 斤 is simply axe in this target.'],
    formationCandidate: 'no',
    originCandidate: 'review-required',
    recommendedRoute: 'Origin',
    routeReason: 'A source-backed origin candidate exists and directly corrects the common tree+axe oversimplification, but it needs a reviewed historical bridge and license clearance.',
    missingBeforeApproval: ['Human-approved concise cut-wood→new bridge.', 'Decision on whether to mention the historical phonetic element at all.', 'License/reuse clearance for the Ministry of Education source.'],
  },
  買: {
    historicalFrame: {
      status: 'supported',
      description: 'The official entry and CUHK database agree on the historical 网+貝 structure, corresponding to modern 罒+貝. CUHK offers a shell/net interpretation but explicitly hedges it and records that early examples did not yet carry the later buy/sell sense.',
      components: ['网/罒', '貝'],
      sourceRefs: ['moe-mai', 'cuhk-mai'],
      confidence: 'medium',
      differsMateriallyFromPhase4: false,
      caveats: ['貝’s general shell/money metadata is not by itself a target-specific semantic bridge.', 'The net-taking-shell explanation is a cited scholarly interpretation plus a hedged alternative, not a settled one-line fact.', 'The historical meaning develops over time; do not collapse early names into modern buy.'],
    },
    supportedRelationships: [
      {
        component: '网/罒 + 貝',
        componentPath: '0 + 1',
        relationship: 'origin',
        claim: 'The sources directly support the historical 网+貝 structure and a possible shell/net origin explanation, but the semantic path to buy is explicitly hedged and temporally layered.',
        sourceRefs: ['moe-mai', 'cuhk-mai'],
        evidenceStrength: 'supporting',
        directSupport: 'target-specific',
        confidence: 'medium',
        modernStructureCompatibility: 'matches-direct-frame',
        usableForFormation: false,
        usableForOrigin: true,
        reviewReasons: ['Do not promote 貝(money/currency) from raw metadata; the reviewed global label remains shell.', 'Human review must choose whether the net/shell interpretation is pedagogically responsible.', 'The CUHK source’s licensing/reuse status is unknown.'],
      },
    ],
    unsupportedRelationshipNotes: ['The chain shell→money→buy is not licensed by component dictionary metadata alone.', 'A net-and-shell scene without the historical caveat would be an invented mnemonic, not a deterministic Formation/Origin fact.'],
    formationCandidate: 'no',
    originCandidate: 'review-required',
    recommendedRoute: 'Origin',
    routeReason: 'The source-backed historical structure is useful, but the semantic explanation is hedged; keep the candidate in Origin review rather than forcing a shell/money hook.',
    missingBeforeApproval: ['Human decision on whether the hedged net/shell interpretation is suitable for learners.', 'A concise, provenance-preserving explanation of the historical timing of the buy/sell sense.', 'License/reuse review for both MOE and CUHK sources.'],
  },
};

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function runtimeChildren(node: RuntimeTreeNode): RuntimeTreeNode[] {
  return node[0] === 's' && Array.isArray(node[2]) ? node[2] : [];
}

function runtimeGlyph(node: RuntimeTreeNode): string | null {
  return node[0] === 'g' ? node[1] : null;
}

function formatTree(node: RuntimeTreeNode): string {
  if (node[0] === 's') return `${node[1]}(${runtimeChildren(node).map(formatTree).join(', ')})`;
  if (node[0] === 'g') return node[1];
  if (node[0] === 'u') return `u:${node[1]}${typeof node[2] === 'string' ? `:${node[2]}` : ''}`;
  if (node[0] === '?') return node[1] ? `?:${node[1]}` : '?';
  return `e:${node[1]}`;
}

function directGlyphs(node: RuntimeTreeNode): Array<{ glyph: string; path: string }> {
  const result: Array<{ glyph: string; path: string }> = [];
  function visit(current: RuntimeTreeNode, path: string): void {
    const glyph = runtimeGlyph(current);
    if (glyph) {
      result.push({ glyph, path });
      return;
    }
    runtimeChildren(current).forEach((child, index) => visit(child, path ? `${path}.${index}` : `${index}`));
  }
  visit(node, '');
  return result;
}

function buildRuntimeMap(): { records: Map<string, RuntimeRecord>; manifest: RuntimeManifest } {
  const manifest = readJson<RuntimeManifest>(resolve(RUNTIME_ROOT, 'manifest.json'));
  const records = new Map<string, RuntimeRecord>();
  for (let shard = 0; shard < 64; shard += 1) {
    const shardPath = resolve(RUNTIME_ROOT, `records/shard-${String(shard).padStart(2, '0')}.json`);
    const shardData = readJson<RuntimeShard>(shardPath);
    for (const [character, record] of Object.entries(shardData.records)) records.set(character, record);
  }
  return { records, manifest };
}

function buildMetadataMap(profiles: ComponentProfileArtifact, reviewed: ReviewedLabelArtifact): Map<string, ComponentMetadata> {
  const result = new Map<string, ComponentMetadata>();
  for (const profile of profiles.profiles) {
    const labels = profile.approvedDefaultLabels.map((item) => item.label);
    result.set(profile.glyph, {
      glyph: profile.glyph,
      rawDefinitions: profile.rawGlosses,
      readings: profile.readings,
      labels,
      approvedLabel: labels[0] ?? null,
      status: labels.length > 0 ? 'approved' : profile.rawGlosses.length > 0 || profile.readings.length > 0 ? 'unlabeled' : 'missing',
      sourceRefs: profile.sourceRefs,
      warnings: [],
    });
  }
  for (const entry of reviewed.entries) {
    const current = result.get(entry.glyph) ?? {
      glyph: entry.glyph,
      rawDefinitions: [],
      readings: [],
      labels: [],
      approvedLabel: null,
      status: 'missing' as const,
      sourceRefs: [],
      warnings: [],
    };
    result.set(entry.glyph, {
      ...current,
      rawDefinitions: entry.rawDefinitions.length > 0 ? entry.rawDefinitions : current.rawDefinitions,
      readings: entry.readings.length > 0 ? entry.readings : current.readings,
      labels: entry.approvedLabel ? [entry.approvedLabel] : current.labels,
      approvedLabel: entry.approvedLabel ?? current.approvedLabel,
      status: entry.globalApproval === 'approved' && entry.approvedLabel ? 'approved' : 'review-required',
      sourceRefs: [...new Set([...current.sourceRefs, 'book-1-component-label-review-v1'])],
      warnings: entry.source.proposalWarnings,
    });
  }
  for (const [key, entry] of COMPONENT_LEXICON_BY_KEY) {
    const glyph = key.slice(2);
    if (!entry.senses.some((sense) => sense.safeForMemoryAid)) continue;
    const current = result.get(glyph) ?? {
      glyph,
      rawDefinitions: [],
      readings: [],
      labels: [],
      approvedLabel: null,
      status: 'missing' as const,
      sourceRefs: [],
      warnings: [],
    };
    const lexiconLabels = entry.senses.filter((sense) => sense.safeForMemoryAid).map((sense) => sense.label);
    result.set(glyph, {
      ...current,
      labels: [...new Set([...current.labels, ...lexiconLabels])],
      status: current.approvedLabel ? current.status : current.status === 'missing' ? 'lexicon-only' : current.status,
      sourceRefs: [...new Set([...current.sourceRefs, 'src/data/memoryHooks/componentLexicon.ts'])],
    });
  }
  return result;
}

function metadataFor(glyph: string, metadata: Map<string, ComponentMetadata>): ComponentMetadata {
  return metadata.get(glyph) ?? {
    glyph,
    rawDefinitions: [],
    readings: [],
    labels: [],
    approvedLabel: null,
    status: 'missing',
    sourceRefs: [],
    warnings: ['no-profile-or-review-record'],
  };
}

function sourceQualityFor(sourceRefs: string[]): SourceQuality[] {
  return [...new Set(sourceRefs.map((id) => SOURCE_BY_ID.get(id)?.sourceType).filter((value): value is SourceQuality => Boolean(value)))];
}

function licenseFor(sourceRefs: string[]): LicenseStatus {
  const statuses = sourceRefs.map((id) => SOURCE_BY_ID.get(id)?.licenseStatus ?? 'unknown');
  if (statuses.includes('restricted')) return 'restricted';
  if (statuses.includes('review-required')) return 'review-required';
  if (statuses.includes('unknown')) return 'unknown';
  return 'cleared';
}

function candidateFromSpec(
  target: string,
  meaning: ReviewedMeaningRecord,
  spec: EvidenceSpec,
): RelationshipEvidenceCandidate {
  const exactSourceEvidence = spec.sourceRefs
    .map((id) => `${id}: ${SOURCE_BY_ID.get(id)?.exactClaim ?? 'source record missing'}`)
    .join(' ');
  return {
    target,
    constructionMeaning: meaning.constructionMeaning ?? '',
    constructionReading: meaning.constructionReading ?? '',
    component: spec.component,
    componentPath: spec.componentPath ?? null,
    relationship: spec.relationship,
    decision: 'candidate',
    claim: spec.claim,
    exactSourceEvidence,
    evidenceStrength: spec.evidenceStrength,
    directSupport: spec.directSupport,
    confidence: spec.confidence,
    sourceRefs: spec.sourceRefs,
    sourceQuality: sourceQualityFor(spec.sourceRefs),
    licenseStatus: licenseFor(spec.sourceRefs),
    modernStructureCompatibility: spec.modernStructureCompatibility,
    usableForFormation: spec.usableForFormation,
    usableForOrigin: spec.usableForOrigin,
    reviewReasons: spec.reviewReasons,
  };
}

function labelToken(glyph: string, metadata: Map<string, ComponentMetadata>): string {
  const item = metadataFor(glyph, metadata);
  return item.approvedLabel ? `${glyph}(${item.approvedLabel})` : `${glyph}[${item.status}]`;
}

function buildRecord(
  target: string,
  meanings: ReviewedMeaningArtifact,
  runtimeRecords: Map<string, RuntimeRecord>,
  runtimeManifest: RuntimeManifest,
  metadata: Map<string, ComponentMetadata>,
): TargetEvidenceRecord {
  const meaning = meanings.records.find((record) => record.character === target);
  if (!meaning) throw new Error(`Missing reviewed meaning record for ${target}`);
  const runtime = runtimeRecords.get(target);
  const runtimeSource = runtime ? runtimeManifest.sources[runtime.s] : null;
  const spec = TARGET_SPECS[target];
  if (!spec) throw new Error(`Missing evidence spec for ${target}`);
  const direct = runtime ? directGlyphs(runtime.t) : [];
  const directVisibleComponents = direct.map(({ glyph }) => labelToken(glyph, metadata));
  return {
    target,
    constructionMeaning: meaning.constructionMeaning,
    constructionReading: meaning.constructionReading,
    meaningStatus: meaning.status,
    meaningConfidence: meaning.confidence,
    meaningBasis: meaning.basis,
    lessonSpecificMeanings: meaning.lessonSenses,
    meaningReviewReasons: meaning.reviewReasons,
    phase4: {
      recordId: runtime?.r ?? null,
      sourceId: runtimeSource?.id ?? null,
      sourceVersion: runtimeSource?.version ?? null,
      rawTree: runtime ? formatTree(runtime.t) : null,
      directVisibleComponents,
      structuralOnly: true,
    },
    componentMetadata: direct.map(({ glyph }) => metadataFor(glyph, metadata)),
    supportedRelationships: spec.supportedRelationships.map((item) => candidateFromSpec(target, meaning, item)),
    unsupportedRelationshipNotes: spec.unsupportedRelationshipNotes,
    historicalFrame: spec.historicalFrame,
    formationCandidate: spec.formationCandidate,
    originCandidate: spec.originCandidate,
    recommendedRoute: spec.recommendedRoute,
    routeReason: spec.routeReason,
    missingBeforeApproval: spec.missingBeforeApproval,
    deterministicFormationSafeNow: false,
    deterministicOriginSafeNow: false,
    remainWithheldUnlessApproved: true,
  };
}

function mdCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function formatMeanings(record: TargetEvidenceRecord): string {
  return record.lessonSpecificMeanings.length === 0
    ? 'none'
    : record.lessonSpecificMeanings.map((item) => `${item.meaning} [${item.reading}] (${item.lessonRefs.join(', ')})`).join('; ');
}

function renderMarkdown(artifact: EvidencePilotArtifact): string {
  const lines: string[] = [];
  lines.push('# Book 1 eight-character target-specific relationship-evidence pilot', '');
  lines.push('> Development-only candidate evidence. The reviewed construction-meaning layer is read-only. No hooks were generated, no DeepSeek calls were made, no planner/metadata/Phase 4 records were changed, no records were written to `pilotFrameReviews.ts`, and `publishable` remains `false`.', '');
  lines.push('## Scope and non-negotiable boundaries', '');
  lines.push(`- Targets: ${artifact.scope.targets.join('、')}.`);
  lines.push('- Phase 4 structure is reported as structure only; it is not treated as proof of semantic, phonetic, visual, or historical contribution.');
  lines.push('- External evidence is stored as candidate facts. No semantic bridge, target-specific label, FormationFrame, OriginFrame, learner hook, or approved relationship was created.');
  lines.push('- Reading similarity, dictionary-gloss overlap, and IDS layout alone were not promoted to relationships.');
  lines.push('- All evidence candidates remain review-gated because source reliability and redistribution/licensing are separate decisions.');
  lines.push(`- Runtime structural license gate: **${artifact.runtimeLicenseGate.status}** — ${artifact.runtimeLicenseGate.openBlockers.join('; ')}.`, '');

  lines.push('## Summary', '');
  lines.push('| Target | Construction meaning | Phase 4 frame | Direct semantic evidence | Direct phonetic evidence | Historical/origin evidence | Recommended route |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const record of artifact.records) {
    const semantic = record.supportedRelationships.some((item) => item.relationship === 'semantic' && item.evidenceStrength === 'direct') ? 'yes' : 'no';
    const phonetic = record.supportedRelationships.some((item) => item.relationship === 'phonetic' && item.evidenceStrength === 'direct') ? 'yes' : 'no';
    const origin = record.historicalFrame.status !== 'none' ? `${record.originCandidate}` : 'no';
    lines.push(`| ${record.target} | ${mdCell(`${record.constructionMeaning ?? 'none'} (${record.constructionReading ?? 'no reading'})`)} | ${mdCell(record.phase4.rawTree ?? 'missing')} | ${semantic} | ${phonetic} | ${origin} | ${record.recommendedRoute} (review) |`);
  }
  lines.push('');
  lines.push('### Pilot counts', '');
  lines.push(`- Direct source-backed semantic evidence: **${artifact.summary.directSourceBackedSemanticEvidenceCount}/8**.`);
  lines.push(`- Direct source-backed phonetic evidence: **${artifact.summary.directSourceBackedPhoneticEvidenceCount}/8**.`);
  lines.push(`- Useful source-backed historical/origin evidence: **${artifact.summary.usefulSourceBackedHistoricalOriginEvidenceCount}/8**.`);
  lines.push(`- Material Phase 4 vs historical differences: **${artifact.summary.materialPhase4HistoricalDifferenceCount}/8**.`);
  lines.push(`- Formation route candidates: **${artifact.summary.formationRouteCandidateCount}/8** (語, 看; both still review-gated).`);
  lines.push(`- Origin route candidates: **${artifact.summary.originRouteCandidateCount}/8** (課, 開, 學, 愛, 新, 買; all still review-gated).`);
  lines.push('- Deterministic Formation safe now: **0/8**; deterministic Origin safe now: **0/8**. Every route remains gated by evidence review and licensing.');
  lines.push(`- Scene-only or forced NoHook dispositions from this evidence pass: **${artifact.summary.sceneOnlyOrNoHookCount}/8**. This does not mean every target is safe to publish; it means each has a candidate route that still requires review.`);
  lines.push(`- Sources with unresolved licensing/reuse status: **${artifact.summary.unresolvedLicenseSourceCount}/${artifact.sourceRecords.length}**.`, '');

  lines.push('## Source and provenance catalog', '');
  lines.push('| ID | Source / publisher | Type | Exact supported claim (paraphrased) | Accessed | License/reuse |');
  lines.push('|---|---|---|---|---|---|');
  for (const source of artifact.sourceRecords) {
    lines.push(`| ${source.id} | [${mdCell(source.title)}](${source.url}) — ${mdCell(source.publisherOrAuthor)} | ${source.sourceType} | ${mdCell(source.exactClaim)} | ${source.accessDate} | ${source.licenseStatus}: ${mdCell(source.licenseOrReuse)} |`);
  }
  lines.push('', '## Detailed target records', '');
  for (const record of artifact.records) {
    lines.push(`### ${record.target} — ${record.constructionMeaning ?? 'unresolved'} (${record.constructionReading ?? 'no reading'})`, '');
    lines.push(`**Meaning layer (read-only):** status=${record.meaningStatus}; confidence=${record.meaningConfidence}; basis=${record.meaningBasis}; review reasons=${record.meaningReviewReasons.length > 0 ? record.meaningReviewReasons.join('; ') : 'none'}.`);
    lines.push(`**Book 1 lesson meanings/readings:** ${mdCell(formatMeanings(record))}.`);
    lines.push(`**Phase 4 structural frame:** ${mdCell(record.phase4.rawTree ?? 'missing')} from ${record.phase4.sourceId ?? 'no runtime source'} (${record.phase4.sourceVersion ?? 'no version'}). Structural only; no historical claim.`);
    lines.push(`**Direct visible learner tokens:** ${record.phase4.directVisibleComponents.join(' + ') || 'none'}.`);
    lines.push('', '**Component metadata supplied to the evidence planner:**', '');
    lines.push('| Glyph | Raw definitions | Readings | Existing labels | Status | Provenance/warnings |');
    lines.push('|---|---|---|---|---|---|');
    for (const component of record.componentMetadata) {
      lines.push(`| ${component.glyph} | ${mdCell(component.rawDefinitions.join('; ') || 'none')} | ${mdCell(component.readings.join('; ') || 'none')} | ${mdCell(component.labels.join(', ') || 'none')} | ${component.status} | ${mdCell([...component.sourceRefs, ...component.warnings].join('; ') || 'none')} |`);
    }
    lines.push('', '**Source-backed relationship candidates (facts only; not approved roles):**', '');
    lines.push('| Component/group | Relationship | Claim | Evidence | Direct support | Formation usable? | Origin usable? | Compatibility | License |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const candidate of record.supportedRelationships) {
      lines.push(`| ${mdCell(candidate.component ?? candidate.componentPath ?? '(historical element not normalized)')} | ${candidate.relationship} | ${mdCell(candidate.claim)} | ${candidate.evidenceStrength} (${candidate.confidence}) | ${candidate.directSupport} | ${candidate.usableForFormation ? 'yes' : 'no'} | ${candidate.usableForOrigin ? 'yes' : 'no'} | ${candidate.modernStructureCompatibility} | ${candidate.licenseStatus} |`);
    }
    lines.push('');
    for (const candidate of record.supportedRelationships) {
      lines.push(`#### ${candidate.relationship}: ${candidate.component ?? candidate.componentPath ?? 'historical element'}`, '');
      lines.push(`- Candidate claim: ${candidate.claim}`);
      lines.push(`- Exact source evidence (paraphrased): ${candidate.exactSourceEvidence}`);
      lines.push(`- Source refs: ${candidate.sourceRefs.join(', ')}; source quality: ${candidate.sourceQuality.join(', ') || 'none'}; license: ${candidate.licenseStatus}.`);
      lines.push(`- Review reasons: ${candidate.reviewReasons.join('; ') || 'none'}.`);
    }
    lines.push('', '**Unsupported or unsafe interpretations:**', '', ...record.unsupportedRelationshipNotes.map((note) => `- ${note}`));
    lines.push('', '**Historical frame assessment:**', '');
    lines.push(`- ${record.historicalFrame.description}`);
    lines.push(`- Components/groups considered: ${record.historicalFrame.components.join(' + ')}.`);
    lines.push(`- Source refs: ${record.historicalFrame.sourceRefs.join(', ')}; confidence=${record.historicalFrame.confidence}; material Phase 4 difference=${record.historicalFrame.differsMateriallyFromPhase4 ? 'yes' : 'no'}.`);
    lines.push(`- Caveats: ${record.historicalFrame.caveats.join(' ')}`);
    lines.push('', '**Route decision (still candidate-only):**', '');
    lines.push(`- Formation candidate: **${record.formationCandidate}**.`);
    lines.push(`- Origin candidate: **${record.originCandidate}**.`);
    lines.push(`- Best pedagogical route to review: **${record.recommendedRoute}** — ${record.routeReason}`);
    lines.push(`- Missing before approval: ${record.missingBeforeApproval.join('; ')}`);
    lines.push('- Deterministic Formation safe now: no.');
    lines.push('- Deterministic Origin safe now: no.');
    lines.push('- Learner hook generated: no.', '');
  }

  lines.push('## Fact → interpretation → hook boundary', '');
  lines.push('- **Fact layer (this artifact):** source-backed claims, source quality, citations, historical/modern structure differences, and unresolved licensing.');
  lines.push('- **Possible learner interpretation (not stored as an approved bridge):** a short explanation may be designed only after a human selects the bounded fact and target-specific scope.');
  lines.push('- **Hook layer (not performed):** no deterministic FormationFrame, OriginFrame, SceneFrame, DeepSeek prompt, or learner-facing prose was created.');
  lines.push('', '## Exact repository inputs', '');
  for (const input of artifact.sourceInputs) lines.push(`- \`${input}\``);
  lines.push('', '## Final boundary', '', '- This pilot covers exactly eight meaning-cleared Traditional characters. It does not expand to the other 34 eligible characters, modify the reviewed construction-meaning layer, alter global labels, change Phase 4, call DeepSeek, generate hooks, or publish data.', '');
  return `${lines.join('\n')}\n`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const meanings = readJson<ReviewedMeaningArtifact>(MEANING_PATH);
  const profiles = readJson<ComponentProfileArtifact>(PROFILE_PATH);
  const reviewedLabels = readJson<ReviewedLabelArtifact>(REVIEW_LABEL_PATH);
  const { records: runtimeRecords, manifest: runtimeManifest } = buildRuntimeMap();
  const metadata = buildMetadataMap(profiles, reviewedLabels);
  const records = TARGETS.map((target) => buildRecord(target, meanings, runtimeRecords, runtimeManifest, metadata));
  const directSemanticSourceCount = records.filter((record) => record.supportedRelationships.some((item) => item.relationship === 'semantic' && item.evidenceStrength === 'direct')).length;
  const directPhoneticSourceCount = records.filter((record) => record.supportedRelationships.some((item) => item.relationship === 'phonetic' && item.evidenceStrength === 'direct')).length;
  const artifact: EvidencePilotArtifact = {
    schemaVersion: 1,
    artifact: 'book-1-eight-character-relationship-evidence-pilot-v1',
    distribution: 'development-only-analysis',
    publishable: false,
    developmentOnly: true,
    hooksGenerated: false,
    apiCalls: 0,
    plannerChanged: false,
    metadataChanged: false,
    constructionMeaningChanged: false,
    phase4Changed: false,
    pilotFrameReviewsChanged: false,
    externalResearch: true,
    scope: {
      targetCount: TARGETS.length,
      targets: TARGETS,
      note: 'Exactly the eight reviewed meaning-cleared Traditional targets requested for the external relationship-evidence calibration pilot.',
    },
    sourceInputs: [
      'output/memory-hooks/book-1-frozen-47-reviewed-construction-meanings-v1.json',
      'output/memory-hooks/book-1-component-profiles-v2.json',
      'output/memory-hooks/book-1-component-label-review-v1.json',
      'output/decomposition-runtime/phase4-candidate/manifest.json',
      'output/decomposition-runtime/phase4-candidate/records/shard-00.json … shard-63.json',
      'src/data/memoryHooks/componentLexicon.ts',
    ],
    sourceRecords: SOURCE_RECORDS,
    runtimeLicenseGate: runtimeManifest.licenseGate,
    summary: {
      directSourceBackedSemanticEvidenceCount: directSemanticSourceCount,
      directSourceBackedPhoneticEvidenceCount: directPhoneticSourceCount,
      usefulSourceBackedHistoricalOriginEvidenceCount: records.filter((record) => record.historicalFrame.status !== 'none').length,
      materialPhase4HistoricalDifferenceCount: records.filter((record) => record.historicalFrame.differsMateriallyFromPhase4).length,
      formationRouteCandidateCount: records.filter((record) => record.recommendedRoute === 'Formation').length,
      originRouteCandidateCount: records.filter((record) => record.recommendedRoute === 'Origin').length,
      deterministicFormationSafeNowCount: 0,
      deterministicOriginSafeNowCount: 0,
      sceneOnlyOrNoHookCount: records.filter((record) => record.recommendedRoute === 'Scene' || record.recommendedRoute === 'NoHook').length,
      allCandidatesRequireReview: true,
      unresolvedLicenseSourceCount: SOURCE_RECORDS.filter((source) => source.licenseStatus !== 'cleared').length,
    },
    records,
  };
  writeFileSync(OUTPUT_JSON_PATH, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(OUTPUT_MD_PATH, renderMarkdown(artifact));
  console.log(`Wrote ${OUTPUT_JSON_PATH}`);
  console.log(`Wrote ${OUTPUT_MD_PATH}`);
  console.log(`Targets=${artifact.scope.targetCount}; API calls=${artifact.apiCalls}; hooksGenerated=${artifact.hooksGenerated}; publishable=${artifact.publishable}`);
  console.log(`Semantic=${artifact.summary.directSourceBackedSemanticEvidenceCount}; phonetic=${artifact.summary.directSourceBackedPhoneticEvidenceCount}; origin=${artifact.summary.usefulSourceBackedHistoricalOriginEvidenceCount}`);
}

main();
