const OPTIONAL_GROUP_PATTERN = /[（(]([^()（）]*)[）)]/;

function expandOptionalGroups(value: string): string[] {
  const match = value.match(OPTIONAL_GROUP_PATTERN);
  if (!match || match.index === undefined) return [value];

  const before = value.slice(0, match.index);
  const after = value.slice(match.index + match[0].length);
  const withoutOptional = `${before}${after}`;
  const withOptional = `${before}${match[1]}${after}`;

  return [
    ...expandOptionalGroups(withoutOptional),
    ...expandOptionalGroups(withOptional),
  ];
}

export function normalizePinyinAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/u:/g, 'v')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[1-5]/g, '')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '');
}

export function getPinyinAnswerVariants(pinyin: string): string[] {
  const variants = pinyin
    .split(/[/／]/)
    .flatMap(expandOptionalGroups)
    .map(normalizePinyinAnswer)
    .filter(Boolean);

  return [...new Set(variants)];
}

export function isPinyinAnswerAccepted(input: string, pinyin?: string): boolean {
  const normalizedInput = normalizePinyinAnswer(input);
  if (!normalizedInput || !pinyin) return false;

  return getPinyinAnswerVariants(pinyin).includes(normalizedInput);
}
