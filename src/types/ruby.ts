export interface RubyItem {
  char: string;
  pinyin?: string;
  isPunctuation: boolean;
}

export interface PhraseChunk {
  text: string;
  start?: number;
  end?: number;
  isPunctuation: boolean;
  rubyItems: RubyItem[];
}
