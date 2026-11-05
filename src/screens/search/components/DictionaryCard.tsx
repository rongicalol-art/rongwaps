import { memo, useMemo } from 'react';
import { AppIcon, LevelTag, SpeakerIcon } from '../../../lib/widgets';
import { useAudioPending } from '../../../hooks/useAudioPending';
import { useLevels } from '../../../hooks/useLevels';
import { resolveLevel } from '../../../utils/lesson/levels';
import { FavoriteButton } from '../../../features/library';
import { audioService } from '../../../services/audioService';
import type { DictionaryListEntry } from '../../../types/models';
import { useAppStore } from '../../../store/useAppStore';
import { readingKey, searchRowMeaning } from '../../../utils/vocabulary/wordEntry';
import { usePronunciation } from '../../../hooks/usePronunciation';
import { allReadings } from '../../../utils/pinyin/pronunciation';
import { DictionaryRow } from './DictionaryRow';

interface DictionaryCardProps {
  entry: DictionaryListEntry;
  /** Opens the word at this row's reading, so the page shows what the row showed. */
  onOpen: (word: string, reading?: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (word: string) => void;
}

export const DictionaryCard = memo(function DictionaryCard({
  entry,
  onOpen,
}: DictionaryCardProps) {
  const levels = useLevels();
  const speaker = useAudioPending();
  // A word's level belongs to its main reading: 和 is Novice as hé "and", not as hè "to compose a poem in reply".
  const readings = usePronunciation();
  const mainReading = Array.from(entry.traditional).length === 1 ? allReadings(entry.traditional, readings)[0]?.pinyin : undefined;
  const otherReading = entry.bookId === undefined && Boolean(mainReading) && readingKey(mainReading) !== readingKey(entry.pinyin_accented);
  const level = useMemo(() => (otherReading ? null : resolveLevel(entry.traditional, levels)), [entry.traditional, levels, otherReading]);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const meaning = searchRowMeaning(entry, simpleDefinitions);
  const pinyin = entry.coursePinyin || entry.pinyin_accented;
  const canPlayAudio = Boolean(entry.audio && audioService.isAudioFileName(entry.audio));

  return (
    <DictionaryRow
      glyph={entry.traditional}
      pinyin={pinyin}
      meaning={meaning}
      pos={entry.pos}
      onOpen={() => onOpen(entry.traditional, entry.pinyin_accented || undefined)}
      ariaLabel={`Open ${entry.traditional}: ${meaning}`}
      trailing={<LevelTag bookId={entry.bookId ?? undefined} lessonId={entry.lessonId ?? undefined} level={level} />}
      action={(
        <div className="flex items-center gap-0.5">
          {canPlayAudio && (
            <button
              type="button"
              aria-label={`Hear pronunciation of ${entry.traditional}`}
              onClick={() => {
                if (!entry.audio) return;
                audioService.stop();
                speaker.claim();
                void audioService.play(entry.audio, undefined, undefined, undefined, 0, { fallback: 'none' }).catch(() => undefined);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-compact text-ui-muted transition-colors hover:bg-ui-hover hover:text-brand-primary active:scale-95 focus-ring"
            >
              {speaker.status() ? <SpeakerIcon status={speaker.status()} size={20} /> : <AppIcon name="pronounce" size={20} />}
            </button>
          )}
          <FavoriteButton
            word={entry.traditional}
            traditional={entry.traditional}
            simplified={entry.simplified}
            pinyin={pinyin || undefined}
            definitions={meaning || entry.definitions}
            size="lg"
            variant="ghost"
          />
        </div>
      )}
    />
  );
});
