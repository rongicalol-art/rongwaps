import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { sanitizeDictionaryDefinitions } from '../../../utils/vocabulary/dictionaryDefinitions';
import { useAppStore } from '../../../store/useAppStore';
import { useCharDictionaryEntry } from '../hooks/useCharDictionaryEntry';
import type { DBDictionaryEntry } from '../../../types/database';

const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`h-3 w-3 shrink-0 text-ui-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M2.5 4.25 6 7.75l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * In-card "More definitions" disclosure for the breakdown summary box.
 * Shows the full dictionary definition list plus measure words and level;
 * audio and save live in `SummaryQuickActions` on the card. Renders
 * nothing while loading or without an entry.
 *
 * Pass either `char` (fetched through the shared dictionary cache) or
 * preloaded `entries` (e.g. a multi-character word's entries).
 */
export interface ExtendedDefinitionsData {
  definitions: string[];
  measureWords: string[];
  measureDetails: { char: string; pinyin?: string }[];
  hasLevel: boolean;
  levelLabel: string;
  hasExtraDefinitions: boolean;
  hasExtra: boolean;
}

/** The dictionary details behind "more definitions": extra senses, measure words, level. */
export function useExtendedDefinitions(char?: string, entriesProp?: DBDictionaryEntry[]): ExtendedDefinitionsData | null {
  const fetchedEntries = useCharDictionaryEntry(entriesProp ? undefined : char);
  const entries = entriesProp ?? fetchedEntries;
  const characterPreference = useAppStore((state) => state.characterPreference);
  const primary = entries[0];
  const sanitized = useMemo(
    () => sanitizeDictionaryDefinitions(primary?.definitions, { preferredScript: characterPreference }),
    [primary, characterPreference],
  );
  if (entries.length === 0) return null;
  const { definitions, measure_words: measureWords, measure_word_details: measureDetails } = sanitized;
  const level = primary?.curriculum_level ?? null;
  const hasLevel = level !== null && level >= 1 && level <= 6;
  const hasExtraDefinitions = definitions.length > 1;
  return {
    definitions,
    measureWords,
    measureDetails,
    hasLevel,
    levelLabel: hasLevel ? CEFR[(level as number) - 1] : '',
    hasExtraDefinitions,
    hasExtra: hasExtraDefinitions || measureWords.length > 0 || hasLevel,
  };
}

/** The expanded details list. */
export function ExtendedDefinitionsPanel({ data }: { data: ExtendedDefinitionsData }) {
  const { definitions, measureWords, measureDetails, hasLevel, levelLabel, hasExtraDefinitions } = data;
  return (
    <div className="flex flex-col gap-3.5">
      {hasExtraDefinitions && (
        <ul className="flex flex-col gap-2">
          {definitions.map((definition, index) => (
            <li key={index} className="text-sm font-bold leading-relaxed text-ui-ink">
              {definition}
            </li>
          ))}
        </ul>
      )}

      {measureWords.length > 0 && (
        <p className="inline-flex min-h-9 w-fit flex-wrap items-center gap-x-2 gap-y-1 rounded-control bg-ui-canvas px-3 py-1.5 text-sm text-ui-muted-strong sm:text-[15px]">
          <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted sm:text-xs">Measure word</span>
          {measureDetails.map((mw, i) => (
            <span key={mw.char} className="inline-flex items-baseline gap-1 font-bold">
              {i > 0 && <span aria-hidden className="mr-1 text-ui-divider">·</span>}
              <span className="font-chinese text-ui-ink">{mw.char}</span>
              {mw.pinyin && <span>{mw.pinyin}</span>}
            </span>
          ))}
        </p>
      )}
      {hasLevel && (
        <span className="w-fit rounded-compact bg-feedback-success-surface px-2 py-0.5 text-xs font-extrabold text-feedback-success">
          {levelLabel}
        </span>
      )}
    </div>
  );
}

/** Round chevron toggle; sits next to the main definition. */
export function MoreDefinitionsToggle({ open, onToggle, count }: { open: boolean; onToggle: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? 'Hide more definitions' : 'Show more definitions'}
      className="flex h-8 shrink-0 items-center gap-1 rounded-compact px-2 text-xs font-black text-ui-muted-strong transition-colors hover:bg-ui-hover focus-ring"
    >
      {count !== undefined && count > 0 && <span>+{count}</span>}
      <Chevron open={open} />
    </button>
  );
}

/**
 * In-card "More definitions" disclosure for the breakdown summary box.
 * Shows the full dictionary definition list plus measure words and level;
 * audio and save live in `SummaryQuickActions` on the card. Renders
 * nothing while loading or without an entry.
 *
 * Pass either `char` (fetched through the shared dictionary cache) or
 * preloaded `entries` (e.g. a multi-character word's entries).
 */
export function ExtendedDefinitions({ char, entries: entriesProp }: { char?: string; entries?: DBDictionaryEntry[] }) {
  const data = useExtendedDefinitions(char, entriesProp);
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  if (!data || !data.hasExtra) return null;
  const { definitions, hasExtraDefinitions } = data;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-b-feature px-4 text-left transition-colors hover:bg-ui-canvas focus-ring focus-visible:ring-inset sm:px-5"
      >
        <span className="flex items-baseline gap-1.5 text-sm font-extrabold text-ui-muted-strong">
          {hasExtraDefinitions ? 'More definitions' : 'Dictionary details'}
          {hasExtraDefinitions && <span className="font-bold text-ui-muted">· {definitions.length}</span>}
        </span>
        <Chevron open={open} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 sm:px-5">
              {/* Single inset hairline separating the trigger from the details */}
              <div aria-hidden="true" className="mb-4 border-t-2 border-ui-divider" />
              <ExtendedDefinitionsPanel data={data} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
