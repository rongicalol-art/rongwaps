import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ActivityType } from '../../types/models';
import { buildOverlayParams, parseOverlayParams } from '../overlayUrl';

/**
 * Two-way sync between overlay-window state and the URL search params.
 *
 * - URL → state: runs ONLY on location changes (deep link, back/forward,
 *   programmatic navigate) and applies the parsed overlay state, so browser
 *   back closes the open overlay. It marks the applied params as "pending"
 *   until the store reflects them.
 * - state → URL: only runs for state changes that did not accompany a
 *   location change. Opening pushes a history entry (so back closes it);
 *   changing or closing replaces in place (no history spam from scrubbing
 *   a reader).
 *
 * The pending handoff keeps the two passes from fighting: while a URL
 * event's state application is in flight, the state→URL pass must not
 * write with one-commit-stale render state.
 */
export interface OverlaySyncDeps {
  reader: {
    activeReadingIndex: number | null;
    readingsLength: number;
    activeBookId: number;
    openReader: (bookId: number, explicitIndex?: number) => Promise<void>;
    navigateReader: (index: number) => void;
    closeReader: () => void;
  };
  grammar: {
    activeGrammarPartId: string | null;
    setActiveGrammarPartId: (partId: string | null) => void;
  };
  dictionary: {
    dictionaryWord: string | null;
    setDictionaryWord: (word: string | null) => void;
  };
  activity: {
    activeActivity: ActivityType;
    setActiveActivity: (activity: ActivityType) => void;
  };
}

export function useOverlayUrlSync(deps: OverlaySyncDeps) {
  // Values are used as effect dependencies below; fresh reads go through depsRef.
  const { reader, grammar, dictionary, activity } = deps;
  const location = useLocation();
  const navigate = useNavigate();
  // Latest deps without making the sync effects re-run on render.
  const depsRef = useRef(deps);
  depsRef.current = deps;
  const wasOverlayPresentRef = useRef(false);
  const pendingApplyRef = useRef(false);
  // Params the store is expected to reflect (from the last URL event, or the
  // last write the state→URL pass made).
  const appliedParamsRef = useRef<string>('');

  // URL → state. Location-keyed: never re-runs on state changes.
  useEffect(() => {
    const d = depsRef.current;
    const desired = parseOverlayParams(location.search);
    let changed = false;
    if (desired.grammarPartId !== d.grammar.activeGrammarPartId) {
      d.grammar.setActiveGrammarPartId(desired.grammarPartId);
      changed = true;
    }
    if (desired.dictionaryWord !== d.dictionary.dictionaryWord) {
      d.dictionary.setDictionaryWord(desired.dictionaryWord);
      changed = true;
    }
    if (desired.activity !== (d.activity.activeActivity ?? null)) {
      d.activity.setActiveActivity((desired.activity ?? null) as ActivityType);
      changed = true;
    }
    if (desired.readerIndex !== d.reader.activeReadingIndex) {
      changed = true;
      if (desired.readerIndex === null) {
        d.reader.closeReader();
      } else if (d.reader.readingsLength > 0) {
        d.reader.navigateReader(desired.readerIndex);
      } else {
        void d.reader.openReader(d.reader.activeBookId, desired.readerIndex);
      }
    }
    pendingApplyRef.current = changed;
    appliedParamsRef.current = buildOverlayParams({
      readerIndex: desired.readerIndex,
      grammarPartId: desired.grammarPartId,
      dictionaryWord: desired.dictionaryWord,
      activity: desired.activity,
    });
  }, [location.key, location.search]);

  // state → URL: only when no URL-driven application is in flight.
  useEffect(() => {
    const d = depsRef.current;
    const paramsFromState = buildOverlayParams({
      readerIndex: d.reader.activeReadingIndex,
      grammarPartId: d.grammar.activeGrammarPartId,
      dictionaryWord: d.dictionary.dictionaryWord,
      activity: d.activity.activeActivity,
    });

    if (pendingApplyRef.current) {
      // The store has caught up with the URL — clear the pending handoff.
      if (paramsFromState === appliedParamsRef.current) {
        pendingApplyRef.current = false;
      }
      return;
    }

    if (paramsFromState === location.search) {
      wasOverlayPresentRef.current = paramsFromState !== '';
      return;
    }

    // Opening pushes a history entry; changing or closing replaces.
    const present = paramsFromState !== '';
    const shouldPush = present && !wasOverlayPresentRef.current;
    wasOverlayPresentRef.current = present;
    appliedParamsRef.current = paramsFromState;
    navigate(`${location.pathname}${paramsFromState}`, { replace: !shouldPush });
  }, [location.key, location.search, location.pathname, navigate, reader.activeReadingIndex, reader.readingsLength, grammar.activeGrammarPartId, dictionary.dictionaryWord, activity.activeActivity]);
}
