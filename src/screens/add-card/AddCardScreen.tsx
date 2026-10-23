import { motion, useReducedMotion } from 'motion/react';
import { useAddCard } from './hooks/useAddCard';
import { ActionButton, AppIcon, ScreenHeader } from '../../lib/widgets';
import { cn } from '../../utils/cn';
import { DictionaryRow } from '../search';

interface AddCardScreenProps {
  onClose: () => void;
}

/** Flex-grow shares fade over 300ms, so the entry glides between centre and top. */
const GROW = 'basis-0 min-h-0 transition-[flex-grow] duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1)] motion-reduce:transition-none';
const CARD_SIZE = 'w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] h-[min(460px,62vh)]';

/** Back-face word size by length, so long custom words still fit the card. */
function backWordSize(length: number) {
  if (length <= 2) return 'text-[68px] sm:text-[84px]';
  if (length <= 4) return 'text-[52px] sm:text-[64px]';
  return 'text-[34px] sm:text-[40px] break-words';
}

export function AddCardScreen({ onClose }: AddCardScreenProps) {
  const {
    folderName,
    folderAccent,
    view,
    cardData,
    setCardData,
    isFocused,
    setIsFocused,
    saveError,
    setSaveError,
    frontInputRef,
    meaningInputRef,
    suggestions,
    handleSelectSuggestion,
    handleNext,
    handleBack,
    handleSave,
    handleKeyDown
  } = useAddCard(onClose);

  const reduceMotion = useReducedMotion();
  const typed = cardData.front.trim();
  const hasResults = Boolean(typed) && suggestions.length > 0;
  const isBack = view === 'back';
  const otherMeanings = cardData.availableMeanings.filter(m => m !== cardData.meaning);
  const showAction = isBack ? Boolean(cardData.meaning.trim()) : Boolean(typed);

  const faceTone = isFocused ? 'border-brand-primary-edge bg-brand-primary-soft' : 'border-ui-divider bg-ui-surface hover:bg-ui-hover';
  const faceBase = 'flip-face absolute inset-0 flex cursor-text flex-col overflow-hidden rounded-feature border-[3px] border-b-[length:var(--depth-xl)] p-6 transition-colors';

  const renderFront = () => (
    <div
      inert={isBack}
      onClick={() => frontInputRef.current?.focus()}
      className={cn(faceBase, faceTone)}
    >
      {/* Spacers above and below the input share the free space while it is empty (centred) and give it to the list once results exist, so the input slides up instead of jumping. */}
      <div aria-hidden className={cn(GROW, hasResults ? 'grow-0' : 'grow')} />
      <div className="flex shrink-0 flex-col items-center gap-3">
        <input
          ref={frontInputRef}
          type="text"
          aria-label="Chinese, pinyin or English"
          value={cardData.front}
          onChange={(e) => setCardData({ ...cardData, front: e.target.value })}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => handleKeyDown(e, handleNext)}
          className="w-full bg-transparent text-center font-chinese text-[36px] font-black leading-tight text-ui-ink outline-none placeholder:font-sans placeholder:text-[25px] placeholder:text-ui-border sm:text-[44px] sm:placeholder:text-[30px]"
          placeholder="好 · hǎo · good"
          maxLength={15}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className={cn('h-2 rounded-full transition-all', isFocused ? 'w-32 bg-brand-primary' : 'w-24 bg-ui-divider')} />
      </div>
      <div aria-hidden className={cn(GROW, hasResults ? 'grow-0' : 'grow')} />

      <div className={cn(GROW, 'overflow-hidden', hasResults ? 'grow' : 'grow-0')}>
      {hasResults && (
        <motion.ul
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.1, ease: [0.2, 0.9, 0.3, 1] }}
          className="no-scrollbar mt-3.5 flex h-full flex-col overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {suggestions.slice(0, 15).map((s) => {
            const word = s.traditional || s.simplified;
            return (
              <li key={s.id}>
                <DictionaryRow
                  glyph={word}
                  pinyin={s.pinyin_accented}
                  meaning={Array.isArray(s.definitions) ? s.definitions[0] : ''}
                  onOpen={() => handleSelectSuggestion(s)}
                  ariaLabel={`Use ${word}`}
                />
              </li>
            );
          })}
        </motion.ul>
      )}
      </div>
    </div>
  );

  const renderBack = () => (
    <div
      inert={!isBack}
      onClick={() => meaningInputRef.current?.focus()}
      className={cn(faceBase, 'flip-face-back', faceTone)}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
        {cardData.pinyin && <span className="text-xl font-black tracking-wide text-brand-primary-edge">{cardData.pinyin}</span>}
        <span className={cn('font-chinese font-black leading-tight text-ui-ink-strong', backWordSize(Array.from(cardData.front).length))}>
          {cardData.front}
        </span>
        <div className="my-3 h-2 w-24 rounded-full bg-brand-primary" />
        <textarea
          ref={meaningInputRef}
          aria-label="Type meaning"
          value={cardData.meaning}
          onChange={(e) => setCardData({ ...cardData, meaning: e.target.value })}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
          className={cn(
            'w-full resize-none overflow-hidden bg-transparent text-center font-black leading-snug text-ui-ink outline-none placeholder:text-ui-border',
            cardData.meaning.length > 30 ? 'text-[20px] sm:text-[24px]' : 'text-[25px] sm:text-[30px]'
          )}
          placeholder="Meaning"
          autoComplete="off"
          rows={1}
        />
        {otherMeanings.length > 0 && (
          <div className="no-scrollbar mt-2.5 flex max-h-[96px] shrink-0 flex-wrap justify-center gap-2 overflow-y-auto">
            {otherMeanings.map((meaning) => (
              <button
                key={meaning}
                onClick={(e) => { e.stopPropagation(); setCardData({ ...cardData, meaning }); }}
                className="text-balance rounded-xs border-b-[length:var(--depth-sm)] border-ui-border bg-ui-canvas px-3 py-2 text-sm font-bold leading-tight text-ui-muted-strong transition-colors hover:border-brand-primary-edge hover:bg-brand-primary-soft hover:text-brand-primary focus-ring-inline"
              >
                {meaning}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden font-sans selection:bg-brand-primary selection:text-white overscroll-none">
      <ScreenHeader
        variant="panel"
        tone="practice"
        leftContent={(
          <span className="flex min-w-0 items-center gap-2 text-sm font-black text-ui-ink-strong sm:text-base">
            <AppIcon name="folder" size={22} className={folderAccent} />
            <span className="truncate max-w-40">{folderName}</span>
          </span>
        )}
        progress={isBack ? 100 : 50}
        onBack={isBack ? handleBack : undefined}
        onClose={isBack ? undefined : onClose}
        maxWidth="none"
      />

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-2 no-scrollbar">
        <div className="flex w-full flex-1 flex-col items-center justify-center px-4 pb-8 [perspective:1400px]">
          <p className="mb-5 text-center text-xl font-black tracking-tight text-ui-ink-strong sm:text-2xl">
            {isBack
              ? <>What does it <span className="text-brand-primary">mean</span>?</>
              : <>Type <span className="text-brand-primary">Chinese</span>, <span className="text-brand-primary">pinyin</span> or <span className="text-brand-primary">English</span></>}
          </p>
          {/* The lift sits on the wrapper: the flipping card owns `transform`. */}
          <div className={cn(CARD_SIZE, 'transition-transform duration-200', isFocused && '-translate-y-1')}>
            <div className="flip-card relative h-full w-full" data-flipped={isBack}>
              {renderFront()}
              {renderBack()}
            </div>
          </div>
        </div>
      </main>

      <footer className="pointer-events-none relative z-20 min-h-28 shrink-0 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent p-4 pt-8 md:p-6 md:pt-10">
        <div className="max-w-4xl mx-auto w-full">
          {saveError && (
            <div
              role="alert"
              className="mb-3 px-4 py-3 bg-feedback-danger/10 border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 rounded-control text-feedback-danger-edge font-bold text-sm text-center flex items-center justify-center gap-2"
            >
              <span>{saveError}</span>
              <button
                onClick={() => setSaveError(null)}
                className="ml-2 text-feedback-danger hover:text-feedback-danger-edge font-black"
                aria-label="Dismiss error"
              >
                <AppIcon name="close" size={14} />
              </button>
            </div>
          )}
          {showAction && (
            <ActionButton
              variant="primary"
              size="lg"
              fullWidth
              onClick={isBack ? handleSave : handleNext}
              className="pointer-events-auto uppercase tracking-widest text-lg"
            >
              {isBack ? 'Save card' : 'Continue'}
            </ActionButton>
          )}
        </div>
      </footer>
    </div>
  );
}
