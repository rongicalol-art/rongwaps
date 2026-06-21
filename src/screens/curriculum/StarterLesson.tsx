import { PiBookOpenFill } from 'react-icons/pi';

interface StarterLessonProps {
  starterLesson: { id: number; title: string };
  activeBook: any;
  isSelected: boolean;
  onToggleLesson: (id: number) => void;
}

export function StarterLesson({ starterLesson, activeBook, isSelected, onToggleLesson }: StarterLessonProps) {
  if (activeBook.id !== 1 || !starterLesson) return null;

  return (
    <div className="mb-8 w-full max-w-[400px]">
      <div
        onClick={() => onToggleLesson(starterLesson.id)}
        className={`w-full cursor-pointer group bg-white border-b-[4px] ${
          isSelected
            ? `${activeBook.accentBorder} ${activeBook.lightBg}`
            : "border-[#E5E5E5] hover:bg-[#F7F7F7]"
        } rounded-[24px] p-4 shadow-sm transition-all duration-300 flex items-center justify-between`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 shrink-0 rounded-[18px] flex items-center justify-center ${
              isSelected ? activeBook.accentBg : "bg-[#F7F7F7]"
            } transition-colors duration-300`}
          >
            <PiBookOpenFill
              size={24}
              className={isSelected ? "text-white" : "text-[#AFB6BB]"}
            />
          </div>
          <div>
            <h3
              className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 transition-colors duration-300 ${
                isSelected ? activeBook.accent : "text-[#AFB6BB]"
              }`}
            >
              Introduction
            </h3>
            <h2
              className={`text-[17px] font-extrabold truncate transition-colors duration-300 ${
                isSelected ? "text-[#4B4B4B]" : "text-[#AFB6BB]"
              }`}
            >
              {starterLesson.title}
            </h2>
          </div>
        </div>
      </div>
      <div className="w-[4px] h-8 bg-[#E5E5E5] mx-auto mt-2 rounded-full" />
    </div>
  );
}
