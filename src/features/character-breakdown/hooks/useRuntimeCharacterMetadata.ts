import { useEffect, useMemo, useState } from 'react';
import { getMultipleBreakdowns } from '../../../services/breakdownService';
import { getDictionaryEntriesBatch } from '../../../services/dictionaryService';
import type { DBDictionaryEntry } from '../../../types/database';
import type { RuntimeTreeNodeState } from './useRuntimeDecompositionTree';

export interface RuntimeCharacterMetadata {
  pinyin?: string;
  meaning?: string;
}

function shorten(text: string): string | undefined {
  const cleaned = text.trim().replace(/^['"]|['"]$/gu, '');
  if (!cleaned) return undefined;
  const firstClause = cleaned.split(/[;•,|["]/u)[0]?.trim() || cleaned;
  return firstClause.length > 34 ? `${firstClause.slice(0, 33).trimEnd()}…` : firstClause;
}

function firstMeaning(value: unknown): string | undefined {
  if (typeof value === 'string') return shorten(value);
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return first ? shorten(first) : undefined;
  }
  if (value && typeof value === 'object') {
    const first = Object.values(value).find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return first ? shorten(first) : undefined;
  }
  return undefined;
}

/**
 * Resolves learner metadata for one glyph. The character breakdown record
 * wins on every field because it is the exact record the pressed breakdown
 * screen renders (`V3CharacterSummary`); the dictionary entry is only a
 * fallback for characters without a breakdown record.
 */
export function preferCharacterMetadata(
  breakdown: { pinyin?: string[] | null; definition?: string | null } | null | undefined,
  dictionaryEntry: DBDictionaryEntry | undefined,
): RuntimeCharacterMetadata {
  const metadata: RuntimeCharacterMetadata = {};
  const pinyin = breakdown?.pinyin?.[0]?.trim() || dictionaryEntry?.pinyin?.[0]?.trim();
  if (pinyin) metadata.pinyin = pinyin;
  const meaning = breakdown?.definition?.trim() || firstMeaning(dictionaryEntry?.definitions);
  if (meaning) metadata.meaning = meaning;
  return metadata;
}

/**
 * Loads learner metadata for the currently materialized glyph layer in one
 * batched request. Decomposition remains owned by the V3 runtime service;
 * this hook only enriches already-visible glyphs.
 *
 * Metadata reads the character breakdown source first (same records the
 * breakdown screen shows when a glyph is pressed), then falls back to the
 * dictionary for characters without a breakdown record. This keeps tree
 * cards consistent with the pressed breakdown for every glyph.
 */
export function useRuntimeCharacterMetadata(
  nodes: Record<string, RuntimeTreeNodeState>,
): ReadonlyMap<string, RuntimeCharacterMetadata> {
  const characters = useMemo(() => (
    Array.from(new Set(
      Object.values(nodes).flatMap((state) => (
        state.result?.children
          .filter((child) => child.kind === 'glyph' && child.glyph)
          .map((child) => child.glyph!) ?? []
      )),
    )).sort()
  ), [nodes]);
  const characterKey = characters.join('|');
  const [metadata, setMetadata] = useState<Map<string, RuntimeCharacterMetadata>>(() => new Map());

  useEffect(() => {
    if (!characterKey) return undefined;
    let active = true;
    void (async () => {
      // 1. Character breakdown records (the pressed screen's source).
      const breakdowns = await getMultipleBreakdowns(characters);
      if (!active) return;

      const fromBreakdown = new Map<string, RuntimeCharacterMetadata>();
      const missing: string[] = [];
      for (const character of characters) {
        const value = preferCharacterMetadata(breakdowns[character], undefined);
        if (value.pinyin || value.meaning) fromBreakdown.set(character, value);
        else missing.push(character);
      }
      if (fromBreakdown.size > 0) {
        setMetadata((current) => {
          const next = new Map(current);
          for (const [character, value] of fromBreakdown) next.set(character, value);
          return next;
        });
      }
      if (missing.length === 0) return;

      // 2. Dictionary fallback for characters without breakdown metadata.
      const entries = await getDictionaryEntriesBatch(missing);
      if (!active) return;
      setMetadata((current) => {
        const next = new Map(current);
        for (const character of missing) {
          const value = preferCharacterMetadata(undefined, entries.get(character));
          if (value.pinyin || value.meaning) next.set(character, value);
        }
        return next;
      });
    })().catch(() => {
      // Metadata is optional; a glyph remains useful without dictionary data.
    });

    return () => {
      active = false;
    };
  }, [characterKey, characters]);

  return metadata;
}
