import { audioService } from '../../services/audioService';
import type { GrammarSceneChoice, GrammarWordToken } from '../../types/models';
import { AppIcon } from './AppIcon';
import { ContextualChineseText } from './ContextualChineseText';
import { GrammarFocusText } from './GrammarFocusText';
import { IconActionButton } from './IconActionButton';

interface GrammarInteractiveSentenceProps {
  choice: GrammarSceneChoice;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarInteractiveSentence({
  choice,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
}: GrammarInteractiveSentenceProps) {
  const sentence = characterPreference === 'simplified' && choice.simplified
    ? choice.simplified
    : choice.traditional;

  return (
    <div className="border-t border-ui-divider px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-chinese text-[26px] font-black leading-relaxed text-ui-ink-strong sm:text-[32px]">
            <ContextualChineseText
              text={sentence}
              tokens={contextTokens}
              characterPreference={characterPreference}
              onOpenWord={onOpenWord}
            />
          </p>
          {showPinyin && <p className="mt-1 text-xs font-bold leading-relaxed text-brand-primary sm:text-sm">{choice.pinyin}</p>}
          {showTranslation && <p className="mt-2 text-sm font-bold text-ui-ink sm:text-base">{choice.english}</p>}
        </div>
        <IconActionButton
          size="sm"
          variant="quiet"
          onClick={() => audioService.speakText(sentence, characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN', 0.86)}
          icon={<AppIcon name="audio" size={17} />}
          label={`Listen to ${choice.label}`}
          className="text-ui-muted hover:text-brand-primary"
        />
      </div>
      <p className="mt-4 rounded-[14px] bg-brand-primary/5 px-4 py-3 text-sm font-bold leading-6 text-ui-muted-strong">
        <GrammarFocusText
          text={choice.note}
          contextTokens={contextTokens}
          characterPreference={characterPreference}
          onOpenWord={onOpenWord}
        />
      </p>
    </div>
  );
}
