import type { GrammarWordToken } from './grammar';

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
