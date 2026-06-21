interface ListeningOptionsProps {
  options: string[];
  selectedOption: string | null;
  setSelectedOption: (opt: string) => void;
  isChecked: boolean;
  currentCard: any;
  activeBook: any;
}

export function ListeningOptions({
  options,
  selectedOption,
  setSelectedOption,
  isChecked,
  currentCard,
  activeBook
}: ListeningOptionsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => {
        const isSelected = selectedOption === opt;
        const isCorrectOption = opt === currentCard.back;
        
        let containerClass = "bg-white text-[#4B4B4B] hover:bg-[#F7F7F7] border-[3px] border-[#E5E5E5]";
        let activeState = "active:translate-y-[4px]";
        let dynamicStyle: any = { boxShadow: "0 4px 0 0 #E5E5E5" };
        
        if (isSelected && !isChecked) {
          containerClass = `${activeBook.bg} border-[3px] ${activeBook.accentBorder} ${activeBook.accent}`;
          dynamicStyle = { boxShadow: `0 4px 0 0 ${activeBook.accentHex}` };
        } else if (isChecked && isCorrectOption) {
          containerClass = "bg-[#D7FFB8] border-[3px] border-[#58A700] text-[#58A700] translate-y-[4px]";
          activeState = "";
          dynamicStyle = { boxShadow: "0 0px 0 0 #58A700" };
        } else if (isChecked && isSelected && !isCorrectOption) {
          containerClass = "bg-[#FFDFE0] border-[3px] border-[#EA2B2B] text-[#EA2B2B] translate-y-[4px]";
          activeState = ""; 
          dynamicStyle = { boxShadow: "0 0px 0 0 #EA2B2B" };
        } else if (isChecked) {
          containerClass = "bg-white border-[3px] border-[#E5E5E5] text-[#AFB6BB] opacity-80 translate-y-[4px]";
          activeState = "";
          dynamicStyle = { boxShadow: "0 0px 0 0 #E5E5E5" };
        }

        return (
          <button
            key={i}
            disabled={isChecked}
            onClick={() => setSelectedOption(opt)}
            className={`relative w-full p-4 px-6 rounded-[16px] flex items-center transition-all duration-150 outline-none select-none ${containerClass} ${activeState}`}
            style={dynamicStyle}
          >
            <div className={`w-8 h-8 shrink-0 rounded-[8px] border-[3px] flex items-center justify-center mr-4 font-bold text-sm ${isSelected ? 'border-current bg-white/20' : 'border-[#E5E5E5] text-[#AFB6BB]'}`}>
              {i + 1}
            </div>
            <span className="flex-1 text-[19px] font-bold leading-tight text-left">
              {opt}
            </span>
          </button>
        )
      })}
    </div>
  );
}
