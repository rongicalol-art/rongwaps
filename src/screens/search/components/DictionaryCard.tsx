import { memo, useMemo } from 'react';
import { AppIcon, LevelTag, SpeakerIcon } from '../../../lib/widgets';
import { useAudioPending } from '../../../hooks/useAudioPending';
import { useLevels } from '../../../hooks/useLevels';
import { resolveLevel } from '../../../utils/lesson/levels';
import { FavoriteButton } from '../../../features/library';
import { audioService } from '../../../services/audioService';
import type { DictionaryListEntry } from '../../../types/models';
import { DictionaryRow } from './DictionaryRow';

interface DictionaryCardProps {
  entry: DictionaryListEntry;
  onOpen: (word: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (word: string) => void;
}

function formatDefinitions(definitions: DictionaryListEntry['definitions']): string {
  if (typeof definitions === 'string') return definitions;
  if (Array.isArray(definitions)) return definitions.join(' • ');
  return Object.values(definitions).join(' • ');
}

export const DictionaryCard = memo(function DictionaryCard({
  entry,
  onOpen,
}: DictionaryCardProps) {
  const levels = useLevels();
  const speaker = useAudioPending();
  const level = useMemo(() => resolveLevel(entry.traditional, levels), [entry.traditional, levels]);
  const meaning = formatDefinitions(entry.definitions);
  const canPlayAudio = Boolean(entry.audio && audioService.isAudioFileName(entry.audio));

  return (
    <DictionaryRow
      glyph={entry.traditional}
      pinyin={entry.pinyin_accented}
      meaning={meaning}
      pos={entry.pos}
      onOpen={() => onOpen(entry.traditional)}
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
            pinyin={entry.pinyin_accented || undefined}
            definitions={entry.definitions}
            size="lg"
            variant="ghost"
          />
        </div>
      )}
    />
  );
});
