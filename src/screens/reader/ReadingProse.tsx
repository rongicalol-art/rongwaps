import type { ReadingRecord } from '../../types/models';
import { cn } from '../../utils/cn';

interface ReadingProseProps {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  activeParagraphIndex: number | null;
  onToggleParagraph: (index: number) => void;
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
}: ReadingProseProps) {
  return (
    <div className="space-y-4">
      {reading.paragraphs.map((paragraph, index) => {
        const text = characterPreference === 'simplified'
          ? paragraph.simplified
          : paragraph.traditional;
        const active = index === activeParagraphIndex;

        return (
          <button
            key={index}
            type="button"
            onClick={() => onToggleParagraph(index)}
            aria-pressed={active}
            className={cn(
              '-mx-2 block w-full rounded-[12px] px-2 py-1.5 text-justify indent-[2em] font-chinese text-[22px] font-bold leading-[2.05] text-ui-ink-strong outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary/35 sm:text-[24px]',
              active
                ? 'bg-brand-primary-soft text-brand-primary'
                : 'hover:bg-brand-primary-soft/60 active:bg-brand-primary-soft',
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
            ) : (
              <span className="font-chinese">{text}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
