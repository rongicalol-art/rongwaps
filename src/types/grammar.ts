export interface GrammarLessonText {
  traditional: string;
  simplified?: string;
  pinyin?: string;
  english?: string;
  words?: GrammarWordToken[];
  translationSegments?: GrammarTranslationSegment[];
}

export interface GrammarWordToken {
  id: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  meaning: string;
  prefix?: string;
  suffix?: string;
  alignmentId?: string;
}

export interface GrammarTranslationSegment {
  id: string;
  text: string;
  alignmentId?: string;
}

export interface GrammarPatternRow {
  id: string;
  subject: GrammarWordToken[];
  grammar: GrammarWordToken[];
  complement: GrammarWordToken[];
  /** Optional extended slot list for future patterns with more than three columns. */
  columns?: GrammarWordToken[][];
  english: string;
}

export interface GrammarLessonExample {
  id: string;
  number: number;
  text: GrammarLessonText;
  teachingNote?: string;
}

export interface GrammarSentenceSpineSlot {
  role: string;
  label: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
}

export interface GrammarSentenceSpine {
  title: string;
  description: string;
  subject: GrammarSentenceSpineSlot;
  verb: GrammarSentenceSpineSlot;
  object: GrammarSentenceSpineSlot;
  negation?: {
    label: string;
    traditional: string;
    simplified?: string;
    pinyin: string;
  };
  positiveEnglish: string;
  negativeEnglish?: string;
  notes?: string[];
}

export interface GrammarCompletionRecapItem {
  traditional: string;
  simplified?: string;
  explanation: string;
}

export interface GrammarCompletionRecap {
  title: string;
  correct: GrammarCompletionRecapItem;
  avoid: GrammarCompletionRecapItem[];
}

export interface GrammarExerciseProfile {
  id: string;
  avatar: 'youmei' | 'jiale' | 'yiwen' | 'zhongming';
  countryCode: 'GB' | 'ID' | 'JP' | 'US';
  surname: string;
  givenName: string;
  fullNamePinyin: string;
  country: string;
  countryPinyin: string;
}

export type GrammarExerciseSegment =
  | {
      type: 'text';
      traditional: string;
      simplified?: string;
    }
  | {
      type: 'blank';
      id: string;
      answer: string;
      answerSimplified?: string;
      acceptedAnswers?: string[];
      acceptedAnswersSimplified?: string[];
      hint: string;
    };

export interface GrammarExerciseTile {
  id: string;
  traditional: string;
  simplified?: string;
  pinyin?: string;
  meaning?: string;
}

export interface GrammarExerciseQuestion {
  id: string;
  number: number;
  sectionLabel?: string;
  responseMode?: 'tiles' | 'text';
  segments: GrammarExerciseSegment[];
  tiles: GrammarExerciseTile[];
  correctFeedback?: string;
  repairFeedback?: string;
}

export interface GrammarExerciseCue {
  id: string;
  label: string;
  pinyin?: string;
  detail: string;
}

export interface GrammarContrastItem {
  id: string;
  label: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  note: string;
  particle: GrammarMicroCheckOption;
}

export interface GrammarMicroCheckOption {
  id: string;
  traditional: string;
  simplified?: string;
}

export interface GrammarMicroCheck {
  prompt: string;
  traditional: string;
  simplified?: string;
  options: GrammarMicroCheckOption[];
  answerId: string;
  explanation: string;
}

export interface GrammarContrast {
  title: string;
  description: string;
  items: GrammarContrastItem[];
  microChecks?: GrammarMicroCheck[];
}

export interface GrammarRuleContrastExample {
  id: string;
  status: 'correct' | 'incorrect';
  label: string;
  traditional: string;
  simplified?: string;
  explanation: string;
}

export interface GrammarRuleContrast {
  title: string;
  description?: string;
  examples: GrammarRuleContrastExample[];
}

export interface GrammarUnscrambleTile extends GrammarExerciseTile {
  role: string;
}

export interface GrammarUnscrambleExercise {
  id: string;
  prompt: string;
  tiles: GrammarUnscrambleTile[];
  correctOrder: string[];
  correctFeedback: string;
  repairFeedback: string;
}

export interface GrammarDiscoveryChoice {
  id: string;
  label: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  note: string;
  isCorrection?: boolean;
}

export interface GrammarDiscoveryLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarDiscoveryChoice[];
  takeaway: string;
}

export interface GrammarNumberLabGroup {
  label: string;
  digit: string;
  traditional: string;
  simplified?: string;
}

export interface GrammarNumberLabChoice {
  id: string;
  label: string;
  digits: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  groups: GrammarNumberLabGroup[];
  note: string;
}

export interface GrammarNumberLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarNumberLabChoice[];
  takeaway: string;
}

export interface GrammarRouteLabChoice {
  id: string;
  label: string;
  origin?: GrammarWordToken;
  transport?: GrammarWordToken;
  destination: GrammarWordToken;
  purpose?: GrammarWordToken;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  note: string;
}

export interface GrammarRouteLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarRouteLabChoice[];
  takeaway: string;
}

export interface GrammarSceneChoice {
  id: string;
  label: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
  note: string;
}

export interface GrammarLiveSceneChoice extends GrammarSceneChoice {
  subject: string;
  action: string;
  place?: string;
}

export interface GrammarLiveSceneLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarLiveSceneChoice[];
  takeaway: string;
}

export interface GrammarTimeRangeChoice extends GrammarSceneChoice {
  start: string;
  end: string;
  spanLabel: string;
}

export interface GrammarTimeRangeLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarTimeRangeChoice[];
  takeaway: string;
}

export interface GrammarTimelineChoice extends GrammarSceneChoice {
  start: string;
  duration: string;
  reachesNow: boolean;
  endLabel: string;
}

export interface GrammarTimelineLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarTimelineChoice[];
  takeaway: string;
}

export interface GrammarSequenceChoice extends GrammarSceneChoice {
  first: string;
  then: string;
}

export interface GrammarSequenceLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarSequenceChoice[];
  takeaway: string;
}

export interface GrammarAbilityChoice extends GrammarSceneChoice {
  gate: 'open' | 'limited' | 'closed';
  factor: 'body' | 'rules' | 'situation';
  verb: string;
}

export interface GrammarAbilityLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarAbilityChoice[];
  takeaway: string;
}

export interface GrammarCompareChoice extends GrammarSceneChoice {
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
  quality: string;
}

export interface GrammarCompareLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarCompareChoice[];
  takeaway: string;
}

export interface GrammarPairCompareLab {
  title: string;
  description: string;
  prompt: string;
  choices: GrammarCompareChoice[];
  takeaway: string;
}

export interface GrammarDialogueLine {
  id: string;
  speaker: string;
  text: GrammarLessonText;
}

export interface GrammarDialogue {
  id: string;
  title: string;
  setting: string;
  printedPages: number[];
  audioReference: string;
  lines: GrammarDialogueLine[];
  grammarFocus?: string[];
  comprehension?: {
    prompt: string;
    options: string[];
    answer: string;
    hint: string;
  };
}

export type GrammarLessonWorldKind = 'care' | 'chat' | 'career' | 'route' | 'countdown';

export interface GrammarLessonWorld {
  kind: GrammarLessonWorldKind;
  eyebrow: string;
  title: string;
  stepLabel: string;
  prompt: string;
  traditional: string;
  simplified?: string;
  pinyin: string;
  english: string;
}

export interface GrammarConfusionItem {
  id: string;
  /** The mix-up phrased as the question a learner would ask. */
  question: string;
  /** Short concrete answer in plain words. */
  answer: string;
  /** The form learners reach for by mistake; shown struck through. */
  wrongTraditional: string;
  wrongSimplified?: string;
  /** What to say instead, fully tappable like an example. */
  right: GrammarLessonText;
}

export interface GrammarConfusion {
  title: string;
  items: GrammarConfusionItem[];
}

export interface GrammarSubsection {
  id: string;
  sectionNumber?: number;
  title: string;
  titleTraditional?: string;
  explanation: string;
  pattern?: string;
  patternColumns?: string[];
  patternColumnDetails?: string[];
  patternAccentColumn?: number;
  patternRows?: GrammarPatternRow[];
  examples?: GrammarLessonExample[];
  exampleIds?: string[];
}

export interface InteractiveGrammarPage {
  id: string;
  bookId: number;
  lessonId: number;
  partId: number;
  lessonTitle: string;
  lessonTitleEnglish: string;
  grammarNumber: number;
  titleTraditional: string;
  titleEnglish: string;
  learnerPromise: string;
  printedPages: number[];
  /** When false, the grammar is authored but its printed source is not yet digitized, so the View-book-page action is hidden. */
  bookPageAvailable?: boolean;
  audioReference: string;
  explanation: string;
  subsections?: GrammarSubsection[];
  lessonWorld?: GrammarLessonWorld;
  focusTerms?: string[];
  teachingGlossary?: GrammarWordToken[];
  pattern: string;
  patternColumns: string[];
  patternColumnDetails?: string[];
  patternAccentColumn?: number;
  patternRows: GrammarPatternRow[];
  discoveryLab?: GrammarDiscoveryLab;
  numberLab?: GrammarNumberLab;
  routeLab?: GrammarRouteLab;
  sentenceSpine?: GrammarSentenceSpine;
  liveSceneLab?: GrammarLiveSceneLab;
  timeRangeLab?: GrammarTimeRangeLab;
  timelineLab?: GrammarTimelineLab;
  sequenceLab?: GrammarSequenceLab;
  abilityLab?: GrammarAbilityLab;
  compareLab?: GrammarCompareLab;
  pairCompareLab?: GrammarPairCompareLab;
  contrast?: GrammarContrast;
  ruleContrast?: GrammarRuleContrast;
  confusion?: GrammarConfusion;
  examples: GrammarLessonExample[];
  profiles?: GrammarExerciseProfile[];
  exerciseCues?: GrammarExerciseCue[];
  exerciseTitle: string;
  exercisePreview: string;
  exerciseInstruction: string;
  exerciseNote?: string;
  exerciseResponseMode?: 'tiles' | 'text';
  exerciseType?: 'fillBlank' | 'unscramble';
  unscrambleExercise?: GrammarUnscrambleExercise;
  completionRecap?: GrammarCompletionRecap;
  questions: GrammarExerciseQuestion[];
}

export interface InteractiveGrammarPart {
  id: string;
  bookId: number;
  lessonId: number;
  partId: number;
  title: string;
  grammarPages: InteractiveGrammarPage[];
  dialogue: GrammarDialogue;
  completionTitle: string;
  completionDescription: string;
  nextBookLabel: string;
}

