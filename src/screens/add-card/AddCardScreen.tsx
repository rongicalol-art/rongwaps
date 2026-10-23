import { useAddCard } from './hooks/useAddCard';
import { ActionButton, AppIcon, ScreenHeader } from '../../lib/widgets';

interface AddCardScreenProps {
  onClose: () => void;
}

const CARD_SIZE = 'w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] h-[min(460px,62vh)]';

export function AddCardScreen({ onClose }: AddCardScreenProps) {
  const {
    folderName,
    folderAccent,
    view,
    direction,
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

  const hasResults = view === 'front' && suggestions.length > 0;
  const cardTone = isFocused ? 'border-brand-primary-edge bg-brand-primary-soft -translate-y-1' : 'border-ui-border hover:bg-ui-hover';
  const cardBase = `${CARD_SIZE} relative bg-ui-surface rounded-feature border-b-[length:var(--depth-lg)] cursor-text flex flex-col p-6 transition-colors overflow-hidden`;
  const hint = 'mb-4 text-center text-lg font-bold text-ui-muted-strong';
  const slide = direction === 'none' ? '' : direction === 'fwd' ? 'anim-fwd' : 'anim-back';

  const renderFrontScreen = () => (
    <div key="front" className={`flex-1 flex flex-col items-center justify-center px-4 w-full h-full pb-8 ${slide}`}>
      <p className={hint}>Type Chinese, pinyin or English</p>
      <div onClick={() => frontInputRef.current?.focus()} className={`${cardBase} ${cardTone}`}>
        <div className={`flex flex-col items-center justify-center gap-3 ${hasResults ? 'shrink-0' : 'flex-1'}`}>
          <input
            ref={frontInputRef}
            type="text"
            aria-label="Chinese, pinyin or English"
            value={cardData.front}
            onChange={(e) => setCardData({ ...cardData, front: e.target.value })}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => handleKeyDown(e, handleNext)}
            className={`w-full text-center bg-transparent font-black font-chinese text-ui-ink outline-none placeholder:text-ui-border leading-tight ${
              hasResults || cardData.front.length > 5 ? 'text-[40px] sm:text-[48px]' : 'text-[64px] sm:text-[80px]'}`}
            placeholder="好"
            maxLength={15}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className={`h-2 rounded-full transition-all ${isFocused ? 'bg-brand-primary w-32' : 'bg-ui-divider w-24'}`} />
        </div>

        {hasResults && (
          <ul className="mt-4 flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col">
            {suggestions.slice(0, 15).map((s) => (
              <li key={s.id}>
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelectSuggestion(s); }}
                  className="w-full flex items-center gap-3 px-1 py-2.5 text-left border-b-2 border-ui-divider hover:bg-ui-hover rounded-xs focus-ring-inline"
                >
                  <span className="font-chinese text-[28px] font-black text-ui-ink-strong w-16 shrink-0 text-center">
                    {s.traditional || s.simplified}
                  </span>
                  <span className="flex flex-col min-w-0 flex-1">
                    <span className="text-[15px] font-black text-brand-primary-edge leading-tight">{s.pinyin_accented}</span>
                    <span className="text-[14px] font-bold text-ui-muted-strong truncate leading-tight">
                      {Array.isArray(s.definitions) ? s.definitions[0] : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const otherMeanings = cardData.availableMeanings.filter(m => m !== cardData.meaning);

  const renderBackScreen = () => (
    <div key="back" className={`flex-1 flex flex-col items-center justify-center px-4 w-full h-full pb-8 ${slide}`}>
      <p className={hint}>What does it mean?</p>
      <div onClick={() => meaningInputRef.current?.focus()} className={`${cardBase} ${cardTone}`}>
        <div className="flex items-baseline gap-2 self-start bg-ui-surface px-3 py-1.5 rounded-xs border-2 border-b-[length:var(--depth-sm)] border-ui-border">
          <span className="text-xl text-brand-primary font-chinese font-bold leading-none">{cardData.front}</span>
          {cardData.pinyin && <span className="text-sm font-black text-brand-primary-edge">{cardData.pinyin}</span>}
        </div>

        <div className="flex-1 flex items-center justify-center w-full">
          <textarea
            ref={meaningInputRef}
            aria-label="Type meaning"
            value={cardData.meaning}
            onChange={(e) => setCardData({ ...cardData, meaning: e.target.value })}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
            className={`w-full text-center bg-transparent font-black text-ui-ink outline-none placeholder:text-ui-border resize-none overflow-hidden py-2 leading-snug ${
              cardData.meaning.length > 30 ? 'text-[24px] sm:text-[32px]' : cardData.meaning.length > 15 ? 'text-[32px] sm:text-[40px]' : 'text-[40px] sm:text-[52px]'}`}
            placeholder="Meaning"
            autoComplete="off"
            rows={1}
          />
        </div>

        {otherMeanings.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 max-h-[96px] overflow-y-auto no-scrollbar shrink-0">
            {otherMeanings.map((meaning) => (
              <button
                key={meaning}
                onClick={(e) => { e.stopPropagation(); setCardData({ ...cardData, meaning }); }}
                className="px-3 py-2 bg-ui-canvas border-b-[length:var(--depth-sm)] border-ui-border text-ui-muted-strong hover:text-brand-primary hover:border-brand-primary-edge hover:bg-brand-primary-soft font-bold rounded-xs text-sm transition-colors leading-tight text-balance focus-ring-inline"
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
        progress={view === 'front' ? 50 : 100}
        onBack={view === 'back' ? handleBack : undefined}
        onClose={view === 'front' ? onClose : undefined}
        maxWidth="none"
      />

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-2 no-scrollbar">
        {view === 'front' ? renderFrontScreen() : renderBackScreen()}
      </main>

      <footer className="pointer-events-none relative z-20 shrink-0 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent p-4 pt-8 md:p-6 md:pt-10">
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
          <ActionButton
            variant="primary"
            size="lg"
            fullWidth
            onClick={view === 'front' ? handleNext : handleSave}
            disabled={view === 'front' ? !cardData.front.trim() : !cardData.meaning.trim()}
            className="pointer-events-auto uppercase tracking-widest text-lg"
          >
            {view === 'front' ? 'CONTINUE' : 'SAVE CARD'}
          </ActionButton>
        </div>
      </footer>
    </div>
  );
}
