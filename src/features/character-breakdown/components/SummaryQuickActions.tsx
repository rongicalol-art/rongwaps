import { AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useCharDictionaryEntry } from '../hooks/useCharDictionaryEntry';
import { FavoriteButton } from '../../library';

const ICON_ACTION =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors focus-ring';

/**
 * Always-visible audio + save controls pinned to the top-right of the
 * breakdown summary card. Plays the packaged recording when available,
 * falling back to neural TTS.
 */
export function SummaryQuickActions({ char, audioSrc }: { char: string; audioSrc?: string | null }) {
  const entries = useCharDictionaryEntry(char);
  const characterPreference = useAppStore((state) => state.characterPreference);

  const primary = entries[0];
  const headword = primary?.traditional || char;
  const voice = characterPreference === 'traditional' ? 'zh-TW-HsiaoChenNeural' : 'zh-CN-XiaoxiaoNeural';

  const play = () => {
    if (audioSrc) {
      audioService.play(audioSrc).catch(() => audioService.speakNeural(headword, voice).catch(() => {}));
    } else {
      audioService.speakNeural(headword, voice).catch(() => {});
    }
  };

  const pinyinStr = primary?.pinyin
    ? Array.isArray(primary.pinyin)
      ? primary.pinyin.join(' ')
      : primary.pinyin
    : undefined;

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
      <button
        type="button"
        aria-label={`Hear pronunciation of ${headword}`}
        onClick={play}
        className={`${ICON_ACTION} text-ui-muted transition-colors hover:text-brand-primary active:scale-95`}
      >
        <AppIcon name="pronounce" size={18} />
      </button>
      <FavoriteButton
        word={headword}
        traditional={primary?.traditional}
        simplified={primary?.simplified}
        pinyin={pinyinStr}
        definitions={primary?.definitions}
        variant="ghost"
        size="md"
      />
    </div>
  );
}
