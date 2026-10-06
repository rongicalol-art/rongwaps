import { useCallback, useState } from 'react';
import type { ReaderTextSize } from '../../../types/models';
import { readBoolean, readString, writeBoolean, writeString } from '../../../utils/localStorage';

/**
 * Reader display preferences (pinyin, meaning, hover definitions, text size).
 * Defaults are characters only (no pinyin, no meaning) at the largest text size.
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

function isReaderTextSize(value: string | null): value is ReaderTextSize {
  return value === 'normal' || value === 'large' || value === 'extra-large';
}

export function useReaderPreferences() {
  const [showPinyin, setShowPinyin] = useState(() => readBoolean(STORAGE_KEYS.showPinyin, false));
  const [showMeaning, setShowMeaning] = useState(() => readBoolean(STORAGE_KEYS.showMeaning, false));
  const [showHoverDefinitions, setShowHoverDefinitions] = useState(
    () => readBoolean(STORAGE_KEYS.hoverDefinitions, true),
  );
  const [textSize, setTextSizeState] = useState<ReaderTextSize>(() => {
    const saved = readString(STORAGE_KEYS.textSize);
    return isReaderTextSize(saved) ? saved : 'extra-large';
  });

  const toggleShowPinyin = useCallback(() => {
    setShowPinyin((previous) => {
      const next = !previous;
      writeBoolean(STORAGE_KEYS.showPinyin, next);
      return next;
    });
  }, []);

  const toggleShowMeaning = useCallback(() => {
    setShowMeaning((previous) => {
      const next = !previous;
      writeBoolean(STORAGE_KEYS.showMeaning, next);
      return next;
    });
  }, []);

  const toggleShowHoverDefinitions = useCallback(() => {
    setShowHoverDefinitions((previous) => {
      const next = !previous;
      writeBoolean(STORAGE_KEYS.hoverDefinitions, next);
      return next;
    });
  }, []);

  const setTextSize = useCallback((next: ReaderTextSize) => {
    setTextSizeState(next);
    writeString(STORAGE_KEYS.textSize, next);
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
