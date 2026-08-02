import type { BeginnerDictionaryTerm } from '../../../data/dictionaryHome';
import { AppIcon, Card3D } from '../../../lib/widgets';

interface DictionaryDailyCardProps {
  word: BeginnerDictionaryTerm;
  onOpenWord: (word: string) => void;
}

export function DictionaryDailyCard({ word, onOpenWord }: DictionaryDailyCardProps) {
  const openWord = () => onOpenWord(word.traditional);

  return (
    <Card3D
      edgeColor="border-ui-border"
      className="h-full min-h-[228px] cursor-pointer overflow-hidden p-0 shadow-none transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#BFE9FF]"
      onClick={openWord}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openWord();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open word of the day: ${word.traditional}`}
    >
      <div className="grid h-full flex-1 grid-cols-1 sm:grid-cols-[36%_64%]">
        <div className="relative flex min-h-[112px] flex-col justify-between overflow-hidden bg-[#FFC800] px-5 py-3 sm:min-h-full sm:px-6 sm:py-5">
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-10 h-28 w-28 rounded-full border-[18px] border-white/25"
          />
          <div className="relative w-fit rounded-[11px] bg-white px-2.5 py-1 text-[10px] font-black uppercase text-[#9B7600]">
            Today
          </div>
          <div className="relative flex items-end justify-between gap-4 sm:block">
            <span className="font-chinese text-[64px] font-bold leading-none text-ui-ink sm:text-[96px]">
              {word.traditional}
            </span>
            <span className="pb-1 text-[11px] font-black uppercase text-[#795C00] sm:mt-1 sm:block sm:pb-0">
              Daily pick
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-between gap-3 px-5 py-4 sm:gap-5 sm:px-6 sm:py-5">
          <div>
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-black uppercase text-ui-muted">Word of the day</p>
              <AppIcon name="forward" size={18} className="mt-0.5 shrink-0 text-ui-muted" />
            </div>
            <p className="mt-3 text-[20px] font-black leading-none text-[#1686B3] sm:mt-4">{word.pinyin}</p>
            <p className="mt-1 line-clamp-2 text-[22px] font-black leading-tight text-ui-ink sm:mt-2">
              {word.meaning}
            </p>
          </div>
        </div>
      </div>
    </Card3D>
  );
}
