import type { Flashcard } from '../../../../data/flashcards';
import type { DBCharacterBreakdown } from '../../../../types/database';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { StrokeOrderBox } from '../StrokeOrderBox';
import { ExtendedDefinitions } from '../ExtendedDefinitions';
import { SummaryQuickActions } from '../SummaryQuickActions';

export function V3CharacterSummary({
  character,
  data,
  courseCards,
  accentHex,
}: {
  character: string;
  data: DBCharacterBreakdown | null;
  courseCards: Flashcard[];
  accentHex?: string;
}) {
  const courseCard = courseCards[0];
  const pinyin = data?.pinyin?.[0] || courseCard?.pinyin;
  const meaning = data?.definition || courseCard?.back;

  return (
    <header className="relative isolate min-w-0 overflow-hidden rounded-feature bg-ui-surface">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 p-4 sm:gap-7 sm:p-6 lg:gap-8">
          <StrokeOrderBox char={character} size={112} accentHex={accentHex} className="shrink-0 bg-ui-canvas/55" />
          <div className="relative min-w-0 text-left">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {pinyin && <span className="truncate text-xl font-black text-brand-primary sm:text-2xl">{numberToToneMarks(pinyin)}</span>}
            </div>
            {meaning && <p className="mt-1 line-clamp-2 max-w-2xl text-sm font-bold leading-snug text-ui-ink sm:text-lg">{meaning}</p>}
            {courseCard && <p className="mt-2 text-[10px] font-extrabold text-ui-muted">B{courseCard.bookId} · L{courseCard.lessonId}</p>}
          </div>
        </div>
      <SummaryQuickActions char={character} audioSrc={data?.audio ?? undefined} />
      <ExtendedDefinitions key={character} char={character} />
    </header>
  );
}
