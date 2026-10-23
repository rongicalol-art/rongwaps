import { AnimatePresence, motion } from 'motion/react';
import { useAddCard } from './hooks/useAddCard';
import { ActionButton, AppIcon, ScreenHeader } from '../../lib/widgets';

interface AddCardScreenProps {
  onClose: () => void;
}

export function AddCardScreen({ onClose }: AddCardScreenProps) {
  const {
    folderName,
    view,
    cardData,
    setCardData,
    saveError,
    setSaveError,
    saving,
    frontInputRef,
    meaningInputRef,
    suggestions,
    handleSelectSuggestion,
    handleNext,
    handleBack,
    handleSave,
    handleKeyDown,
  } = useAddCard(onClose);

  const canContinue = cardData.front.trim() !== '';
  const canSave = cardData.meaning.trim() !== '';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden font-sans selection:bg-brand-primary selection:text-white overscroll-none">
      <ScreenHeader
        variant="window"
        tone="practice"
        progress={view === 'front' ? 50 : 100}
        onClose={view === 'front' ? onClose : undefined}
        onBack={view === 'back' ? handleBack : undefined}
        maxWidth="2xl"
      />

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-6 custom-scrollbar">
        <div className="mb-2 text-center">
          <span className="text-xs font-black uppercase tracking-wider text-ui-muted">
            Adding to {folderName}
          </span>
        </div>

        <h2 className="mb-6 text-center text-2xl font-black tracking-tight text-ui-ink-strong sm:text-3xl">
          {view === 'front' ? 'Front of card' : 'Back of card'}
        </h2>

        <div className="w-full">
          <AnimatePresence mode="wait">
            {view === 'front' ? (
              <motion.div
                key="front-step"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex w-full flex-col gap-4"
              >
                {/* Tactile Card */}
                <div
                  onClick={() => frontInputRef.current?.focus()}
                  className="flex min-h-72 cursor-text flex-col items-center justify-center rounded-feature border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-8 transition-colors focus-within:border-brand-primary sm:p-10"
                >
                  <input
                    ref={frontInputRef}
                    autoFocus
                    aria-label="Character"
                    value={cardData.front}
                    onChange={(e) => setCardData({ ...cardData, front: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, handleNext)}
                    className="w-full rounded-control bg-transparent text-center font-chinese text-6xl font-bold leading-tight text-ui-ink-strong outline-none placeholder:text-ui-muted focus-ring-inline sm:text-7xl"
                    placeholder="字"
                    autoComplete="off"
                  />
                  <input
                    aria-label="Pinyin"
                    value={cardData.pinyin}
                    onChange={(e) => setCardData({ ...cardData, pinyin: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, handleNext)}
                    className="mt-3 w-full rounded-control bg-transparent text-center text-base font-black text-brand-primary outline-none placeholder:text-ui-muted focus-ring-inline sm:text-lg"
                    placeholder="pinyin"
                    autoComplete="off"
                  />
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && cardData.front.trim() && (
                  <div className="flex flex-col gap-1.5">
                    <span className="px-1 text-xs font-black uppercase tracking-wider text-ui-muted">
                      Dictionary matches
                    </span>
                    <div className="custom-scrollbar flex max-h-36 flex-col gap-1.5 overflow-y-auto">
                      {suggestions.slice(0, 3).map((item) => {
                        const def = item.definitions
                          ? Array.isArray(item.definitions)
                            ? String(item.definitions[0] ?? '')
                            : typeof item.definitions === 'string'
                            ? item.definitions
                            : String(Object.values(item.definitions)[0] ?? '')
                          : '';
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectSuggestion(item)}
                            className="focus-ring-inline flex items-center justify-between gap-2 rounded-compact border-2 border-b-[length:var(--depth-sm)] border-ui-border bg-ui-canvas px-3 py-2 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary-soft"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-chinese text-lg font-bold text-ui-ink-strong">
                                {item.traditional || item.simplified}
                              </span>
                              <span className="text-xs font-black text-brand-primary">
                                {item.pinyin_accented}
                              </span>
                            </div>
                            <span className="max-w-40 truncate text-xs font-bold text-ui-muted-strong">
                              {def}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="back-step"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="flex w-full flex-col gap-4"
              >
                {/* Tactile Card Back */}
                <div
                  onClick={() => meaningInputRef.current?.focus()}
                  className="flex min-h-72 cursor-text flex-col items-center justify-center rounded-feature border-2 border-b-[length:var(--depth-lg)] border-ui-border bg-ui-surface p-8 transition-colors focus-within:border-brand-primary sm:p-10"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-chinese text-4xl font-bold text-ui-ink-strong sm:text-5xl">
                      {cardData.front}
                    </span>
                    {cardData.pinyin && (
                      <span className="text-sm font-black text-brand-primary sm:text-base">
                        {cardData.pinyin}
                      </span>
                    )}
                  </div>

                  <div className="my-4 h-1 w-12 rounded-full bg-ui-divider" />

                  <input
                    ref={meaningInputRef}
                    autoFocus
                    aria-label="Meaning"
                    value={cardData.meaning}
                    onChange={(e) => setCardData({ ...cardData, meaning: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, handleSave)}
                    className="w-full rounded-control bg-transparent text-center text-2xl font-bold leading-tight text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline sm:text-3xl"
                    placeholder="Meaning"
                    autoComplete="off"
                  />

                  {/* Multiple definitions selector */}
                  {cardData.availableMeanings.length > 1 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                      {cardData.availableMeanings.slice(0, 3).map((def) => (
                        <button
                          key={def}
                          type="button"
                          onClick={() => setCardData({ ...cardData, meaning: def })}
                          className={`focus-ring-inline rounded-compact border px-2.5 py-1 text-xs font-bold transition-colors ${
                            cardData.meaning === def
                              ? 'border-brand-primary bg-brand-primary text-white'
                              : 'border-ui-border bg-ui-canvas text-ui-muted-strong hover:bg-ui-hover'
                          }`}
                        >
                          {def}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Memory hook / Notes field */}
                <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
                  <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">
                    Memory hook (optional)
                  </span>
                  <input
                    aria-label="Memory hook"
                    value={cardData.notes}
                    onChange={(e) => setCardData({ ...cardData, notes: e.target.value })}
                    onKeyDown={(e) => handleKeyDown(e, handleSave)}
                    placeholder="A story, a picture, a sound-alike"
                    className="w-full rounded-control bg-transparent text-sm font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* BOTTOM FIXED ACTION BAR */}
      <footer className="pointer-events-none relative z-20 shrink-0 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent p-4 md:p-6">
        <div className="mx-auto w-full max-w-lg">
          {saveError && (
            <div
              role="alert"
              className="pointer-events-auto mb-3 flex items-center justify-center gap-2 rounded-control border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 bg-feedback-danger/10 px-4 py-3 text-center text-sm font-bold text-feedback-danger-edge"
            >
              <span>{saveError}</span>
              <button
                type="button"
                onClick={() => setSaveError(null)}
                className="ml-2 font-black text-feedback-danger hover:text-feedback-danger-edge"
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
            disabled={view === 'front' ? !canContinue : !canSave}
            loading={view === 'back' && saving}
            loadingLabel="Saving card"
            className="pointer-events-auto text-lg uppercase tracking-widest"
          >
            {view === 'front' ? 'Continue' : 'Save card'}
          </ActionButton>
        </div>
      </footer>
    </div>
  );
}
