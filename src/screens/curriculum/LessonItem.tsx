import { memo } from "react";
import { PiCheckBold, PiPlayFill } from 'react-icons/pi';
import { motion } from "motion/react";
import { SAMPLE_LESSONS } from "../../data/books";

const LessonItemBase = ({
  lesson,
  isSelected,
  isPrevSelected,
  isNextSelected,
  onToggle,
  accentColor,
  accentBorder,
  accentBg,
  lightBg,
}: {
  lesson: (typeof SAMPLE_LESSONS)[0];
  isSelected: boolean;
  isPrevSelected: boolean;
  isNextSelected: boolean;
  onToggle: (id: number) => void;
  accentColor: string;
  accentBorder: string;
  accentBg: string;
  lightBg: string;
}) => {
  const isCompleted = lesson.status === "completed";

  let containerClasses =
    "border-b-[4px] border-[#E5E5E5] bg-white hover:bg-[#F7F7F7] z-0 rounded-[24px] mb-3 transition-colors";
  let innerDivider = null;

  if (isSelected) {
    if (!isPrevSelected && !isNextSelected) {
      containerClasses = `border-b-[6px] ${accentBorder} ${lightBg} z-10 rounded-[24px] mb-3`;
    } else if (!isPrevSelected && isNextSelected) {
      containerClasses = `border-b-0 ${accentBorder} ${lightBg} z-10 rounded-t-[24px] rounded-b-none mb-0`;
      innerDivider = (
        <div className={`absolute bottom-0 left-6 right-6 h-[2.5px] ${accentBg} opacity-15`} />
      );
    } else if (isPrevSelected && isNextSelected) {
      containerClasses = `border-b-0 ${accentBorder} ${lightBg} shadow-none z-10 rounded-none mb-0`;
      innerDivider = (
        <div className={`absolute bottom-0 left-6 right-6 h-[2.5px] ${accentBg} opacity-15`} />
      );
    } else if (isPrevSelected && !isNextSelected) {
      containerClasses = `border-b-[6px] ${accentBorder} ${lightBg} z-10 rounded-t-none rounded-b-[24px] mb-3`;
    }
  }

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", bounce: 0.4, duration: 0.2 }}
      onClick={() => onToggle(lesson.id)}
      className={`relative p-4 flex items-center justify-between cursor-pointer group transition-all duration-300 ${containerClasses}`}
      style={{ transform: "translateZ(0)" }}
    >
      {innerDivider}
      <div className="flex items-center gap-4 text-left w-full relative z-10">
        <div
          className={`w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 transition-all duration-300 ${
            isSelected
              ? "bg-white border-b-[4px] border-[#E5E5E5]"
              : "bg-[#F7F7F7] border-b-[4px] border-[#E5E5E5] text-[#AFB6BB] group-hover:text-[#4B4B4B]"
          }`}
        >
          {isSelected ? (
            <div className={`animate-in zoom-in duration-300 ${accentColor}`}>
              <PiCheckBold size={24} />
            </div>
          ) : isCompleted ? (
            <PiCheckBold size={24} className="text-[#AFB6BB]" />
          ) : (
            <PiPlayFill size={22} className="ml-0.5" />
          )}
        </div>
        <div className="flex-1 min-w-0 pr-2">
          <p
            className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 transition-colors duration-300 ${
              isSelected ? accentColor : "text-[#AFB6BB]"
            }`}
          >
            {lesson.label}
          </p>
          <p
            className={`text-[17px] font-extrabold truncate transition-colors duration-300 ${
              isSelected ? "text-[#4B4B4B]" : "text-[#AFB6BB]"
            }`}
          >
            {lesson.title}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const LessonItem = memo(LessonItemBase);
