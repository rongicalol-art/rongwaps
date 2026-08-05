import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import { AppIcon } from '../../../lib/widgets';

interface DictionaryDailyCardProps {
  word: BeginnerDictionaryTerm;
  onOpenWord: (word: string) => void;
}

export function DictionaryDailyCard({ word, onOpenWord }: DictionaryDailyCardProps) {
  const openWord = () => onOpenWord(word.traditional);

  return (
    <button
      type="button"
      className="group h-full min-h-[220px] cursor-pointer overflow-hidden rounded-[28px] bg-ui-surface p-0 text-left transition-[transform,background-color] duration-200 hover:-translate-y-1 hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20 active:translate-y-0"
      onClick={openWord}
      aria-label={`Open word of the day: ${word.traditional}`}
    >
      <div className="grid h-full grid-cols-[38%_62%] sm:grid-cols-[36%_64%]">
        <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-feedback-warning px-4 py-4 sm:px-6 sm:py-5">
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/25"
          />
          <div className="relative w-fit rounded-[10px] bg-white/85 px-2.5 py-1 text-[10px] font-black uppercase text-[#795C00]">
            Today
          </div>
          <div className="relative">
            <span className="font-chinese text-[58px] font-bold leading-none text-ui-ink sm:text-[88px]">
              {word.traditional}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex justify-end">
            <AppIcon name="forward" size={18} className="text-ui-muted transition-transform group-hover:translate-x-1" />
          </div>
          <div className="pb-1">
            <p className="text-[18px] font-black leading-none text-brand-primary sm:text-[20px]">{word.pinyin}</p>
            <p className="mt-2 line-clamp-3 text-[20px] font-black leading-tight text-ui-ink sm:text-[22px]">
              {word.meaning}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
