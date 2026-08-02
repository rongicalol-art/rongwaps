import type { HTMLAttributes } from 'react';
import type { GrammarWordToken } from '../../types/models';
import { cn } from '../../utils/cn';

interface DisplayToken {
  key: string;
  text: string;
  pinyin?: string;
  meaning?: string;
  interactive: boolean;
  focused: boolean;
}

export interface ContextualChineseTextProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  text: string;
  tokens?: GrammarWordToken[];
  focusTerms?: string[];
  characterPreference?: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
}

const CHINESE_CHARACTER = /[\u3400-\u9FFF]/;

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
    if (contextualMatch) {
      displayTokens.push({
        key: `${index}-${contextualMatch.id}`,
        text: contextualMatch.display,
        pinyin: contextualMatch.pinyin,
        meaning: contextualMatch.meaning,
        interactive: true,
        focused: focusTerms.includes(contextualMatch.display),
      });
      index += contextualMatch.display.length;
      continue;
    }

    const focusMatch = orderedFocusTerms.find((term) => text.startsWith(term, index));
    if (focusMatch) {
      displayTokens.push({
        key: `${index}-focus`,
        text: focusMatch,
        interactive: CHINESE_CHARACTER.test(focusMatch),
        focused: true,
      });
      index += focusMatch.length;
      continue;
    }

    const character = text[index];
    if (CHINESE_CHARACTER.test(character)) {
      let end = index + 1;
      while (end < text.length && CHINESE_CHARACTER.test(text[end])) end += 1;
      const word = text.slice(index, end);
      displayTokens.push({
        key: `${index}-${word}`,
        text: word,
        interactive: true,
        focused: focusTerms.includes(word),
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
    displayTokens.push({
      key: `${index}-copy`,
      text: text.slice(index, end),
      interactive: false,
      focused: focusTerms.some((term) => text.slice(index, end).includes(term)),
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
      {displayTokens.map((token) => token.interactive ? (
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
              '-mx-0.5 rounded-[7px] px-0.5 font-chinese text-inherit outline-none transition-colors hover:bg-[#EAF7FE] focus-visible:bg-[#EAF7FE] focus-visible:ring-2 focus-visible:ring-brand-primary/35 active:bg-[#D9F1FD]',
              token.focused && 'text-brand-primary',
            )}
          >
            {token.text}
          </button>
          {token.meaning && (
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 hidden w-max min-w-[112px] max-w-[190px] -translate-x-1/2 rounded-[11px] border-b-2 border-ui-border bg-ui-ink-strong px-3 py-2 text-center font-sans group-hover:block group-focus-within:block"
            >
              {token.pinyin && <span className="block text-xs font-black text-[#69CCF9]">{token.pinyin}</span>}
              <span className="mt-0.5 block text-xs font-bold leading-snug text-white">{token.meaning}</span>
              <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[6px] border-x-transparent border-t-ui-ink-strong" />
            </span>
          )}
        </span>
      ) : (
        <span key={token.key} className={token.focused ? 'font-black text-brand-primary' : undefined}>{token.text}</span>
      ))}
    </span>
  );
}
