import { PiLightbulbFill } from 'react-icons/pi';
import { formatMemoryHook } from '../../../utils/textUtils';

interface MnemonicSectionProps {
  loading: boolean;
  mnemonic: string | null;
  activeBook: any;
  handleGenerateMnemonic: () => void;
}

export function MnemonicSection({
  loading,
  mnemonic,
  activeBook,
  handleGenerateMnemonic,
}: MnemonicSectionProps) {
  if (loading) {
    return (
      <div className="relative w-full rounded-[24px] border-[3px] border-b-[6px] border-[#E5E5E5] bg-white p-5 sm:p-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#E5E5E5]" />
        <div className="flex flex-row items-start gap-4">
          <div className="shrink-0 mt-1">
            <PiLightbulbFill size={36} className="text-[#E5E5E5] opacity-50 animate-pulse" />
          </div>
          <div className="flex-1 text-left pt-1">
            <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-1/3 mb-3" />
            <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-full mb-2" />
            <div className="h-4 bg-[#E5E5E5] bg-opacity-40 animate-pulse rounded-[8px] w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (mnemonic) {
    return (
      <div className="relative w-full rounded-[24px] border-[3px] border-b-[6px] border-[#E5E5E5] bg-white p-5 sm:p-6 overflow-hidden">
        {/* Colorful top ribbon */}
        <div className={`absolute top-0 left-0 w-full h-2 ${activeBook.accentBg || 'bg-[#1CB0F6]'}`} />
        
        <div className="flex flex-row items-start gap-4">
          <div className="shrink-0 mt-1">
            <PiLightbulbFill size={36} className="text-amber-400" />
          </div>
          <div className="flex-1 text-left">
            <h4 className={`text-[13px] font-extrabold uppercase tracking-widest mb-1.5 ${activeBook.accent}`}>
              Memory Hook
            </h4>
            <p className="text-[16px] text-[#4B4B4B] font-medium leading-snug whitespace-pre-wrap">
              {formatMemoryHook(mnemonic)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[24px] border-[3px] border-dashed border-[#E5E5E5] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F7F7F7]">
      <div className="flex flex-row items-center text-left gap-4 flex-1">
        <div className="shrink-0">
          <PiLightbulbFill size={36} className="text-[#AFB6BB] opacity-60" />
        </div>
        <div className="flex flex-col">
          <h4 className="text-[16px] font-extrabold text-[#4B4B4B]">
            Hard to remember?
          </h4>
          <p className="text-[14px] font-bold text-[#AFB6BB] leading-tight">
            Create a magical AI story to lock this in.
          </p>
        </div>
      </div>
      
      <button 
        onClick={handleGenerateMnemonic}
        className={`flex items-center justify-center shrink-0 w-full sm:w-auto px-6 py-3 sm:py-3.5 ${activeBook.accentBg || 'bg-[#1CB0F6]'} border-b-[5px] border-black/20 rounded-[16px] active:border-b-[0px] active:translate-y-[5px] transition-all`}
        style={{ borderBottomColor: 'rgba(0,0,0,0.2)' }}
      >
        <PiLightbulbFill size={18} className="text-white mr-2" />
        <span className="font-extrabold text-[15px] text-white uppercase tracking-wider drop-shadow-sm">
          Generate
        </span>
      </button>
    </div>
  );
}
