import type { CSSProperties } from 'react';
import type { CoverPreset } from '../../../shared/lobby';
import { cn } from '../../utils/cn';

/** A profile cover: the uploaded photo, else the preset's colour (glyph ink rides on `color`). */
export function coverStyle(preset: CoverPreset, image?: string): CSSProperties {
  return image ? { backgroundImage: `url("${image}")` } : {
    backgroundColor: `var(--color-cover-${preset}-bg)`, color: `var(--color-cover-${preset}-glyph)`,
  };
}

const COVER_GLYPHS = { traditional: '你好我是學生中國人謝謝請問老師朋友喝茶吃飯書看說話', simplified: '你好我是学生中国人谢谢请问老师朋友喝茶吃饭书看说话' };

/** The faint character pattern on preset covers; size it with `className`. */
export function ProfileCoverGlyphs({ form, className }: { form: keyof typeof COVER_GLYPHS; className?: string }) {
  return <span className={cn('pointer-events-none absolute inset-0 overflow-hidden font-chinese leading-[1.2]', className)} aria-hidden="true">{COVER_GLYPHS[form]}</span>;
}
