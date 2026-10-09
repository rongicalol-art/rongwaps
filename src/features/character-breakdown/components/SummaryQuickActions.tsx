import { AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import { useCharDictionaryEntry } from '../hooks/useCharDictionaryEntry';
import { FavoriteButton } from '../../library';

const ICON_ACTION =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-compact transition-colors focus-ring';

/**
 * Always-visible audio + save controls pinned to the top-right of the
 * breakdown summary card. Plays the packaged recording when available,
 * falling back to neural TTS.
 */
export function SummaryQuickActions({
  char,
  audioSrc,
  pinyin: shownPinyin,
  meaning: shownMeaning,
  className = 'absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5',
}: {
  char: string;
  audioSrc?: string | null;
  /** Reading and meaning the screen is showing, so Save keeps that sense instead of the first dictionary entry. */
  pinyin?: string;
  meaning?: string;
  /** Placement; defaults to pinned top-right of a card. */
  className?: string;
}) {
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
    <div className={className}>
      <button
        type="button"
        aria-label={`Hear pronunciation of ${headword}`}
        onClick={play}
        className={`${ICON_ACTION} text-ui-muted-strong transition-colors hover:bg-ui-hover hover:text-brand-primary active:scale-95`}
      >
        <AppIcon name="pronounce" size={22} />
      </button>
      <FavoriteButton
        word={headword}
        traditional={primary?.traditional}
        simplified={primary?.simplified}
        pinyin={shownPinyin || pinyinStr}
        definitions={shownMeaning || primary?.definitions}
        variant="ghost"
        size="lg"
        className="h-10 w-10 text-ui-muted-strong"
      />
    </div>
  );
}
