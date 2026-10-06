import { IconActionButton, ScreenHeader, PlayfulNavIcon } from '../../../lib/widgets';
import type { ReaderTextSize, ReadingRecord } from '../../../types/models';
import type { CharacterFont } from '../../../store/useAppStore';
import { ReaderSettingsPopover } from './ReaderSettingsPopover';

interface ReaderHeaderProps {
  reading: ReadingRecord;
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
  onOpenStudyGuide?: () => void;
  isStudyGuideOpen?: boolean;
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
  reading,
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
  onOpenStudyGuide,
  isStudyGuideOpen,
  onClose,
}: ReaderHeaderProps) {
  const isNarrative = reading.dialogueNumber === 3 || reading.title.includes('短文');

  // Reading Mode's header: a frosted canvas bar with back navigation,
  // left-anchored prominent lesson and part context, and right-anchored
  // universal-sized utility actions (Study Guide toggle + Reader settings).
  return (
    <ScreenHeader
      variant="frosted"
      tone="practice"
      onBack={onClose}
      maxWidth="none"
      controlSize="lg"
      leftContent={
        <div className="flex items-center min-w-0">
          <h1 className="truncate text-base sm:text-lg font-black uppercase tracking-normal text-ui-ink-strong">
            <span className="text-brand-primary">Lesson {reading.lessonId}</span>
            <span className="mx-1.5 text-ui-muted-strong">·</span>
            <span>{isNarrative ? 'Reading' : `Part ${reading.dialogueNumber}`}</span>
          </h1>
        </div>
      }
      rightAction={
        <div className="flex items-center gap-2">
          {onOpenStudyGuide && (
            <IconActionButton
              size="lg"
              onClick={onOpenStudyGuide}
              icon={<PlayfulNavIcon name="hint" className="h-7 w-7" />}
              label={isStudyGuideOpen ? 'Hide study guide' : 'Study guide'}
              title={isStudyGuideOpen ? 'Hide study guide' : 'Study guide'}
              aria-haspopup="dialog"
              aria-expanded={isStudyGuideOpen}
            />
          )}

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
          />
        </div>
      }
    />
  );
}
