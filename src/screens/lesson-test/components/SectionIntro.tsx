import { motion, useReducedMotion } from 'motion/react';
import type { LessonTestPart } from '../../../types/lessonTest';
import { TestDock } from './TestDock';

const PARTS: Record<LessonTestPart, { zh: string; zhSimplified: string; en: string; line?: string; start: string }> = {
  listening: { zh: '聽力', zhSimplified: '听力', en: 'Listening', line: 'Each recording plays twice. No right or wrong until the end.', start: 'Start listening' },
  reading: { zh: '閱讀', zhSimplified: '阅读', en: 'Reading', start: 'Start reading' },
};

/** The start of a part, like the TOCFL section pages: its name, one line on how it works, Start. */
export function SectionIntro({ part, script, onStart }: { part: LessonTestPart; script: 'traditional' | 'simplified'; onStart: () => void }) {
  const reduceMotion = useReducedMotion();
  const copy = PARTS[part];
  const rise = (delay: number) => ({
    initial: reduceMotion ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.42, delay, ease: [0.16, 1, 0.3, 1] as const },
  });
  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-6 pb-36 text-center">
        <motion.p {...rise(0)} lang={script === 'simplified' ? 'zh-Hans' : 'zh-Hant'} className="font-chinese text-[72px] leading-none text-ui-ink-strong md:text-[84px]">{script === 'simplified' ? copy.zhSimplified : copy.zh}</motion.p>
        <motion.h1 {...rise(0.05)} className="mt-2 text-[26px] font-black leading-tight text-ui-ink-strong">{copy.en}</motion.h1>
        {copy.line && <motion.p {...rise(0.1)} className="max-w-xs text-balance text-base font-bold text-ui-muted-strong">{copy.line}</motion.p>}
      </div>
      <TestDock label={copy.start} onPress={onStart} riseKey={part} />
    </>
  );
}
