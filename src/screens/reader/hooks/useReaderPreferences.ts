import { useCallback, useState } from 'react';
import type { ReaderTextSize } from '../../../types/models';

/**
 * Reader display preferences (pinyin, meaning, hover definitions, text size).
 *
 * All four are the same capability — "a reader display preference the learner
 * keeps across readings" — so they are persisted through one owner instead of
 * repeating a read-on-mount / write-on-change pair per preference.
 */

const STORAGE_KEYS = {
  showPinyin: 'rongwaps:reader_show_pinyin',
  showMeaning: 'rongwaps:reader_show_meaning',
  hoverDefinitions: 'rongwaps:reader_hover_definitions',
  textSize: 'rongwaps:reader_text_size',
} as const;

/** localStorage can throw in restricted contexts (private mode, blocked storage). */
function readStored(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const saved = readStored(key);
  return saved === null ? fallback : saved === 'true';
}

function isReaderTextSize(value: string | null): value is ReaderTextSize {
  return value === 'normal' || value === 'large' || value === 'extra-large';
}

export function useReaderPreferences() {
  const [showPinyin, setShowPinyin] = useState(() => readStoredBoolean(STORAGE_KEYS.showPinyin, true));
  const [showMeaning, setShowMeaning] = useState(() => readStoredBoolean(STORAGE_KEYS.showMeaning, false));
  const [showHoverDefinitions, setShowHoverDefinitions] = useState(
    () => readStoredBoolean(STORAGE_KEYS.hoverDefinitions, true),
  );
  const [textSize, setTextSizeState] = useState<ReaderTextSize>(() => {
    const saved = readStored(STORAGE_KEYS.textSize);
    return isReaderTextSize(saved) ? saved : 'normal';
  });

  const toggleShowPinyin = useCallback(() => {
    setShowPinyin((previous) => {
      const next = !previous;
      writeStored(STORAGE_KEYS.showPinyin, String(next));
      return next;
    });
  }, []);

  const toggleShowMeaning = useCallback(() => {
    setShowMeaning((previous) => {
      const next = !previous;
      writeStored(STORAGE_KEYS.showMeaning, String(next));
      return next;
    });
  }, []);

  const toggleShowHoverDefinitions = useCallback(() => {
    setShowHoverDefinitions((previous) => {
      const next = !previous;
      writeStored(STORAGE_KEYS.hoverDefinitions, String(next));
      return next;
    });
  }, []);

  const setTextSize = useCallback((next: ReaderTextSize) => {
    setTextSizeState(next);
    writeStored(STORAGE_KEYS.textSize, next);
  }, []);

  return {
    showPinyin,
    showMeaning,
    showHoverDefinitions,
    textSize,
    toggleShowPinyin,
    toggleShowMeaning,
    toggleShowHoverDefinitions,
    setTextSize,
  };
}
