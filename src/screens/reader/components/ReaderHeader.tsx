import { AppIcon, IconActionButton, ScreenHeader } from '../../../lib/widgets';
import type { ReaderTextSize, ReadingRecord } from '../../../types/models';
import type { CharacterFont } from '../../../store/useAppStore';
import { ReaderSettingsPopover } from './ReaderSettingsPopover';

interface ReaderHeaderProps {
  textSize: ReaderTextSize;
  onTextSizeChange: (size: ReaderTextSize) => void;
  characterFont?: CharacterFont;
  onCharacterFontChange?: (font: CharacterFont) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showMeaning: boolean;
  onToggleMeaning: () => void;
  showHoverDefinitions?: boolean;
  onToggleHoverDefinitions?: () => void;
  isSlowAudio: boolean;
  onToggleSlowAudio: () => void;
  playing: boolean;
  onTogglePlay: () => void;
  /** Share of the recording played, 0–1. */
  progress: number;
  /** Dragging the progress bar: 0–1 while held, then once on release. */
  onScrub: (fraction: number) => void;
  onSeek: (fraction: number) => void;
  onClose: () => void;
}

export function getLessonTitles(
  lessonTitle?: string,
  fallbackTitle?: string
): {
  chineseTitle: string;
  englishTitle: string;
} {
  const parts = lessonTitle?.split(' · ') ?? [];
  if (parts.length >= 2) {
    return {
      chineseTitle: parts[1].trim(),
      englishTitle: parts[0].trim(),
    };
  }
  return {
    chineseTitle: lessonTitle || fallbackTitle || '',
    englishTitle: '',
  };
}

export function getReaderHeaderTitles(
  reading: ReadingRecord,
  lessonTitle?: string
): {
  chineseTitle: string;
  englishTitle: string;
} {
  const parts = reading.title.split(' · ').map((s) => s.trim());

  if (parts.length >= 3) {
    return {
      chineseTitle: parts[1],
      englishTitle: parts[2],
    };
  }

  if (parts.length === 2) {
    const isGenericTag =
      /^(對話[一二三四五]|Dialogue\s*\d|短文|Reading)/i.test(parts[0]) ||
      /^(Dialogue\s*\d|Reading)/i.test(parts[1]);
    if (!isGenericTag) {
      return {
        chineseTitle: parts[0],
        englishTitle: parts[1],
      };
    }
    if (/^(短文|Reading)/i.test(parts[0])) {
      const lessonParts = lessonTitle?.split(' · ') ?? [];
      return {
        chineseTitle: parts[1],
        englishTitle: lessonParts[0] ?? '',
      };
    }
  }

  const lessonParts = lessonTitle?.split(' · ') ?? [];
  return {
    chineseTitle: lessonParts[1] ?? reading.title,
    englishTitle: lessonParts[0] ?? '',
  };
}

export function ReaderHeader({
  textSize,
  onTextSizeChange,
  characterFont,
  onCharacterFontChange,
  showPinyin,
  onTogglePinyin,
  showMeaning,
  onToggleMeaning,
  showHoverDefinitions = true,
  onToggleHoverDefinitions,
  isSlowAudio,
  onToggleSlowAudio,
  playing,
  onTogglePlay,
  progress,
  onScrub,
  onSeek,
  onClose,
}: ReaderHeaderProps) {
  // Reading Mode's header, Duolingo-style: back, the playback progress bar as
  // the only chrome, reader settings on the right.
  return (
    <ScreenHeader
      variant="frosted"
      tone="practice"
      onBack={onClose}
      maxWidth="none"
      controlSize="lg"
      progress={progress * 100}
      onProgressScrub={onScrub}
      onProgressSeek={onSeek}
      leftContent={
        <>
          <IconActionButton
            size="lg"
            variant="primary"
            label={playing ? 'Pause dialogue' : 'Play dialogue'}
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
            icon={<AppIcon name={playing ? 'pause' : 'play'} size={22} />}
            onClick={onTogglePlay}
            className="ml-1 [--depth-sm:4px]"
          />
        </>
      }
      rightAction={
        <ReaderSettingsPopover
          size="lg"
          iconSize={25}
          textSize={textSize}
          onTextSizeChange={onTextSizeChange}
          characterFont={characterFont}
          onCharacterFontChange={onCharacterFontChange}
          showPinyin={showPinyin}
          onTogglePinyin={onTogglePinyin}
          showMeaning={showMeaning}
          onToggleMeaning={onToggleMeaning}
          showHoverDefinitions={showHoverDefinitions}
          onToggleHoverDefinitions={onToggleHoverDefinitions}
          isSlowAudio={isSlowAudio}
          onToggleSlowAudio={onToggleSlowAudio}
        />
      }
    />
  );
}
