/** The 29 articulations supported by the Start Here interactive mouth diagram. */
export type MouthSoundId =
  | 'b' | 'p' | 'm' | 'f'
  | 'd' | 't' | 'n' | 'l'
  | 'g' | 'k' | 'h'
  | 'z' | 'c' | 's'
  | 'zh' | 'ch' | 'sh' | 'r'
  | 'j' | 'q' | 'x'
  | 'a' | 'o' | 'e' | 'i' | 'u' | 'ü'
  | '-n' | '-ng';

export type PartId = 1 | 2 | 3 | 4 | 5 | 6;
export type ToneMark = 1 | 2 | 3 | 4;

export interface StartHerePartMeta {
  id: PartId;
  title: string;
  subtitle: string;
  lessonIds: number[];
}

export interface WordTileItem {
  pinyin: string;
  hanzi?: string;
  meaning: string;
  audio: string;
  tone?: ToneMark | 5;
}

export interface PairRow {
  label: string;
  cells: Array<{ text: string; audio: string; sub?: string }>;
}

export interface SpellingRow {
  from: string;
  addedPrefix?: string;
  to: string;
  droppedDots?: boolean;
  example: string;
  audio: string;
}

export interface SortBin {
  label: string;
  icon?: 'air' | 'noair' | 'none';
}

export interface SortItem {
  audio?: string;
  label: string;
  reveal?: string;
  bin: number;
}

export interface ChartHuntTarget {
  syllable: string;
  tone: ToneMark;
  audio: string;
  label: string;
}

export interface CharPartEntry {
  hanzi: string;
  pinyin: string;
  meaning: string;
  audio: string;
  highlightPart?: string;
  breakdown?: Array<{
    glyph: string;
    role: 'meaning' | 'sound' | 'part';
    hint: string;
  }>;
}

export interface QuestionChoice {
  label: string;
  tone?: ToneMark;
  correct: boolean;
}

export interface QuestionScreen {
  k: 'question';
  title: string;
  audio: string[];
  prompt?: { hanzi?: string; pinyin?: string; text?: string };
  noAuto?: boolean;
  contrast?: [string, string];
  layout?: 'list' | 'two' | 'three';
  isPinyinChoices?: boolean;
  choices: QuestionChoice[];
  feedback: { hanzi?: string; pinyin: string; meaning: string };
}

export type StartHereScreen =
  | {
      k: 'word';
      title: string;
      talk: string[];
      audio: string;
      pinyin: string;
      hanzi?: string;
      meaning: string;
      spotlight?: 'zh' | 'py';
    }
  | {
      k: 'tiles';
      title: string;
      talk: string[];
      autoPlayAll?: boolean;
      items: WordTileItem[];
    }
  | {
      k: 'toneIntro';
      title: string;
      talk: string[];
      tone: ToneMark;
      audio: string;
      pinyin: string;
      hanzi?: string;
      meaning: string;
    }
  | {
      k: 'trace';
      title: string;
      tone: ToneMark;
      audio: string;
      doneText: string;
    }
  | {
      k: 'markCompare';
      title: string;
      talk: string[];
      tones: ToneMark[];
    }
  | {
      k: 'pieces';
      title: string;
      initial: string;
      final: string;
      tone: ToneMark;
      audio: string;
      noAuto?: boolean;
      lines: [string, string, string, string];
    }
  | {
      k: 'split';
      title: string;
      initial: string;
      final: string;
      tone: ToneMark;
      audio: string;
    }
  | {
      k: 'build';
      title: string;
      audio: string;
      /** [initial ("" when none), final, tone] */
      target: [string, string, ToneMark];
      inis: string[];
      fins: string[];
      tones: ToneMark[];
      doneText: string;
      displayPinyin?: string;
      dropDots?: boolean;
    }
  | {
      k: 'mouth';
      title: string;
      talk: string[];
      sounds: MouthSoundId[];
      first: MouthSoundId;
    }
  | {
      k: 'mouthQuiz';
      title?: string;
      ask: string;
      options: Array<{
        label: string;
        sound: MouthSoundId;
        right?: boolean;
        say: string;
      }>;
    }
  | {
      k: 'pairs';
      title: string;
      talk: string[];
      headers: string[];
      rows: PairRow[];
    }
  | {
      k: 'spelling';
      title: string;
      talk: string[];
      rows: SpellingRow[];
    }
  | {
      k: 'join';
      title: string;
      talk: string[];
      audio: string;
      left: string;
      right: string;
      result: string;
      droppedDots?: boolean;
      caption: string;
    }
  | {
      k: 'sort';
      title: string;
      mode?: 'audio' | 'text';
      bins: SortBin[];
      items: SortItem[];
      doneText: string;
    }
  | {
      k: 'chart';
      title: string;
      talk: string[];
      rows: string[];
      cols: string[];
      fresh: string[];
      spellOverrides?: Record<string, string>;
      fullChart?: boolean;
      huntTargets?: ChartHuntTarget[];
    }
  | {
      k: 'flip';
      title: string;
      talk: string[];
      kind: 'bu' | 'yi' | 't3t3';
      need: number;
    }
  | {
      k: 'charParts';
      title: string;
      talk: string[];
      items: CharPartEntry[];
    }
  | {
      k: 'sentenceBuild';
      title: string;
      english: string;
      audio: string;
      target: Array<{ hanzi: string; pinyin: string }>;
      distractors: Array<{ hanzi: string; pinyin: string }>;
    }
  | {
      k: 'vocabCards';
      title: string;
      talk?: string[];
      cardIds: string[];
      caption?: string;
    }
  | QuestionScreen;

export interface StartHereLesson {
  id: number;
  partId: PartId;
  title: string;
  goal: string;
  minutes: number;
  screens: StartHereScreen[];
}

export interface ReadyCheckQuestion extends QuestionScreen {
  id: string;
  partId: PartId;
}
