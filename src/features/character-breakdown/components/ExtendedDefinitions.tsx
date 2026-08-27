import { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { sanitizeDictionaryDefinitions } from '../../../utils/dictionaryDefinitions';
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
export function ExtendedDefinitions({ char, entries: entriesProp }: { char?: string; entries?: DBDictionaryEntry[] }) {
  const fetchedEntries = useCharDictionaryEntry(entriesProp ? undefined : char);
  const entries = entriesProp ?? fetchedEntries;
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const characterPreference = useAppStore((state) => state.characterPreference);

  const primary = entries[0];
  const sanitized = useMemo(
    () => sanitizeDictionaryDefinitions(primary?.definitions, { preferredScript: characterPreference }),
    [primary, characterPreference],
  );

  if (entries.length === 0) return null;

  const { definitions, measure_words: measureWords } = sanitized;
  const level = primary?.curriculum_level ?? null;
  const hasLevel = level !== null && level >= 1 && level <= 6;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-b-feature px-4 text-left outline-none transition-colors hover:bg-ui-canvas focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brand-primary/25 sm:px-5"
      >
        <span className="flex items-baseline gap-1.5 text-[13px] font-extrabold text-ui-muted-strong">
          More definitions
          {definitions.length > 1 && <span className="font-bold text-ui-muted">· {definitions.length}</span>}
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
              <div aria-hidden="true" className="mb-4 border-t border-ui-divider" />

              <div className="flex flex-col gap-3.5">
                <ul className="flex flex-col gap-2">
                  {definitions.map((definition, index) => (
                    <li key={index} className="text-[15px] font-bold leading-relaxed text-ui-ink">
                      {definition}
                    </li>
                  ))}
                </ul>

                {(measureWords.length > 0 || hasLevel) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {measureWords.map((mw) => (
                      <span key={mw} className="rounded-md bg-ui-canvas px-2 py-0.5 font-chinese text-sm font-bold text-ui-ink-strong">
                        {mw}
                      </span>
                    ))}
                    {hasLevel && (
                      <span className="rounded-md bg-feedback-success-surface px-2 py-0.5 text-[11px] font-extrabold text-feedback-success">
                        {CEFR[(level as number) - 1]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
