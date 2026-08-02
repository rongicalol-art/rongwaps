import { AnimatePresence, motion } from 'motion/react';
import { AppIcon, IconButton3D, Soft3DButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { GrammarDialogue, GrammarWordToken } from '../../../types/models';
import { GrammarText, getGrammarText } from './GrammarText';

interface DialogueReferenceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dialogue: GrammarDialogue;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function DialogueReferenceDrawer({
  isOpen,
  onClose,
  dialogue,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
}: DialogueReferenceDrawerProps) {
  const playDialogue = async () => {
    for (const line of dialogue.lines) {
      await audioService.speakText(
        getGrammarText(line.text, characterPreference),
        characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN',
        0.9,
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[650]">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-ui-ink/55"
            aria-label="Close dialogue reference"
          />
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[28px] bg-ui-surface shadow-[0_-12px_40px_rgba(47,50,55,0.18)] md:inset-y-0 md:left-auto md:h-full md:max-h-none md:w-[500px] md:rounded-l-[28px] md:rounded-tr-none"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialogue-reference-title"
          >
            <header className="window-header flex shrink-0 items-center gap-3 border-b-2 border-ui-divider px-4 py-3 sm:px-6">
              <IconButton3D
                icon={<AppIcon name="close" size={20} />}
                size="sm"
                onClick={onClose}
                aria-label="Close dialogue reference"
              />
              <div className="min-w-0 flex-1">
                <h2 id="dialogue-reference-title" className="font-chinese text-lg font-black text-ui-ink-strong">
                  {dialogue.title}
                </h2>
                <p className="text-xs font-bold text-ui-muted-strong">
                  Pages {dialogue.printedPages.join('–')} · {dialogue.setting}
                </p>
              </div>
              <Soft3DButton
                type="button"
                variant="custom"
                depth="sm"
                onClick={playDialogue}
                className="w-auto rounded-[13px] border-brand-primary-edge bg-brand-primary px-3 py-2 text-xs normal-case tracking-normal text-white"
              >
                <AppIcon name="audio" size={17} />
                Listen
              </Soft3DButton>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
              {dialogue.lines.map((line, index) => (
                <article
                  key={line.id}
                  className={index % 2 === 0
                    ? 'mr-8 rounded-[20px] rounded-tl-[6px] border-b-2 border-ui-border bg-ui-canvas p-4'
                    : 'ml-8 rounded-[20px] rounded-tr-[6px] border-b-2 border-brand-primary-edge bg-[#EAF7FE] p-4'}
                >
                  <p className="mb-1 text-[11px] font-black uppercase tracking-[0.08em] text-brand-primary">{line.speaker}</p>
                  <GrammarText
                    text={line.text}
                    characterPreference={characterPreference}
                    showPinyin={showPinyin}
                    showTranslation={showTranslation}
                    contextTokens={contextTokens}
                    onOpenWord={onOpenWord}
                  />
                </article>
              ))}
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
