import { motion, AnimatePresence } from 'motion/react';
import { useAddCard } from './hooks/useAddCard';
import { ActionButton, AppIcon, IconActionButton, ScreenHeader } from '../../lib/widgets';

interface AddCardScreenProps {
  onClose: () => void;
}

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

  const renderFrontScreen = () => (
    <div key="front" className={`flex-1 flex flex-col items-center justify-center px-4 w-full h-full pb-8 ${direction === 'none' ? '' : direction === 'fwd' ? 'anim-fwd' : 'anim-back'}`}>
      <div className="mb-4 text-center sm:text-left w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ui-ink tracking-tight">Type character</h2>
        <p className="text-ui-muted font-bold mt-2 text-lg">Front face of your card</p>
      </div>

      <div className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] relative pointer-events-auto flex flex-col justify-center">
        <motion.div 
          onClick={() => frontInputRef.current?.focus()}
          className={`w-full relative min-h-[380px] sm:min-h-[420px] bg-ui-surface rounded-feature border-b-[length:var(--depth-lg)] cursor-text flex flex-col items-center justify-center p-6 sm:p-8 pb-8 transition-colors overflow-hidden
            ${!cardData.front && !isFocused ? 'anim-float' : ''}
            ${isFocused ? 'border-brand-primary-edge bg-brand-primary-soft -translate-y-1' : 'border-ui-divider hover:bg-ui-hover'}`}
        >
          <motion.div className={`absolute top-6 left-6 transition-colors ${isFocused ? 'text-brand-primary' : 'text-ui-muted'}`}>
            <AppIcon name="typeText" size={26} />
          </motion.div>

          <motion.div className="flex-1 flex flex-col items-center justify-center w-full relative pt-4 pb-2">
            <input
              ref={frontInputRef}
              type="text"
              aria-label="Type character"
              value={cardData.front}
              onChange={(e) => setCardData({...cardData, front: e.target.value})}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => handleKeyDown(e, handleNext)}
              className={`w-full text-center bg-transparent font-black font-chinese text-ui-ink outline-none placeholder:text-ui-muted transition-all duration-300 leading-tight ${
                cardData.front.length > 5 ? 'text-[40px] sm:text-[50px]' : 'text-[60px] sm:text-[80px]'}`}
              placeholder="好"
              maxLength={15}
              autoComplete="off"
            />
            <motion.div className={`h-2 rounded-full mt-4 transition-all duration-300 ${isFocused ? 'bg-brand-primary w-32' : 'bg-ui-divider w-16'} ${cardData.front.length > 0 ? 'hidden' : 'opacity-100 scale-x-100'}`} />
          </motion.div>

          <AnimatePresence>
            {suggestions.length > 0 && view === 'front' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex gap-2 flex-col pt-4 mt-auto overflow-hidden shrink-0"
              >
                <div className="w-full flex items-center gap-2 mb-2">
                  <div className="h-[3px] flex-1 bg-ui-divider rounded-full"></div>
                  <div className="text-[10px] sm:text-xs font-bold text-ui-muted uppercase tracking-wider text-center px-1">Suggestions</div>
                  <div className="h-[3px] flex-1 bg-ui-divider rounded-full"></div>
                </div>
                <div className="flex flex-col w-full gap-2 max-h-[160px] sm:max-h-[200px] overflow-y-auto hide-scrollbar pb-2 px-1">
                  {suggestions.slice(0, 15).map((s, i) => (
                    <motion.button 
                      key={i} 
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => { e.stopPropagation(); handleSelectSuggestion(s); }}
                      className="w-full flex items-center text-left px-3 py-2 sm:px-4 sm:py-3 bg-ui-canvas rounded-control border-b-[length:var(--depth-sm)] border-ui-divider hover:border-brand-primary-edge hover:bg-brand-primary-soft transition-colors group shrink-0"
                    >
                      <span className="font-chinese text-[22px] sm:text-[28px] font-black text-ui-ink group-hover:text-brand-primary transition-colors shrink-0 w-12 sm:w-16 text-center">
                        {s.traditional || s.simplified}
                      </span>
                      <div className="flex flex-col ml-2 overflow-hidden flex-1 justify-center">
                        <span className="text-[12px] sm:text-[14px] font-bold text-ui-muted group-hover:text-brand-primary leading-none mb-1 mt-1 transition-colors">
                          {s.pinyin_accented || s.simplified}
                        </span>
                        <span className="text-[11px] sm:text-[13px] text-ui-muted truncate font-medium leading-none">
                          {s.definitions && Array.isArray(s.definitions) ? s.definitions[0] : ''}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );

  const renderBackScreen = () => (
    <div key="back" className={`flex-1 flex flex-col items-center justify-center px-4 w-full h-full pb-8 ${direction === 'none' ? '' : direction === 'fwd' ? 'anim-fwd' : 'anim-back'}`}>
      <div className="mb-4 text-center sm:text-left w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ui-ink tracking-tight">Type meaning</h2>
        <p className="text-ui-muted font-bold mt-2 text-lg">Back face of your card</p>
      </div>

      <div className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] relative pointer-events-auto flex flex-col justify-center">
        <motion.div 
          onClick={() => meaningInputRef.current?.focus()}
          className={`w-full relative min-h-[380px] sm:min-h-[420px] bg-ui-surface rounded-feature border-b-[length:var(--depth-lg)] cursor-text flex flex-col items-center justify-center p-6 sm:p-8 pb-8 transition-colors
            ${isFocused ? 'border-brand-primary-edge bg-brand-primary-soft -translate-y-1' : 'border-ui-divider hover:bg-ui-hover'}`}
        >
          <motion.div className="absolute -top-5 left-6 flex items-center gap-2 text-ui-muted font-bold text-sm bg-ui-surface px-4 py-2 rounded-control border-b-[length:var(--depth-sm)] border-ui-divider spring-transition hover:-translate-y-0.5">
            <span className="opacity-70 uppercase text-xs tracking-wider">Front</span>
            <span className="text-xl text-brand-primary font-chinese">{cardData.front}</span>
          </motion.div>

          <motion.div className="flex-1 flex flex-col items-center justify-center w-full relative pt-4 pb-2">
            <textarea
              ref={meaningInputRef}
              aria-label="Type meaning"
              value={cardData.meaning}
              onChange={(e) => {
                setCardData({...cardData, meaning: e.target.value});
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
              className={`w-full text-center bg-transparent font-black text-ui-ink outline-none placeholder:text-ui-muted resize-none overflow-hidden py-2 leading-snug ${
                cardData.meaning.length > 30 ? 'text-[24px] sm:text-[32px]' : cardData.meaning.length > 15 ? 'text-[32px] sm:text-[44px]' : 'text-[40px] sm:text-[60px]'}`}
              placeholder="Meaning"
              autoComplete="off"
              rows={1}
            />
            <motion.div className={`h-2 rounded-full mt-2 transition-all duration-300 ${isFocused ? 'bg-brand-primary w-48' : 'bg-ui-divider w-24'} ${cardData.meaning.length > 0 ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`} />
          </motion.div>

          <AnimatePresence>
            {cardData.availableMeanings.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full flex gap-2 flex-col pt-4 overflow-hidden shrink-0 mt-auto"
              >
                <div className="w-full flex items-center gap-2 mb-2">
                  <div className="h-[3px] flex-1 bg-ui-divider rounded-full"></div>
                  <div className="text-[10px] sm:text-xs font-bold text-ui-muted uppercase tracking-wider text-center px-1">Suggestions</div>
                  <div className="h-[3px] flex-1 bg-ui-divider rounded-full"></div>
                </div>
                <div className="flex flex-col gap-2 px-2 pb-4 pt-1 max-h-[140px] sm:max-h-[160px] overflow-y-auto hide-scrollbar w-full">
                  <AnimatePresence>
                    {cardData.availableMeanings.filter(m => m !== cardData.meaning).map((meaning) => (
                      <motion.button 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        key={meaning} 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.stopPropagation(); setCardData({...cardData, meaning}); }}
                        className="w-full text-center px-4 py-3 bg-ui-canvas border-b-[length:var(--depth-sm)] border-ui-divider text-ui-muted hover:text-brand-primary hover:border-brand-primary-edge hover:bg-brand-primary-soft font-bold rounded-control text-xs sm:text-sm transition-colors leading-tight shrink-0 whitespace-normal text-balance"
                      >
                        {meaning}
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ui-practice-canvas font-sans selection:bg-brand-primary selection:text-white overscroll-none">
      <ScreenHeader
        onBack={view === 'back' ? handleBack : undefined}
        onClose={view === 'front' ? onClose : undefined}
        maxWidth="none"
        centerContent={(
          <div className="flex w-full flex-col items-center gap-2">
            <span className="font-bold text-ui-muted uppercase tracking-widest text-[10px] md:text-xs">
              Adding to <span className={folderAccent}>{folderName}</span>
            </span>
            <div className="w-full h-3 md:h-4 bg-ui-divider rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-primary rounded-full spring-transition relative"
                style={{ width: view === 'front' ? '50%' : '100%' }}
              >
                <div className="absolute top-1 left-2 right-2 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        )}
        rightAction={(
          <IconActionButton
            disabled
            label="Card settings coming soon"
            icon={<AppIcon name="settings" size={25} />}
          />
        )}
        className="relative z-20 border-b-0 bg-transparent shadow-none"
      />

      {/* MAIN CONTENT AREA */}
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto p-2 hide-scrollbar">
        {view === 'front' ? renderFrontScreen() : renderBackScreen()}
      </main>

      {/* BOTTOM FIXED ACTION BAR */}
      <footer className="pointer-events-none relative z-20 shrink-0 bg-gradient-to-t from-ui-practice-canvas via-ui-practice-canvas/95 to-transparent p-4 pt-8 md:p-6 md:pt-10">
          <div className="max-w-4xl mx-auto w-full">
            {saveError && (
              <div className="mb-3 px-4 py-3 bg-feedback-danger/10 border-b-[length:var(--depth-sm)] border-feedback-danger-edge/30 rounded-control text-feedback-danger-edge font-bold text-sm text-center flex items-center justify-center gap-2">
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
