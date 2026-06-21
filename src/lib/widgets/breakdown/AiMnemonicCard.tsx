import { useState, useEffect } from 'react';
import { PiLightbulbFill, PiSpinnerBold } from 'react-icons/pi';
import { DBCharacterBreakdown } from '../../../types/database';
import { generateMnemonic, getCachedMnemonic } from '../../../services/aiService';
import { getCharacterBreakdown } from '../../../services/breakdownService';
import { formatMemoryHook } from '../../../utils/textUtils';
import { getComponentsInfo } from './breakdownUtils';

export function AiMnemonicCard({
  char,
  data,
  accentBgClass = 'bg-[#FF9600]',
  accentTextClass = 'text-[#FF9600]',
  buttonEdgeClass = 'border-[#E57A00]',
  compact = false,
}: {
  char: string;
  data: DBCharacterBreakdown | null;
  accentBgClass?: string;
  accentTextClass?: string;
  buttonEdgeClass?: string;
  compact?: boolean;
}) {
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadMnemonic() {
      const cached = await getCachedMnemonic(char);
      if (isMounted && cached) {
        setMnemonic(cached);
      }
    }
    loadMnemonic();
    return () => { isMounted = false; };
  }, [char]);

  const handleRegenerate = async () => {
    if (!data) return;
    setLoading(true);
    setNotFound(false);
    try {
      const { components: chars } = getComponentsInfo(data.decomposition);
      const componentsInfo = await Promise.all(chars.map(async (c) => {
        const breakdown = await getCharacterBreakdown(c);
        return {
          char: c,
          pinyin: breakdown?.pinyin?.[0],
          definition: breakdown?.definition
        };
      }));

      const text = await generateMnemonic(char, data, componentsInfo, true);
      setMnemonic(text);
      if (text.includes("Could not generate")) {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Mnemonic generation failed:', err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (!data || !data.decomposition || getComponentsInfo(data.decomposition).components.length <= 1) return null;

  if (compact) {
    if (loading) {
      return (
        <div className="w-full bg-white/80 border-[2px] border-[#E5E5E5] border-b-[4px] rounded-[20px] px-4 py-3 flex items-center gap-3">
          <PiSpinnerBold size={18} className="animate-spin text-[#AFB6BB] shrink-0" />
          <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#AFB6BB]">
            Loading memory hook
          </span>
        </div>
      );
    }

    if (!mnemonic) return null;

    return (
      <div className="w-full bg-white/85 border-[2px] border-[#E5E5E5] border-b-[4px] rounded-[20px] px-4 py-3 flex items-start gap-3 shadow-sm">
        <PiLightbulbFill size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 text-left">
          <div className={`text-[11px] font-extrabold uppercase tracking-widest mb-1 ${accentTextClass}`}>
            Memory Hook
          </div>
          <p className="text-[13px] sm:text-[14px] text-[#4B4B4B] font-bold leading-snug">
            {formatMemoryHook(mnemonic)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-[3px] border-[#E5E5E5] border-b-[6px] rounded-[24px] p-5 md:p-6 flex flex-col items-center shadow-sm">
      <div className={`flex items-center gap-2 mb-4 ${accentTextClass} font-black text-[13px] md:text-[14px] uppercase tracking-widest shrink-0`}>
        <PiLightbulbFill size={20} />
        Memory Hook
      </div>

      {loading ? (
        <div className="w-full py-4 flex items-center justify-center">
          <PiSpinnerBold size={24} className="animate-spin text-[#AFB6BB]" />
        </div>
      ) : mnemonic ? (
        <div className="text-[#4B4B4B] text-[15px] md:text-[16px] font-medium leading-relaxed bg-[#F7F7F7] border border-[#E5E5E5] rounded-[16px] p-5 w-full text-center">
          {formatMemoryHook(mnemonic)}
        </div>
      ) : notFound ? (
        <button 
          onClick={handleRegenerate}
          disabled={loading}
          className={`${accentBgClass} ${buttonEdgeClass} border-b-[6px] rounded-[16px] py-4 px-6 w-full flex items-center justify-center text-white font-black text-[15px] md:text-[16px] hover:brightness-110 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Generate AI Story
        </button>
      ) : null}
    </div>
  );
}
