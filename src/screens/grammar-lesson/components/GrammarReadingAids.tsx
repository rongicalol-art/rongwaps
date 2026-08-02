import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ActionButton } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

interface GrammarReadingAidsProps {
  isExpanded: boolean;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  onCharacterPreferenceChange: (preference: 'traditional' | 'simplified') => void;
  onTogglePinyin: () => void;
  onToggleTranslation: () => void;
}

export function GrammarReadingAids({
  isExpanded,
  characterPreference,
  showPinyin,
  showTranslation,
  onCharacterPreferenceChange,
  onTogglePinyin,
  onToggleTranslation,
}: GrammarReadingAidsProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {isExpanded && (
        <motion.section
          id="grammar-reading-aids"
          aria-label="Reading aids"
          initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.18 }}
          className="overflow-hidden border-t border-ui-divider bg-ui-surface"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-3 py-2.5 sm:px-6">
            <span className="mr-auto text-xs font-extrabold text-ui-muted-strong">Reading aids</span>
            <ActionButton variant="quiet" size="sm" aria-pressed={characterPreference === 'traditional'} onClick={() => onCharacterPreferenceChange('traditional')} className={cn(characterPreference === 'traditional' && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
              繁體
            </ActionButton>
            <ActionButton variant="quiet" size="sm" aria-pressed={characterPreference === 'simplified'} onClick={() => onCharacterPreferenceChange('simplified')} className={cn(characterPreference === 'simplified' && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
              简体
            </ActionButton>
            <ActionButton variant="quiet" size="sm" aria-pressed={showPinyin} onClick={onTogglePinyin} className={cn(showPinyin && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
              Pinyin {showPinyin ? 'on' : 'off'}
            </ActionButton>
            <ActionButton variant="quiet" size="sm" aria-pressed={showTranslation} onClick={onToggleTranslation} className={cn(showTranslation && 'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/15 hover:text-brand-primary')}>
              Definitions {showTranslation ? 'on' : 'off'}
            </ActionButton>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
