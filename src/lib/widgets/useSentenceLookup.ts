import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AnchorPosition } from '../../utils/browser/tooltipPosition';
import type { SentenceSegment, SentenceWordContext, SentenceWordLookupResult } from '../../types/sentenceLookup';
import { sentenceSegments, sentenceCandidates, validatedSentenceSegments } from '../../utils/vocabulary/sentenceSegments';

export interface SentenceLookupHandlers {
  lookupWord?: (word: string, context?: SentenceWordContext) => Promise<SentenceWordLookupResult | null>;
  validateWords?: (words: string[]) => Promise<Set<string> | Map<string, unknown>>;
  segmentText?: (text: string, authoredWords?: string[]) => Promise<SentenceSegment[]>;
  playAudio?: (word: string, pinyin?: string) => Promise<void> | void;
  renderActions?: (state: HoveredWordState) => ReactNode;
}

export const sentenceLookupHandlers: SentenceLookupHandlers = {};
export function registerSentenceLookupHandlers(handlers: SentenceLookupHandlers) {
  Object.assign(sentenceLookupHandlers, handlers);
}

const NO_WORDS: string[] = [];
export function useSentenceSegments(text: string, authoredWords = NO_WORDS, validateWords?: SentenceLookupHandlers['validateWords']) {
  const initial = useMemo(() => sentenceSegments(text, authoredWords), [text, authoredWords]);
  const safe = useMemo(() => validatedSentenceSegments(initial, new Set(authoredWords)), [initial, authoredWords]);
  const [resolved, setResolved] = useState<{ initial: SentenceSegment[]; segments: SentenceSegment[] } | null>(null);
  useEffect(() => {
    let current = true;
    const task = validateWords
      ? validateWords(sentenceCandidates(initial)).then(valid => validatedSentenceSegments(initial, new Set([...valid.keys(), ...authoredWords])))
      : sentenceLookupHandlers.segmentText?.(text, authoredWords);
    void task?.then(segments => {
      if (current) setResolved({ initial, segments });
    }).catch(() => {});
    return () => { current = false; };
  }, [text, authoredWords, initial, validateWords]);
  return resolved?.initial === initial ? resolved.segments : safe;
}

export interface HoveredWordState {
  word: string;
  anchor: AnchorPosition;
  info: SentenceWordLookupResult | null;
  loading: boolean;
}

/** Shared hover/focus lifecycle, including stale-response protection and cleanup. */
export function useSentenceWordHover(lookup = sentenceLookupHandlers.lookupWord) {
  const [hoveredWord, setHoveredWord] = useState<HoveredWordState | null>(null);
  const [activeWordKey, setActiveWordKey] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);
  const open = useRef(false);
  const clearTimers = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);
  const invalidate = useCallback(() => { request.current++; }, []);
  const closeTooltip = useCallback(() => {
    clearTimers();
    request.current++;
    open.current = false;
    setHoveredWord(null);
    setActiveWordKey(null);
  }, [clearTimers]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeTooltip(); };
    window.addEventListener('scroll', closeTooltip, true);
    window.addEventListener('keydown', keydown);
    return () => {
      window.removeEventListener('scroll', closeTooltip, true);
      window.removeEventListener('keydown', keydown);
      clearTimers();
      invalidate();
    };
  }, [clearTimers, closeTooltip, invalidate]);
  const enter = useCallback((element: HTMLElement, word: string, key: string, context?: SentenceWordContext) => {
    clearTimers();
    request.current++;
    const ticket = request.current;
    setActiveWordKey(key);
    const show = () => {
      const rect = element.getBoundingClientRect();
      const meaning = context?.meaning || context?.english;
      const info = { word, pinyin: context?.pinyin, definitions: meaning ? [meaning] : [] };
      setHoveredWord({ word, anchor: { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom }, info, loading: !meaning && Boolean(lookup) });
      open.current = true;
      void lookup?.(word, context).then(result => {
        if (request.current === ticket) setHoveredWord(previous => previous && ({ ...previous, info: result, loading: false }));
      }).catch(() => {
        if (request.current === ticket) setHoveredWord(previous => previous && ({ ...previous, loading: false }));
      });
    };
    if (open.current) show();
    else hoverTimer.current = setTimeout(show, 100);
  }, [clearTimers, lookup]);
  const leave = useCallback(() => {
    clearTimers();
    setActiveWordKey(null);
    leaveTimer.current = setTimeout(closeTooltip, 120);
  }, [clearTimers, closeTooltip]);
  const keepOpen = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }, []);
  return { hoveredWord, activeWordKey, enter, leave, keepOpen, closeTooltip };
}
