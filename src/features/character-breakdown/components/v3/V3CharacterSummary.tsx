import type { Flashcard } from '../../../../data/flashcards';
import type { DBCharacterBreakdown } from '../../../../types/database';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import { CharacterHeroPanel } from './CharacterHeroPanel';
import { useExtendedDefinitions } from '../ExtendedDefinitions';
import { HeroDetails } from '../HeroDetails';
import { SummaryQuickActions } from '../SummaryQuickActions';
import { useCharDictionaryEntry } from '../../hooks/useCharDictionaryEntry';
import {
  sanitizeDictionaryDefinitions,
  isPureVariantDefinition,
  extractCedictReference,
} from '../../../../utils/vocabulary/dictionaryDefinitions';
import { useAppStore } from '../../../../store/useAppStore';
import { usePrimaryReading, useReadings } from '../../../../hooks/usePronunciation';
import { useLevel } from '../../../../hooks/useLevels';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { readingHeadline, type EntryReading, type WordEntry } from '../../../../utils/vocabulary/wordEntry';
import { AlsoReadings } from '../AlsoReadings';

export function V3CharacterSummary({
  character,
  data,
  courseCards,
  accentHex,
  entry,
  lead,
  onSelectReading,
}: {
  character: string;
  data: DBCharacterBreakdown | null;
  courseCards: Flashcard[];
  accentHex?: string;
  /** The dictionary entry; when loaded, pinyin, meaning and lesson come from its `lead` reading. */
  entry?: WordEntry | null;
  lead?: EntryReading;
  onSelectReading?: (key: string) => void;
}) {
  const isReferenceDefinition = Boolean(
    data?.definition &&
    (isPureVariantDefinition(data.definition) || extractCedictReference(data.definition)),
  );
  const dictEntries = useCharDictionaryEntry(!lead && (!data?.definition || isReferenceDefinition) ? character : undefined);
  const dictEntry = dictEntries[0];
  const courseCard = lead ? lead.cards[0] : courseCards[0];
  const indexedPinyin = usePrimaryReading(character, data?.pinyin?.[0] || courseCard?.pinyin || dictEntry?.pinyin?.[0]);
  const pinyin = lead?.pinyin || indexedPinyin;
  // Other readings, pinyin only (誰 also shuí; 大 also dài).
  const indexedOtherReadings = useReadings(character).slice(1, 4);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const dictDef = Array.isArray(dictEntry?.definitions)
    ? dictEntry.definitions[0]
    : typeof dictEntry?.definitions === 'string'
      ? dictEntry.definitions
      : undefined;

  const rawMeaning = (isReferenceDefinition && dictDef)
    ? dictDef
    : (data?.definition || courseCard?.back || dictDef);

  const characterPreference = useAppStore((state) => state.characterPreference);
  const wordLevel = useLevel(character);
  // The word's level belongs to its main reading (長 cháng), not to every reading.
  const level = lead && entry && entry.readings[0] !== lead ? null : wordLevel;
  const meaning = lead
    ? readingHeadline(lead, simpleDefinitions) || undefined
    : rawMeaning
      ? sanitizeDictionaryDefinitions(rawMeaning, { preferredScript: characterPreference }).definitions[0] || rawMeaning
      : undefined;

  // With an entry every sense is listed below the hero, so no "more definitions" toggle.
  const more = useExtendedDefinitions(lead ? undefined : character);
  const wide = useMediaQuery('(min-width: 640px)');
  const actions = { char: character, pinyin: pinyin ? numberToToneMarks(pinyin) : undefined, meaning };

  return (
    <header className="min-w-0">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:gap-6">
        <CharacterHeroPanel character={character} accentHex={accentHex} />
        <div className="flex min-w-0 max-w-full flex-col items-start gap-1.5 text-left">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {pinyin && <span className="truncate text-2xl font-black sm:text-[26px] leading-tight text-brand-primary-text">{numberToToneMarks(pinyin)}</span>}
            {entry && lead ? (
              <AlsoReadings readings={entry.readings} lead={lead} onSelect={onSelectReading} />
            ) : indexedOtherReadings.length > 0 && (
              <span className="text-xs font-bold text-ui-muted sm:text-sm">
                also{' '}
                {indexedOtherReadings.map((reading, index) => (
                  <span key={reading.pinyin}>
                    {index > 0 && ' · '}
                    <span className="text-brand-primary">{reading.pinyin}</span>
                  </span>
                ))}
              </span>
            )}
            {!wide && (
              <SummaryQuickActions className="ml-0.5 flex items-center [&>button]:h-8 [&>button]:w-8" {...actions} />
            )}
          </div>
          <HeroDetails subject={character} meaning={meaning} more={more} wide={wide} courseCard={courseCard} level={level} actions={actions} />
        </div>
      </div>
    </header>
  );
}
