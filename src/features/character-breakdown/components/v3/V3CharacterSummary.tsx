import type { Flashcard } from '../../../../data/flashcards';
import type { DBCharacterBreakdown } from '../../../../types/database';
import { numberToToneMarks } from '../../../../utils/pinyin';
import { StrokeOrderBox } from '../StrokeOrderBox';
import { ExtendedDefinitions } from '../ExtendedDefinitions';
import { SummaryQuickActions } from '../SummaryQuickActions';
import { useCharDictionaryEntry } from '../../hooks/useCharDictionaryEntry';
import {
  sanitizeDictionaryDefinitions,
  isPureVariantDefinition,
  extractCedictReference,
} from '../../../../utils/dictionaryDefinitions';
import { useAppStore } from '../../../../store/useAppStore';

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
  const isReferenceDefinition = Boolean(
    data?.definition &&
    (isPureVariantDefinition(data.definition) || extractCedictReference(data.definition)),
  );
  const dictEntries = useCharDictionaryEntry((!data?.definition || isReferenceDefinition) ? character : undefined);
  const dictEntry = dictEntries[0];
  const courseCard = courseCards[0];
  const pinyin = data?.pinyin?.[0] || courseCard?.pinyin || dictEntry?.pinyin?.[0];
  const dictDef = Array.isArray(dictEntry?.definitions)
    ? dictEntry.definitions[0]
    : typeof dictEntry?.definitions === 'string'
      ? dictEntry.definitions
      : undefined;

  const rawMeaning = (isReferenceDefinition && dictDef)
    ? dictDef
    : (data?.definition || courseCard?.back || dictDef);

  const characterPreference = useAppStore((state) => state.characterPreference);
  const meaning = rawMeaning
    ? sanitizeDictionaryDefinitions(rawMeaning, { preferredScript: characterPreference }).definitions[0] || rawMeaning
    : undefined;

  return (
    <header className="relative isolate min-w-0 overflow-hidden rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface">
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
