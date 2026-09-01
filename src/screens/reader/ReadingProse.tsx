import type { ReadingRecord } from '../../types/models';
import type { WordCharRange } from '../../utils/dialogueSync';
import { cn } from '../../utils/cn';

interface ReadingProseProps {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  activeParagraphIndex: number | null;
  onToggleParagraph: (index: number) => void;
  /** Line currently spoken by karaoke playback (whole line highlighted). */
  playingLineIndex?: number | null;
  /** Character range of the word currently spoken inside `playingLineIndex`. */
  activeWordRange?: WordCharRange | null;
}

/**
 * Book-style dialogue prose: each speaker line is one flowing paragraph with
 * an inline speaker label, justified type, and a first-line indent. Tapping a
 * paragraph highlights it in place; its pinyin + meaning reveal appears as a
 * footnote below the passage (owned by ReaderScreen).
 */
export function ReadingProse({
  reading,
  characterPreference,
  showPinyin,
  activeParagraphIndex,
  onToggleParagraph,
  playingLineIndex = null,
  activeWordRange = null,
}: ReadingProseProps) {
  return (
    <div className="space-y-4">
      {reading.paragraphs.map((paragraph, index) => {
        const text = characterPreference === 'simplified'
          ? paragraph.simplified
          : paragraph.traditional;
        const active = index === activeParagraphIndex;
        const playing = index === playingLineIndex;
        // Word-level highlight only without ruby (pinyin) — splitting the
        // text inside <ruby> would break the annotation layout.
        const showWordHighlight = playing && activeWordRange !== null && !showPinyin;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onToggleParagraph(index)}
            aria-pressed={active || playing}
            className={cn(
              '-mx-2 block w-full rounded-[12px] px-2 py-1.5 text-justify indent-[2em] font-chinese text-[22px] font-bold leading-[2.05] text-ui-ink-strong outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary/35 sm:text-[24px]',
              active
                ? 'bg-brand-primary-soft text-brand-primary'
                : 'hover:bg-brand-primary-soft/60 active:bg-brand-primary-soft',
              playing && !active && 'bg-brand-primary/10 text-brand-primary',
            )}
          >
            <span className="mr-1.5 font-sans text-[0.68em] font-black uppercase tracking-[0.1em] text-ui-muted-strong">
              {paragraph.speaker}
            </span>
            {showPinyin ? (
              <ruby className="font-chinese">
                {text}
                <rt className="font-sans text-[13px] font-bold tracking-normal text-brand-primary">
                  {paragraph.pinyin}
                </rt>
              </ruby>
            ) : showWordHighlight ? (
              <span className="font-chinese">
                {text.slice(0, activeWordRange.start)}
                <span className="rounded-[6px] bg-brand-primary/25 text-brand-primary">
                  {text.slice(activeWordRange.start, activeWordRange.end)}
                </span>
                {text.slice(activeWordRange.end)}
              </span>
            ) : (
              <span className="font-chinese">{text}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
