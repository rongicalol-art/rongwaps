export interface SentenceWordPart {
  word: string;
  pinyin?: string;
  definition?: string;
}

export interface SentenceWordLookupResult {
  word: string;
  pinyin?: string;
  headword?: string;
  definitions: string[];
  fallbackParts?: SentenceWordPart[];
  hasAudio?: boolean;
}

export interface SentenceWordContext {
  pinyin?: string;
  meaning?: string;
  english?: string;
}

export interface SentenceSegment {
  segment: string;
  index: number;
  input: string;
  isWordLike?: boolean;
}
