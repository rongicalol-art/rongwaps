import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AppIcon } from '../../../lib/widgets';
import type { LessonTestPart } from '../../../types/lessonTest';
import { cn } from '../../../utils/cn';
import { TestDock } from './TestDock';

const PARTS: { part: LessonTestPart; zh: string; zhSimplified: string; en: string }[] = [
  { part: 'listening', zh: '聽力', zhSimplified: '听力', en: 'Listening' },
  { part: 'reading', zh: '閱讀', zhSimplified: '阅读', en: 'Reading' },
];
const LINE: Record<LessonTestPart, string> = {
  listening: 'Each recording plays twice. Answers show at the end.',
  reading: 'Read at your own pace. Answers show at the end.',
};
const START: Record<LessonTestPart, string> = { listening: 'Start listening', reading: 'Start reading' };

/**
 * The start of a part, like the TOCFL section pages, showing both parts with the current one lit. Before
 * reading it opens on listening, then 聽力 ticks off and 閱讀 lights up: the part just finished hands over.
 */
export function SectionIntro({ part, lessonId, script, onStart }: { part: LessonTestPart; lessonId: number; script: 'traditional' | 'simplified'; onStart: () => void }) {
  const reduceMotion = useReducedMotion();
  const [handedOver, setHandedOver] = useState(part === 'listening' || Boolean(reduceMotion));
  useEffect(() => {
    if (handedOver) return undefined;
    const timer = window.setTimeout(() => setHandedOver(true), 450);
    return () => window.clearTimeout(timer);
  }, [handedOver]);
  const current: LessonTestPart = handedOver ? part : 'listening';
  const rise = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] as const },
  });
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-5 pb-36 text-center">
        <motion.h1 {...rise(0)} className="text-3xl font-black leading-tight text-ui-ink-strong md:text-4xl">Lesson {lessonId} test</motion.h1>
        <motion.div {...rise(0.05)} className="grid w-full max-w-md grid-cols-2 gap-3 md:max-w-xl md:gap-4">
          {PARTS.map((entry) => {
            const done = entry.part === 'listening' && part === 'reading' && handedOver;
            const lit = entry.part === current;
            return (
              <div
                key={entry.part}
                className={cn(
                  'flex flex-col items-center gap-2.5 rounded-feature border-2 px-3 pb-5 pt-6 transition-colors duration-500 md:pb-7 md:pt-9',
                  lit ? 'border-brand-primary bg-brand-primary-soft' : 'border-ui-border bg-ui-surface',
                )}
              >
                <span
                  lang={script === 'simplified' ? 'zh-Hans' : 'zh-Hant'}
                  className={cn('font-chinese text-5xl leading-none transition-colors duration-500 md:text-6xl', done ? 'text-ui-muted' : 'text-ui-ink-strong')}
                >
                  {script === 'simplified' ? entry.zhSimplified : entry.zh}
                </span>
                <span className="inline-flex items-center gap-1.5 text-base font-extrabold text-ui-muted-strong">
                  {done && (
                    <motion.span
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                      className="inline-flex text-brand-primary-text"
                    >
                      <AppIcon name="check" size={18} />
                    </motion.span>
                  )}
                  {entry.en}
                </span>
              </div>
            );
          })}
        </motion.div>
        <motion.p {...rise(0.1)} className="max-w-xs text-balance text-base font-bold text-ui-muted-strong">{LINE[part]}</motion.p>
      </div>
      <TestDock label={START[part]} onPress={onStart} riseKey={part} />
    </>
  );
}
