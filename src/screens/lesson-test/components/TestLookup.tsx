import { createContext, Fragment, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import { SentenceWordTooltipPortal, sentenceLookupHandlers, useSentenceWordHover } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import type { SentenceSegment } from '../../../types/sentenceLookup';
import { sentenceSegments } from '../../../utils/vocabulary/sentenceSegments';

export interface Lookup {
  enter: (element: HTMLElement, word: string) => void;
  leave: () => void;
  open: (word: string) => void;
}

const LookupContext = createContext<Lookup | null>(null);

/** The words can be looked up here (null in the test itself, and inside a choice, which is a button). */
export const useTestLookup = () => useContext(LookupContext);

const HAN = /\p{Script=Han}/u;
/** Punctuation that can't start a line: it rides with the word before it. */
const CLOSING = /^[，。、；：？！」』）,.;:?!)]+$/;

/**
 * The app's word lookup (as SmartSentence does it) for the Chinese inside: hover or focus a word for its meaning, tap
 * or click it to open it in the dictionary. For review only (the Script, Scripts & answers, a checked Fix round):
 * a dictionary during the test would give the answers away. `onOpen` runs as the dictionary opens (to stop audio).
 */
export function TestLookup({ on = true, onOpen, children }: { on?: boolean; onOpen?: () => void; children: ReactNode }) {
  const { hoveredWord, enter, leave, keepOpen, closeTooltip } = useSentenceWordHover();
  const setDictionaryWord = useAppStore((state) => state.setDictionaryWord);
  const reduceMotion = Boolean(useReducedMotion());
  const lookup = useMemo<Lookup>(() => ({
    enter: (element, word) => enter(element, word, word),
    leave,
    open: (word) => {
      closeTooltip();
      onOpen?.();
      setDictionaryWord(word);
    },
  }), [enter, leave, closeTooltip, onOpen, setDictionaryWord]);
  useEffect(() => { if (!on) closeTooltip(); }, [on, closeTooltip]);
  return (
    <LookupContext.Provider value={on ? lookup : null}>
      {children}
      {on && hoveredWord && (
        <SentenceWordTooltipPortal
          data={hoveredWord}
          reduceMotion={reduceMotion}
          onMouseEnter={keepOpen}
          onMouseLeave={leave}
          onPlayAudio={sentenceLookupHandlers.playAudio ? () => void sentenceLookupHandlers.playAudio?.(hoveredWord.word, hoveredWord.info?.pinyin) : undefined}
        />
      )}
    </LookupContext.Provider>
  );
}

/** Chinese inside a button (a choice) stays plain: a word can't be a button in a button. */
export function NoLookup({ children }: { children: ReactNode }) {
  return <LookupContext.Provider value={null}>{children}</LookupContext.Provider>;
}

/** The text's words as the rest of the app reads them (the segmenter checked against the dictionary, so 電腦 is one word); the segmenter's own words until that's ready. */
export function useWordSegments(text: string, words: readonly string[]) {
  const quick = useMemo(() => sentenceSegments(text, words), [text, words]);
  const [checked, setChecked] = useState<{ quick: SentenceSegment[]; segments: SentenceSegment[] } | null>(null);
  useEffect(() => {
    let current = true;
    void sentenceLookupHandlers.segmentText?.(text, words).then((segments) => {
      if (current) setChecked({ quick, segments });
    }).catch(() => {});
    return () => { current = false; };
  }, [text, words, quick]);
  return checked?.quick === quick ? checked.segments : quick;
}

/** One word: its meaning on hover or focus, the dictionary on a tap. It takes a line-through from the text around it (a crossed-out pick). */
function LookupWord({ word, lookup, children }: { word: string; lookup: Lookup; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={`Open ${word} in the dictionary`}
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') lookup.enter(event.currentTarget, word); }}
      onPointerLeave={lookup.leave}
      // Keyboard focus only: focus coming back from the dictionary (or a tap) mustn't pop the meaning up again.
      onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) lookup.enter(event.currentTarget, word); }}
      onBlur={lookup.leave}
      onClick={(event) => {
        event.stopPropagation();
        lookup.open(word);
      }}
      className="-mx-0.5 cursor-pointer rounded-xs px-0.5 align-baseline transition-colors [text-decoration:inherit] focus-ring-inline hover:bg-brand-primary/10 hover:text-brand-primary-text focus-visible:bg-brand-primary/10 focus-visible:text-brand-primary-text active:bg-brand-primary/20"
    >
      {children}
    </button>
  );
}

/**
 * The segments in order, each Chinese word a lookup button; `piece` draws a segment's content (its characters, or
 * their ruby). Closing punctuation stays on its word's line.
 */
export function LookupWords({ segments, lookup, piece }: { segments: SentenceSegment[]; lookup: Lookup; piece: (segment: SentenceSegment) => ReactNode }) {
  const draw = (part: SentenceSegment) => (part.isWordLike && HAN.test(part.segment)
    ? <LookupWord key={part.index} word={part.segment} lookup={lookup}>{piece(part)}</LookupWord>
    : <Fragment key={part.index}>{piece(part)}</Fragment>);
  return segments.map((segment, at) => {
    if (at > 0 && CLOSING.test(segment.segment)) return null;
    let end = at + 1;
    while (end < segments.length && CLOSING.test(segments[end].segment)) end += 1;
    return end > at + 1
      ? <span key={segment.index} className="whitespace-nowrap">{segments.slice(at, end).map(draw)}</span>
      : draw(segment);
  });
}
