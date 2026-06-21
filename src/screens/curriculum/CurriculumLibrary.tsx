import { memo, useMemo } from "react";
import { PiLockKeyFill } from 'react-icons/pi';
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import { SAMPLE_BOOKS, SAMPLE_LESSONS } from "../../data/books";
import { LessonItem } from "./LessonItem";
import { BookCarousel } from "./BookCarousel";
import { StarterLesson } from "./StarterLesson";

export const CurriculumLibrary = memo(function CurriculumLibrary({
  activeBookId = 1,
  onActiveBookChange = () => {},
  selectedLessons = [],
  onToggleLesson = () => {},
  selectedBooks = [],
  onToggleBook = () => {},
}: {
  activeBookId?: number;
  onActiveBookChange?: (id: number) => void;
  selectedLessons?: number[];
  onToggleLesson?: (id: number) => void;
  selectedBooks?: number[];
  onToggleBook?: (id: number) => void;
}) {
  const { scrollY } = useScroll();
  const headerScale = useTransform(scrollY, [0, 150], [1, 0.75]);
  const headerOpacity = useTransform(scrollY, [0, 150], [1, 0.5]);
  const headerY = useTransform(scrollY, [0, 150], [0, -30]);

  const activeBook = useMemo(
    () => SAMPLE_BOOKS.find((b) => b.id === activeBookId) || SAMPLE_BOOKS[0],
    [activeBookId],
  );

  const starterLesson = SAMPLE_LESSONS.find((l) => l.id === 0);
  const regularLessons = SAMPLE_LESSONS.filter((l) => l.id !== 0);

  const midIndex = Math.ceil(regularLessons.length / 2);
  const leftColumnLessons = regularLessons.slice(0, midIndex);
  const rightColumnLessons = regularLessons.slice(midIndex);

  const renderLessonList = (lessonsList: typeof SAMPLE_LESSONS) => {
    return lessonsList.map((lesson, localIndex) => (
      <LessonItem
        key={lesson.id}
        lesson={lesson}
        isSelected={selectedLessons.includes(lesson.id)}
        isPrevSelected={
          localIndex > 0 &&
          selectedLessons.includes(lessonsList[localIndex - 1].id)
        }
        isNextSelected={
          localIndex < lessonsList.length - 1 &&
          selectedLessons.includes(lessonsList[localIndex + 1].id)
        }
        onToggle={onToggleLesson}
        accentColor={activeBook.accent}
        accentBorder={activeBook.accentBorder}
        accentBg={activeBook.accentBg}
        lightBg={activeBook.lightBg}
      />
    ));
  };

  return (
    <div className="w-full relative">
      <div className="flex flex-col pb-24 pt-2 animate-in fade-in zoom-in-[0.98] duration-500 ease-out w-full overflow-x-hidden">
        <motion.div
          className="sticky top-2 z-40 bg-transparent origin-top flex flex-col items-center"
          style={{ scale: headerScale, opacity: headerOpacity, y: headerY }}
        >
          <div className="flex flex-col items-center justify-center text-center z-20 relative w-full px-4 h-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeBook.id}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute flex flex-col items-center"
              >
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#4B4B4B] mb-1 tracking-tight">
                  {activeBook.title}
                </h1>
                <h2
                  className={`text-[13px] md:text-[14px] font-black tracking-widest uppercase ${activeBook.accent} flex items-center gap-1.5`}
                >
                  {activeBook.label}
                  {activeBook.status === "locked" && (
                    <PiLockKeyFill size={16} className="opacity-70" />
                  )}
                </h2>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        <BookCarousel 
          activeBookId={activeBookId} 
          onActiveBookChange={onActiveBookChange} 
        />

        <div className="px-6 md:px-12 w-full pb-12 max-w-5xl mx-auto flex flex-col items-center">
          {starterLesson && (
            <StarterLesson 
              starterLesson={starterLesson as any} 
              activeBook={activeBook} 
              isSelected={selectedLessons.includes(starterLesson.id)} 
              onToggleLesson={onToggleLesson} 
            />
          )}

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full">
            <div className="flex-1 flex flex-col">
              {renderLessonList(leftColumnLessons)}
            </div>
            <div className="flex-1 flex flex-col hidden lg:flex">
              {renderLessonList(rightColumnLessons)}
            </div>
          </div>

          <div className="flex flex-col lg:hidden w-full mt-4">
            {renderLessonList(rightColumnLessons)}
          </div>
        </div>
      </div>
    </div>
  );
});
