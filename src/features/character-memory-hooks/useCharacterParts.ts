import { useEffect, useState } from 'react';
import { getMultipleBreakdowns } from '../../services/breakdownService';
import { getDictionaryEntriesBatch } from '../../services/dictionaryService';
import { getDecompositionRuntimeService } from '../character-decomposition';
import { usePronunciation } from '../../hooks/usePronunciation';
import { primaryReading } from '../../utils/pinyin/pronunciation';
import { numberToToneMarks } from '../../utils/pinyin/pinyin';

export interface CharacterPart {
  glyph: string;
  pinyin?: string;
  meaning?: string;
}

export interface CharacterPartsState {
  loaded: boolean;
  pinyin?: string;
  meaning?: string;
  parts: CharacterPart[];
}

interface RawInfo { pinyin?: string; meaning?: string }

/** First short clause of a definition, so tiles stay one line. */
function shorten(text?: string | null): string | undefined {
  const first = text?.trim().split(/[;,|]/u)[0]?.trim();
  if (!first) return undefined;
  return first.length > 28 ? `${first.slice(0, 27).trimEnd()}…` : first;
}

function dictionaryMeaning(definitions: unknown): string | undefined {
  if (typeof definitions === 'string') return shorten(definitions);
  if (Array.isArray(definitions)) return shorten(definitions.find((item): item is string => typeof item === 'string'));
  return undefined;
}

/**
 * One character's direct parts (decomposition service) with pinyin and a short
 * meaning each, for the hover card. Fetches only while `enabled`, so hovering
 * is the only thing that costs a request; results are cached per character.
 */
export function useCharacterParts(char: string, enabled: boolean): CharacterPartsState {
  const readings = usePronunciation();
  const [state, setState] = useState<{ char: string; head: RawInfo; parts: CharacterPart[] } | null>(null);

  useEffect(() => {
    if (!enabled || state?.char === char) return;
    let active = true;
    void (async () => {
      const result = await getDecompositionRuntimeService().getDirectVisibleChildren(char);
      const glyphs = result.children
        .filter((child) => child.kind === 'glyph' && child.glyph)
        .map((child) => child.glyph as string);
      const all = [char, ...glyphs];
      const breakdowns = await getMultipleBreakdowns(all);
      const missing = all.filter((item) => !breakdowns[item]?.definition || !breakdowns[item]?.pinyin?.[0]);
      const entries = missing.length > 0 ? await getDictionaryEntriesBatch(missing) : new Map();
      const info = (item: string): RawInfo => ({
        pinyin: breakdowns[item]?.pinyin?.[0] || entries.get(item)?.pinyin?.[0],
        meaning: shorten(breakdowns[item]?.definition) ?? dictionaryMeaning(entries.get(item)?.definitions),
      });
      if (!active) return;
      setState({ char, head: info(char), parts: glyphs.map((glyph) => ({ glyph, ...info(glyph) })) });
    })().catch(() => {
      if (active) setState({ char, head: {}, parts: [] });
    });
    return () => { active = false; };
  }, [char, enabled, state?.char]);

  const ready = state?.char === char ? state : null;
  const show = (item: string, fallback?: string) => {
    const reading = primaryReading(item, readings, fallback);
    return reading ? numberToToneMarks(reading) : undefined;
  };
  return {
    loaded: Boolean(ready),
    pinyin: ready ? show(char, ready.head.pinyin) : undefined,
    meaning: ready?.head.meaning,
    parts: ready ? ready.parts.map((part) => ({ ...part, pinyin: show(part.glyph, part.pinyin) })) : [],
  };
}
