/**
 * Formulaic courtesy phrases learners memorize as fixed chunks (greetings,
 * thanks, apologies). A memory-hook example sentence where the target
 * character only appears inside one of these teaches little about the
 * character's own meaning, so sentence ranking demotes those occurrences.
 *
 * Traditional forms first (the course corpus is traditional); simplified
 * variants are included defensively for dictionary-sourced sentences.
 */
export const FORMULAIC_PHRASES: readonly string[] = [
  '你好',
  '你們好',
  '您好',
  '大家好',
  '老師好',
  '早安',
  '午安',
  '晚安',
  '再見',
  '謝謝',
  '不客氣',
  '對不起',
  '沒關係',
  '請問',
  // Simplified defensive variants
  '你们好',
  '老师好',
  '再见',
  '谢谢',
  '对不起',
  '没关系',
];
