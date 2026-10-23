import { useAddCard } from './hooks/useAddCard';
import { ActionButton, AppIcon, ScreenHeader } from '../../lib/widgets';

interface AddCardScreenProps {
  onClose: () => void;
}

export function AddCardScreen({ onClose }: AddCardScreenProps) {
  const {
    folderName,
    cardData,
    setCardData,
    saveError,
    setSaveError,
    saving,
    frontInputRef,
    suggestions,
    handleSelectSuggestion,
    handleSave,
    handleKeyDown,
  } = useAddCard(onClose);

  const canSave = cardData.front.trim() !== '' && cardData.meaning.trim() !== '';

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden font-sans selection:bg-brand-primary selection:text-white overscroll-none">
      <ScreenHeader
        variant="panel"
        tone="practice"
        onClose={onClose}
        title={`Add card to ${folderName}`}
        maxWidth="none"
      />

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center overflow-x-hidden overflow-y-auto px-4 py-6 custom-scrollbar">
        <div className="flex flex-col gap-3.5">
          {/* Word field */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Word</span>
            <input
              ref={frontInputRef}
              autoFocus
              aria-label="Word"
              value={cardData.front}
              onChange={(e) => setCardData({ ...cardData, front: e.target.value })}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent font-chinese text-3xl font-bold leading-tight text-ui-ink-strong outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
              placeholder="字"
              autoComplete="off"
            />
          </div>

          {/* Dictionary Suggestions */}
          {suggestions.length > 0 && cardData.front.trim() && (
            <div className="flex flex-col gap-1.5 -mt-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-ui-muted px-1">
                Dictionary matches
              </span>
              <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {suggestions.slice(0, 4).map((item) => {
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
                      className="flex items-center justify-between gap-2 rounded-compact border-2 border-b-[length:var(--depth-sm)] border-ui-border bg-ui-canvas px-3 py-2 text-left transition-colors hover:border-brand-primary hover:bg-brand-primary-soft focus-ring-inline"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-chinese text-lg font-bold text-ui-ink-strong">
                          {item.traditional || item.simplified}
                        </span>
                        <span className="text-xs font-black text-brand-primary">
                          {item.pinyin_accented}
                        </span>
                      </div>
                      <span className="truncate text-xs font-bold text-ui-muted-strong max-w-[140px]">
                        {def}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pinyin field */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Pinyin</span>
            <input
              aria-label="Pinyin"
              value={cardData.pinyin}
              onChange={(e) => setCardData({ ...cardData, pinyin: e.target.value })}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-base font-black text-brand-primary outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
              placeholder="pinyin"
              autoComplete="off"
            />
          </div>

          {/* Meaning field */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Meaning</span>
            <input
              aria-label="Meaning"
              value={cardData.meaning}
              onChange={(e) => setCardData({ ...cardData, meaning: e.target.value })}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-base font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
              placeholder="meaning"
              autoComplete="off"
            />
          </div>

          {/* Memory hook / Notes */}
          <div className="flex flex-col rounded-control border-2 border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface px-4 py-2.5 transition-colors focus-within:border-brand-primary focus-within:bg-brand-primary-soft">
            <span className="text-xs font-black uppercase tracking-wider text-ui-muted-strong">Memory hook</span>
            <textarea
              aria-label="Memory hook"
              rows={2}
              value={cardData.notes}
              onChange={(e) => setCardData({ ...cardData, notes: e.target.value })}
              placeholder="A story, a picture, a sound-alike"
              className="w-full resize-none bg-transparent text-sm font-bold text-ui-ink outline-none placeholder:text-ui-muted focus-ring-inline rounded-control"
            />
          </div>
        </div>
      </main>

      {/* BOTTOM FIXED ACTION BAR */}
      <footer className="pointer-events-none relative z-20 shrink-0 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent p-4 md:p-6">
        <div className="max-w-md mx-auto w-full">
          {saveError && (
            <div
              role="alert"
              className="mb-3 px-4 py-3 bg-feedback-danger/10 border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 rounded-control text-feedback-danger-edge font-bold text-sm text-center flex items-center justify-center gap-2 pointer-events-auto"
            >
              <span>{saveError}</span>
              <button
                type="button"
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
            onClick={() => void handleSave()}
            disabled={!canSave}
            loading={saving}
            loadingLabel="Adding card"
            className="pointer-events-auto uppercase tracking-widest text-lg"
          >
            Add card
          </ActionButton>
        </div>
      </footer>
    </div>
  );
}
