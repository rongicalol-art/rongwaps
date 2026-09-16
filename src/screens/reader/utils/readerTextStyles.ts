import type { ReaderTextSize } from '../../../types/models';

/**
 * Chinese text ramps for the dialogue canvas. Sizes come from the reader's
 * text-size preference; leading differs between pinyin (ruby needs vertical
 * room) and plain text, and the ruby annotation shrinks with the glyph size.
 */

const GLYPH_SIZE: Record<ReaderTextSize, string> = {
  'normal': 'text-[21px] sm:text-[24px]',
  'large': 'text-[24px] sm:text-[27px]',
  'extra-large': 'text-[28px] sm:text-[32px]',
};

const RUBY_LEADING: Record<ReaderTextSize, string> = {
  'normal': 'leading-[2.3] sm:leading-[2.5]',
  'large': 'leading-[2.4] sm:leading-[2.6]',
  'extra-large': 'leading-[2.6] sm:leading-[2.8]',
};

const PLAIN_LEADING: Record<ReaderTextSize, string> = {
  'normal': 'leading-[1.7] sm:leading-[1.8] tracking-normal',
  'large': 'leading-[1.8] sm:leading-[1.9] tracking-normal',
  'extra-large': 'leading-[1.9] sm:leading-[2.0] tracking-normal',
};

const SHORT_PINYIN_SIZE: Record<ReaderTextSize, string> = {
  'normal': 'text-[10px] sm:text-[11px]',
  'large': 'text-[10.5px] sm:text-[11.5px]',
  'extra-large': 'text-[12px] sm:text-[13px]',
};

const LONG_PINYIN_SIZE: Record<ReaderTextSize, string> = {
  'normal': 'text-[9.5px] sm:text-[10.5px] tracking-tight',
  'large': 'text-[10px] sm:text-[11px] tracking-tight',
  'extra-large': 'text-[11.5px] sm:text-[12.5px] tracking-tight',
};

/** Glyph size + leading for a dialogue bubble's Chinese text. */
export function getDialogueTextClasses(textSize: ReaderTextSize, showPinyin: boolean): string {
  return `${GLYPH_SIZE[textSize]} ${showPinyin ? RUBY_LEADING[textSize] : PLAIN_LEADING[textSize]}`;
}

/** Ruby annotation size; long syllables (5+ letters) step down to stay inline. */
export function getRubyPinyinClasses(textSize: ReaderTextSize, isLongSyllable: boolean): string {
  return isLongSyllable ? LONG_PINYIN_SIZE[textSize] : SHORT_PINYIN_SIZE[textSize];
}
