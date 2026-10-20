import type { HTMLAttributes } from 'react';
import type { GrammarWordToken } from '../../types/models';
import { cn } from '../../utils/cn';
import {
  getGrammarSemanticRole,
  getSemanticRoleClasses,
  getSemanticRoleSoftBgClasses,
  type GrammarSemanticRole,
} from '../../utils/grammar/grammarSemanticRoles';

interface DisplayToken {
  key: string;
  text: string;
  pinyin?: string;
  meaning?: string;
  interactive: boolean;
  focused: boolean;
  role?: GrammarSemanticRole;
  /** Closing punctuation glued to this word so it never wraps alone. */
  suffix?: string;
}

export interface ContextualChineseTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  text: string;
  tokens?: GrammarWordToken[];
  focusTerms?: string[];
  characterPreference?: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
}

const CHINESE_CHARACTER = /[\u3400-\u9FFF]/;
const LEADING_CLOSING = /^[。？！，」]+/;

function displayedWord(
  token: GrammarWordToken,
  characterPreference: 'traditional' | 'simplified',
) {
  return characterPreference === 'simplified' && token.simplified
    ? token.simplified
    : token.traditional;
}

function tokenizeTeachingText(
  text: string,
  tokens: GrammarWordToken[],
  focusTerms: string[],
  characterPreference: 'traditional' | 'simplified',
): DisplayToken[] {
  const contextualWords = tokens
    .map((token) => ({ ...token, display: displayedWord(token, characterPreference) }))
    .filter((token) => token.display)
    .sort((a, b) => b.display.length - a.display.length);
  const orderedFocusTerms = [...new Set(focusTerms.filter(Boolean))].sort((a, b) => b.length - a.length);
  const displayTokens: DisplayToken[] = [];
  let index = 0;

  while (index < text.length) {
    const contextualMatch = contextualWords.find((token) => text.startsWith(token.display, index));
    const focusMatch = orderedFocusTerms.find((term) => text.startsWith(term, index));
    // A longer focus pattern (忙不忙) outranks a shorter word that merely starts it (忙),
    // so the whole grammar unit highlights instead of its first piece.
    if (contextualMatch && !(focusMatch && focusMatch.length > contextualMatch.display.length)) {
      const isFocused = focusTerms.includes(contextualMatch.display);
      displayTokens.push({
        key: `${index}-${contextualMatch.id}`,
        text: contextualMatch.display,
        pinyin: contextualMatch.pinyin,
        meaning: contextualMatch.meaning,
        interactive: true,
        focused: isFocused,
        role: isFocused ? getGrammarSemanticRole(contextualMatch.display) : undefined,
      });
      index += contextualMatch.display.length;
      continue;
    }

    if (focusMatch) {
      displayTokens.push({
        key: `${index}-focus`,
        text: focusMatch,
        interactive: CHINESE_CHARACTER.test(focusMatch),
        focused: true,
        role: getGrammarSemanticRole(focusMatch),
      });
      index += focusMatch.length;
      continue;
    }

    const character = text[index];
    if (CHINESE_CHARACTER.test(character)) {
      let end = index + 1;
      while (end < text.length && CHINESE_CHARACTER.test(text[end])) end += 1;
      const word = text.slice(index, end);
      const isFocused = focusTerms.includes(word);
      displayTokens.push({
        key: `${index}-${word}`,
        text: word,
        interactive: true,
        focused: isFocused,
        role: isFocused ? getGrammarSemanticRole(word) : undefined,
      });
      index = end;
      continue;
    }

    let end = index + 1;
    while (
      end < text.length
      && !CHINESE_CHARACTER.test(text[end])
      && !contextualWords.some((token) => text.startsWith(token.display, end))
      && !orderedFocusTerms.some((term) => text.startsWith(term, end))
    ) end += 1;
    let copyText = text.slice(index, end);
    const closing = copyText.match(LEADING_CLOSING)?.[0];
    const previous = displayTokens[displayTokens.length - 1];
    if (closing && previous) {
      previous.suffix = closing;
      copyText = copyText.slice(closing.length);
      index += closing.length;
      if (!copyText) continue;
    }
    const isFocused = focusTerms.some((term) => copyText.includes(term));
    displayTokens.push({
      key: `${index}-copy`,
      text: copyText,
      interactive: false,
      focused: isFocused,
      role: isFocused ? getGrammarSemanticRole(copyText) : undefined,
    });
    index = end;
  }

  return displayTokens;
}

export function ContextualChineseText({
  text,
  tokens = [],
  focusTerms = [],
  characterPreference = 'traditional',
  onOpenWord,
  className,
  ...props
}: ContextualChineseTextProps) {
  const displayTokens = tokenizeTeachingText(text, tokens, focusTerms, characterPreference);

  return (
    <span className={className} {...props}>
      {displayTokens.map((token) => {
        const role = token.role ?? 'target';
        const colorClass = token.focused ? getSemanticRoleClasses(role) : undefined;
        const softBgClass = token.focused ? getSemanticRoleSoftBgClasses(role) : 'hover:bg-brand-primary-soft focus-visible:bg-brand-primary-soft active:bg-brand-primary-soft';

        const word = token.interactive ? (
          <span key={token.key} className="group relative inline-block">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenWord(token.text);
              }}
              aria-label={token.meaning
                ? `${token.text}: ${token.pinyin ? `${token.pinyin}, ` : ''}${token.meaning}`
                : `Open ${token.text} in the dictionary`}
              className={cn(
                '-mx-0.5 rounded-xs px-0.5 text-left font-chinese text-inherit transition-colors focus-ring-inline',
                softBgClass,
                token.focused && 'font-chinese font-black',
                colorClass,
              )}
            >
              {token.text}{token.suffix}
            </button>
            {token.meaning && (
              <span
                role="tooltip"
                className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 hidden w-max min-w-[112px] max-w-[190px] -translate-x-1/2 rounded-sm border-b-2 border-ui-border bg-ui-ink-strong px-3 py-2 text-center font-sans group-hover:block group-focus-within:block"
              >
                {token.pinyin && <span className="block text-xs font-black text-brand-primary/70">{token.pinyin}</span>}
                <span className="mt-0.5 block text-xs font-bold leading-snug text-white">{token.meaning}</span>
                <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-ui-ink-strong" />
              </span>
            )}
          </span>
        ) : (
          <span
            key={token.key}
            className={token.focused ? (CHINESE_CHARACTER.test(token.text) ? cn('font-chinese font-black', colorClass) : cn('font-sans font-black', colorClass)) : undefined}
          >
            {token.text}{token.suffix}
          </span>
        );
        return word;
      })}
    </span>
  );
}
