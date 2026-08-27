import { AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useCharDictionaryEntry } from '../hooks/useCharDictionaryEntry';

const ICON_ACTION =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-4 focus-visible:ring-brand-primary/25';

/**
 * Always-visible audio + save controls pinned to the top-right of the
 * breakdown summary card. Plays the packaged recording when available,
 * falling back to neural TTS.
 */
export function SummaryQuickActions({ char, audioSrc }: { char: string; audioSrc?: string | null }) {
  const entries = useCharDictionaryEntry(char);
  const favorites = useAppStore((state) => state.favorites);
  const toggleFavorite = useAppStore((state) => state.toggleFavorite);
  const characterPreference = useAppStore((state) => state.characterPreference);

  const primary = entries[0];
  const headword = primary?.traditional || char;
  const isFav = favorites.includes(headword);
  const voice = characterPreference === 'traditional' ? 'zh-TW-HsiaoChenNeural' : 'zh-CN-XiaoxiaoNeural';

  const play = () => {
    if (audioSrc) {
      audioService.play(audioSrc).catch(() => audioService.speakNeural(headword, voice).catch(() => {}));
    } else {
      audioService.speakNeural(headword, voice).catch(() => {});
    }
  };

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
      <button
        type="button"
        aria-label={`Hear pronunciation of ${headword}`}
        onClick={play}
        className={`${ICON_ACTION} bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary-deep`}
      >
        <AppIcon name="pronounce" size={17} />
      </button>
      <button
        type="button"
        aria-label={isFav ? `Remove ${headword} from saved words` : `Save ${headword}`}
        aria-pressed={isFav}
        onClick={() => toggleFavorite(headword)}
        className={`${ICON_ACTION} ${
          isFav
            ? 'bg-brand-secondary/10 text-brand-secondary'
            : 'bg-ui-canvas text-ui-muted-strong hover:bg-ui-hover hover:text-brand-primary'
        }`}
      >
        <AppIcon name={isFav ? 'bookmarkFilled' : 'bookmark'} size={16} />
      </button>
    </div>
  );
}
