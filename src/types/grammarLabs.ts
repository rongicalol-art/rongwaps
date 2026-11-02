import type { GrammarWordToken } from './grammar';

/** An authored lab: one prompt, choices to compare, one takeaway. */
export interface GrammarLab<Choice> {
  title: string;
  description: string;
  prompt: string;
  choices: Choice[];
  takeaway: string;
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

export interface GrammarTimelineChoice extends GrammarSceneChoice {
  start: string;
  duration: string;
  reachesNow: boolean;
  endLabel: string;
}

export interface GrammarCompareChoice extends GrammarSceneChoice {
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
  quality: string;
}
