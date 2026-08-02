import type { GrammarWordToken, InteractiveGrammarPage } from '../types/models';

export function getGrammarTeachingTokens(page: InteractiveGrammarPage): GrammarWordToken[] {
  const sentenceSpineTokens: GrammarWordToken[] = page.sentenceSpine
    ? [page.sentenceSpine.subject, page.sentenceSpine.verb, page.sentenceSpine.object].map((slot) => ({
      id: `${page.id}-spine-${slot.role}`,
      traditional: slot.traditional,
      simplified: slot.simplified,
      pinyin: slot.pinyin,
      meaning: slot.english,
    }))
    : [];

  if (page.sentenceSpine?.negation) {
    sentenceSpineTokens.push({
      id: `${page.id}-spine-negation`,
      traditional: page.sentenceSpine.negation.traditional,
      simplified: page.sentenceSpine.negation.simplified,
      pinyin: page.sentenceSpine.negation.pinyin,
      meaning: 'not; placed directly before the verb',
    });
  }

  return [
    ...(page.teachingGlossary ?? []),
    ...(page.routeLab?.choices.flatMap((choice) => [
      choice.origin,
      choice.transport,
      choice.destination,
      choice.purpose,
    ].filter((token): token is GrammarWordToken => Boolean(token))) ?? []),
    ...page.patternRows.flatMap((row) => [...row.subject, ...row.grammar, ...row.complement]),
    ...page.examples.flatMap((example) => example.text.words ?? []),
    ...sentenceSpineTokens,
  ];
}
