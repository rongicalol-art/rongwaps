/**
 * Overlay-window URL contract.
 *
 * Full-viewport overlay windows (reader, grammar lesson, dictionary detail,
 * practice activities) are addressable through search params so deep links,
 * browser back/forward, and refreshes reproduce the workspace state:
 *
 *   ?reader=<index|true>    (+ legacy ?readingIndex=<n>)
 *   ?grammarPart=<id>
 *   ?word=<text>
 *   ?activity=<activity id>
 *
 * Pure module: parse reads a search string, build produces one. The sync
 * effects in App reconcile store state against the URL on every location
 * change.
 */

export interface OverlayUrlState {
  readerIndex: number | null;
  grammarPartId: string | null;
  dictionaryWord: string | null;
  activity: string | null;
}

const EMPTY: OverlayUrlState = {
  readerIndex: null,
  grammarPartId: null,
  dictionaryWord: null,
  activity: null,
};

export function parseOverlayParams(search: string): OverlayUrlState {
  if (!search || search === '?') return { ...EMPTY };
  const params = new URLSearchParams(search);

  let readerIndex: number | null = null;
  const readerParam = params.get('reader');
  const readingIndexParam = params.get('readingIndex');
  if (readerParam === 'true') {
    readerIndex = parseBoundedIndex(readingIndexParam) ?? 0;
  } else if (readerParam !== null) {
    readerIndex = parseBoundedIndex(readerParam) ?? parseBoundedIndex(readingIndexParam);
  } else if (readingIndexParam !== null) {
    readerIndex = parseBoundedIndex(readingIndexParam);
  }

  return {
    readerIndex,
    grammarPartId: params.get('grammarPart'),
    dictionaryWord: params.get('word'),
    activity: params.get('activity'),
  };
}

function parseBoundedIndex(value: string | null): number | null {
  if (value === null) return null;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

export function buildOverlayParams(state: OverlayUrlState): string {
  const params = new URLSearchParams();
  if (state.readerIndex !== null) params.set('reader', String(state.readerIndex));
  if (state.grammarPartId) params.set('grammarPart', state.grammarPartId);
  if (state.dictionaryWord) params.set('word', state.dictionaryWord);
  if (state.activity) params.set('activity', state.activity);
  return params.size > 0 ? `?${params.toString()}` : '';
}

/** Canonical search string for the URL, from parsed params. */
export function overlaySearchOf(state: OverlayUrlState): string {
  return buildOverlayParams(state);
}

export const EMPTY_OVERLAY_URL_STATE = EMPTY;
