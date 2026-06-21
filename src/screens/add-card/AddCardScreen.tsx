import { motion, AnimatePresence } from 'motion/react';
import { PiXBold, PiGearBold, PiTextTBold, PiArrowLeftBold } from 'react-icons/pi';
import { useAddCard } from './hooks/useAddCard';

interface AddCardScreenProps {
  onClose: () => void;
}

export function AddCardScreen({ onClose }: AddCardScreenProps) {
  const {
    folderName,
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

  const customStyles = `
    @keyframes slideInFwd {
      0% { transform: translateX(50px) scale(0.95); opacity: 0; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes slideInBack {
      0% { transform: translateX(-50px) scale(0.95); opacity: 0; }
      100% { transform: translateX(0) scale(1); opacity: 1; }
    }
    @keyframes popIn {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.1); opacity: 1; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
    
    .anim-fwd { animation: slideInFwd 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .anim-back { animation: slideInBack 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .anim-pop { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
    .anim-float { animation: float 3s ease-in-out infinite; }
    .spring-transition { transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  `;

  const renderFrontScreen = () => (
    <div key="front" className={`flex-1 flex flex-col items-center justify-center px-4 w-full h-full pb-8 ${direction === 'none' ? '' : direction === 'fwd' ? 'anim-fwd' : 'anim-back'}`}>
      <div className="mb-4 text-center sm:text-left w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px]">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4B4B4B] tracking-tight">Type character</h2>
        <p className="text-[#AFAFAF] font-bold mt-2 text-lg">Front face of your card</p>
      </div>

      <div className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] relative pointer-events-auto flex flex-col justify-center">
        <motion.div 
          onClick={() => frontInputRef.current?.focus()}
          className={`w-full relative min-h-[380px] sm:min-h-[420px] bg-white rounded-[32px] border-[3px] border-b-[8px] cursor-text flex flex-col items-center justify-center p-6 sm:p-8 pb-8 transition-colors overflow-hidden
            ${!cardData.front && !isFocused ? 'anim-float' : ''}
            ${isFocused ? 'border-[#1CB0F6] shadow-[0_8px_24px_rgba(28,176,246,0.25)] bg-[#F2F9FF] -translate-y-2' : 'border-[#E5E5E5] hover:border-[#AFB6BB] hover:bg-[#F7F7F7]'}`}
        >
          <motion.div className={`absolute top-6 left-6 transition-colors ${isFocused ? 'text-[#1CB0F6]' : 'text-[#AFB6BB]'}`}>
            <PiTextTBold size={28} />
          </motion.div>

          <motion.div className="flex-1 flex flex-col items-center justify-center w-full relative pt-4 pb-2">
            <input
              ref={frontInputRef}
              type="text"
              value={cardData.front}
              onChange={(e) => setCardData({...cardData, front: e.target.value})}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => handleKeyDown(e, handleNext)}
              className={`w-full text-center bg-transparent font-black font-chinese text-[#4B4B4B] outline-none placeholder:text-[#AFB6BB] transition-all duration-300 leading-tight ${
                cardData.front.length > 5 ? 'text-[40px] sm:text-[50px]' : 'text-[60px] sm:text-[80px]'}`}
              placeholder="好"
              maxLength={15}
              autoComplete="off"
            />
            <motion.div className={`h-2 rounded-full mt-4 transition-all duration-300 ${isFocused ? 'bg-[#1CB0F6] w-32' : 'bg-[#E5E5E5] w-16'} ${cardData.front.length > 0 ? 'hidden' : 'opacity-100 scale-x-100'}`} />
          </motion.div>

          <AnimatePresence>
            {suggestions.length > 0 && view === 'front' && (
              <motion.div 
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full flex gap-2 flex-col pt-4 mt-auto overflow-hidden shrink-0"
              >
                <div className="w-full flex items-center gap-2 mb-2">
                  <div className="h-[3px] flex-1 bg-[#E5E5E5] rounded-full"></div>
                  <div className="text-[10px] sm:text-xs font-bold text-[#AFB6BB] uppercase tracking-wider text-center px-1">Suggestions</div>
                  <div className="h-[3px] flex-1 bg-[#E5E5E5] rounded-full"></div>
                </div>
                <div className="flex flex-col w-full gap-2 max-h-[160px] sm:max-h-[200px] overflow-y-auto hide-scrollbar pb-2 px-1">
                  {suggestions.slice(0, 15).map((s, i) => (
                    <motion.button 
                      key={i} 
                      whileHover={{ scale: 1.02, x: 2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={(e) => { e.stopPropagation(); handleSelectSuggestion(s); }}
                      className="w-full flex items-center text-left px-3 py-2 sm:px-4 sm:py-3 bg-[#F7F7F7] rounded-[16px] border-[2px] border-[#E5E5E5] border-b-[4px] hover:border-[#1CB0F6] hover:bg-[#F2F9FF] transition-colors group shrink-0"
                    >
                      <span className="font-chinese text-[22px] sm:text-[28px] font-black text-[#4B4B4B] group-hover:text-[#1CB0F6] transition-colors shrink-0 w-12 sm:w-16 text-center">
                        {s.traditional || s.simplified}
                      </span>
                      <div className="flex flex-col ml-2 overflow-hidden flex-1 justify-center">
                        <span className="text-[12px] sm:text-[14px] font-bold text-[#AFAFAF] group-hover:text-[#1CB0F6] leading-none mb-1 mt-1 transition-colors">
                          {s.pinyin_accented || s.simplified}
                        </span>
                        <span className="text-[11px] sm:text-[13px] text-[#AFB6BB] truncate font-medium leading-none">
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
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#4B4B4B] tracking-tight">Type meaning</h2>
        <p className="text-[#AFAFAF] font-bold mt-2 text-lg">Back face of your card</p>
      </div>

      <div className="w-full max-w-[320px] sm:max-w-[400px] md:max-w-[460px] relative pointer-events-auto flex flex-col justify-center">
        <motion.div 
          onClick={() => meaningInputRef.current?.focus()}
          className={`w-full relative min-h-[380px] sm:min-h-[420px] bg-white rounded-[32px] border-[3px] border-b-[8px] cursor-text flex flex-col items-center justify-center p-6 sm:p-8 pb-8 transition-colors
            ${isFocused ? 'border-[#1CB0F6] shadow-[0_8px_24px_rgba(28,176,246,0.25)] bg-[#F2F9FF] -translate-y-2' : 'border-[#E5E5E5] hover:border-[#AFB6BB] hover:bg-[#F7F7F7]'}`}
        >
          <motion.div className="absolute -top-5 left-6 flex items-center gap-2 text-[#AFB6BB] font-bold text-sm bg-white px-4 py-2 rounded-2xl border-[3px] border-[#E5E5E5] shadow-sm spring-transition hover:-translate-y-1">
            <span className="opacity-70 uppercase text-xs tracking-wider">Front</span>
            <span className="text-xl text-[#1CB0F6] font-chinese">{cardData.front}</span>
          </motion.div>

          <motion.div className="flex-1 flex flex-col items-center justify-center w-full relative pt-4 pb-2">
            <textarea
              ref={meaningInputRef}
              value={cardData.meaning}
              onChange={(e) => {
                setCardData({...cardData, meaning: e.target.value});
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
              className={`w-full text-center bg-transparent font-black text-[#4B4B4B] outline-none placeholder:text-[#AFB6BB] resize-none overflow-hidden py-2 leading-snug ${
                cardData.meaning.length > 30 ? 'text-[24px] sm:text-[32px]' : cardData.meaning.length > 15 ? 'text-[32px] sm:text-[44px]' : 'text-[40px] sm:text-[60px]'}`}
              placeholder="Meaning"
              autoComplete="off"
              rows={1}
            />
            <motion.div className={`h-2 rounded-full mt-2 transition-all duration-300 ${isFocused ? 'bg-[#1CB0F6] w-48' : 'bg-[#E5E5E5] w-24'} ${cardData.meaning.length > 0 ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'}`} />
          </motion.div>

          <AnimatePresence>
            {cardData.availableMeanings.length > 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="w-full flex gap-2 flex-col pt-4 overflow-hidden shrink-0 mt-auto"
              >
                <div className="w-full flex items-center gap-2 mb-2">
                  <div className="h-[3px] flex-1 bg-[#E5E5E5] rounded-full"></div>
                  <div className="text-[10px] sm:text-xs font-bold text-[#AFB6BB] uppercase tracking-wider text-center px-1">Suggestions</div>
                  <div className="h-[3px] flex-1 bg-[#E5E5E5] rounded-full"></div>
                </div>
                <div className="flex flex-col gap-2 px-2 pb-4 pt-1 max-h-[140px] sm:max-h-[160px] overflow-y-auto hide-scrollbar w-full">
                  <AnimatePresence>
                    {cardData.availableMeanings.filter(m => m !== cardData.meaning).map((meaning) => (
                      <motion.button 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, height: 0, marginBottom: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        key={meaning} 
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.stopPropagation(); setCardData({...cardData, meaning}); }}
                        className="w-full text-center px-4 py-3 bg-[#F7F7F7] border-[2px] border-[#E5E5E5] border-b-[4px] text-[#AFAFAF] hover:text-[#1CB0F6] hover:border-[#1CB0F6] hover:bg-[#F2F9FF] font-bold rounded-[16px] text-xs sm:text-sm transition-colors leading-tight shrink-0 whitespace-normal text-balance"
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
    <div className="flex flex-col w-full h-full bg-white overflow-hidden overscroll-none font-sans selection:bg-[#1CB0F6] selection:text-white">
      <style>{customStyles}</style>
      
      {/* HEADER */}
      <header className="flex items-center justify-between p-4 md:p-6 text-[#AFAFAF] z-10 w-full shrink-0">
          <button 
            onClick={view === 'back' ? handleBack : onClose}
            className="p-2 -ml-2 text-[#AFB6BB] hover:bg-[#F7F7F7] hover:text-[#4B4B4B] rounded-[16px] spring-transition active:scale-90"
          >
            {view === 'back' ? <PiArrowLeftBold size={28} /> : <PiXBold size={28} />}
          </button>
          
          <div className="flex-1 mx-4 md:mx-6 flex flex-col items-center gap-2">
            <span className="font-bold text-[#AFB6BB] uppercase tracking-widest text-[10px] md:text-xs">
              Adding to <span className="text-[#1CB0F6]">{folderName}</span>
            </span>
            <div className="w-full h-3 md:h-4 bg-[#E5E5E5] rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#1CB0F6] rounded-full spring-transition relative"
                style={{ width: view === 'front' ? '50%' : '100%' }}
              >
                <div className="absolute top-1 left-2 right-2 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
          
          <button className="p-2 -mr-2 text-[#AFB6BB] hover:bg-[#F7F7F7] hover:text-[#4B4B4B] rounded-[16px] spring-transition active:scale-90 relative z-30">
            <PiGearBold size={28} />
          </button>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative overflow-y-auto overflow-x-hidden p-2 hide-scrollbar w-full max-w-4xl mx-auto items-center justify-center">
        {view === 'front' ? renderFrontScreen() : renderBackScreen()}
      </main>

      {/* BOTTOM FIXED ACTION BAR */}
      <footer className="shrink-0 p-4 md:p-6 bg-white border-t-2 border-[#E5E5E5]">
          <div className="max-w-4xl mx-auto w-full">
            {saveError && (
              <div className="mb-3 px-4 py-3 bg-[#FFF2F2] border-[2px] border-[#FFD6D6] rounded-[16px] text-[#E03A3A] font-bold text-sm text-center">
                {saveError}
                <button
                  onClick={() => setSaveError(null)}
                  className="ml-2 text-[#E03A3A] hover:text-[#B02020] font-black"
                  aria-label="Dismiss error"
                >
                  <PiXBold size={14} />
                </button>
              </div>
            )}
            <button
              onClick={view === 'front' ? handleNext : handleSave}
              disabled={view === 'front' ? !cardData.front.trim() : !cardData.meaning.trim()}
              className={`w-full py-4 rounded-[20px] font-black text-xl tracking-widest transition-all duration-150 flex items-center justify-center
                ${(view === 'front' ? cardData.front.trim() : cardData.meaning.trim())
                  ? 'bg-[#1CB0F6] text-white border-[#1899D6] border-b-[6px] hover:bg-[#1899D6] active:border-b-[0px] active:translate-y-[6px]' 
                  : 'bg-[#F7F7F7] text-[#AFB6BB] border-[2px] border-[#E5E5E5] border-b-[6px] shadow-sm cursor-not-allowed'}`}
              style={{
                borderBottomWidth: '6px',
                paddingBottom: '16px'
              }}
            >
              {view === 'front' ? 'CONTINUE' : 'SAVE CARD'}
            </button>
          </div>
      </footer>
    </div>
  );
}
