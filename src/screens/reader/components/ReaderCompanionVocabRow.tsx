import React, { useCallback } from 'react';
import type { ReaderStudyTargetWord } from '../utils/readerStudyTargets';
import { AppIcon, PosBadge } from '../../../lib/widgets';
import { formatPosLabel } from '../../../utils/posLabels';
import { cn } from '../../../utils/cn';
import { useLongPress } from '../../../hooks/useLongPress';
import type { ReaderLocateMode } from '../utils/readerLocate';

/**
 * How the row targets its word in the reading text: the desktop side panel
 * locates on hover and opens the dictionary on click; the mobile drawer has no
 * hover, so a tap locates and a press-and-hold opens the dictionary.
 */

export interface ReaderCompanionVocabRowProps {
  word: ReaderStudyTargetWord;
  /** Rendered spelling for the active script preference. */
  displayText: string;
  /** Quiet part-of-speech token, already reduced for display. */
  posLabel: string | null;
  characterPreference: 'traditional' | 'simplified';
  isInText: boolean;
  isLocated: boolean;
  locateMode: ReaderLocateMode;
  onOpenWord?: (word: string) => void;
  onLocateWord?: (word: ReaderStudyTargetWord | null) => void;
  onSpeak: (text: string, audio?: string) => void;
}

/**
 * Learner-facing note when the text does not evidence this entry's taught
 * sense: either it shows a sibling sense, or the rules cannot tell them apart.
 */
function senseNote(word: ReaderStudyTargetWord): { text: string; title: string } | null {
  const sense = word.sense;
  if (!sense || sense.status === 'this' || sense.alternatives.length === 0) return null;
  const described = sense.alternatives.map(
    (alternative) => `${alternative.meaning} (Lesson ${alternative.lessonId})`,
  );
  if (sense.status === 'other') {
    return {
      text: `Here: ${sense.alternatives[0].meaning} · Lesson ${sense.alternatives[0].lessonId}`,
      title: `This reading shows another taught sense of the word: ${described.join('; ')}`,
    };
  }
  const listed = described.slice(0, 2).join(', ');
  const suffix = described.length > 2 ? '…' : '';
  return {
    text: `Sense unclear · also ${listed}${suffix}`,
    title: `The text does not show which taught sense is used here. Also taught: ${described.join('; ')}`,
  };
}

/** One vocabulary row of the Study Guide's word list. */
export const ReaderCompanionVocabRow = React.memo(function ReaderCompanionVocabRow({
  word,
  displayText,
  posLabel,
  characterPreference,
  isInText,
  isLocated,
  locateMode,
  onOpenWord,
  onLocateWord,
  onSpeak,
}: ReaderCompanionVocabRowProps) {
  const tapLocates = Boolean(onLocateWord);
  const longPress = useLongPress<HTMLButtonElement>({
    onTap: () => onLocateWord?.(word),
    onLongPress: () => onOpenWord?.(displayText),
    disabled: locateMode !== 'tap' || !tapLocates,
  });

  const locate = useCallback(() => onLocateWord?.(word), [onLocateWord, word]);
  const clearLocate = useCallback(() => onLocateWord?.(null), [onLocateWord]);
  const note = senseNote(word);

  const interactionProps =
    locateMode === 'tap' && tapLocates
      ? {
          onPointerDown: longPress.onPointerDown,
          onPointerUp: longPress.onPointerUp,
          onPointerCancel: longPress.onPointerCancel,
          onPointerLeave: longPress.onPointerLeave,
          onContextMenu: longPress.onContextMenu,
          onClick: longPress.onClick,
        }
      : {
          onClick: () => onOpenWord?.(displayText),
          onMouseEnter: locate,
          onMouseLeave: clearLocate,
          onFocus: locate,
          onBlur: clearLocate,
        };

  const title = isInText
    ? locateMode === 'tap' && tapLocates
      ? 'Appears in this reading · Tap to locate · Hold for dictionary'
      : 'Appears in this reading · Hover to locate · Click for dictionary'
    : 'Taught in this part, not used in this reading';
  const ariaLabel =
    locateMode === 'tap' && tapLocates
      ? `Locate ${displayText} in the reading (press and hold for dictionary)`
      : `Open dictionary for ${displayText}${isInText ? ' (appears in this reading)' : ''}`;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      {...interactionProps}
      className={cn(
        'group flex min-h-10 w-full items-center gap-2 rounded-compact px-2 py-1 text-left transition-colors hover:bg-ui-hover focus-ring outline-none select-none',
        !isInText && 'opacity-70',
        isLocated && 'bg-brand-primary-soft/40 ring-1 ring-brand-primary/25',
      )}
    >
      {/* Chinese Glyph */}
      <span
        className={cn(
          'min-w-9 shrink-0 font-chinese text-xl sm:text-2xl font-bold leading-tight transition-colors',
          isInText
            ? 'text-ui-ink-strong group-hover:text-brand-primary'
            : 'text-ui-muted group-hover:text-ui-ink-strong',
        )}
      >
        {displayText}
      </span>

      {/* Pinyin and English Definition */}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate font-sans text-xs font-extrabold leading-tight',
            isInText ? 'text-brand-primary' : 'text-ui-muted',
          )}
        >
          {word.pinyin}
        </span>
        <span
          className={cn(
            'block font-sans text-xs font-bold leading-snug line-clamp-1',
            isInText ? 'text-ui-ink' : 'text-ui-muted',
          )}
        >
          {word.english}
        </span>
        {note && (
          <span
            title={note.title}
            className="mt-0.5 block font-sans text-[10px] font-bold leading-snug text-ui-muted-strong line-clamp-1"
          >
            {note.text}
          </span>
        )}
      </span>

      {/* Right-side Token & Audio Action */}
      <div className="flex shrink-0 items-center gap-1">
        {word.pos && (
          <PosBadge
            pos={word.pos}
            label={posLabel ?? undefined}
            characterPreference={characterPreference}
            className="text-[10px] px-1.5 py-0.5 rounded-xs"
          />
        )}
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onSpeak(displayText, word.audio);
          }}
          className="shrink-0 p-1 rounded-full text-ui-muted hover:text-brand-primary hover:bg-brand-primary-soft/60 transition-colors"
          title={`Listen to ${displayText}`}
          aria-label={`Listen to ${displayText}`}
        >
          <AppIcon name="audio" size={14} />
        </span>
      </div>
    </button>
  );
});

/** Formats part-of-speech into clean, concise token labels (e.g. Noun, Verb, Adjective). */
export function getPosTokenLabel(pos?: string | null): string | null {
  if (!pos) return null;
  const first = pos.split('/')[0].trim().toLowerCase();
  if (first.startsWith('n') || first === 'name') return 'Noun';
  if (first.startsWith('vs') && !first.startsWith('v-sep')) return 'Adjective';
  if (first.startsWith('v')) return 'Verb';
  if (first.startsWith('adv')) return 'Adverb';
  if (first.startsWith('m')) return 'Measure';
  if (first.startsWith('prep')) return 'Prep';
  if (first.startsWith('conj')) return 'Conj';
  if (first.startsWith('part') || first.startsWith('prc')) return 'Particle';
  if (first.startsWith('pron')) return 'Pronoun';
  if (first.startsWith('num')) return 'Number';
  return formatPosLabel(pos) ?? pos;
}
