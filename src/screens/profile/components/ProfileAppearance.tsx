import { useState, type CSSProperties } from 'react';
import type { ProfileSettings } from '../../../store/slices/profileSlice';
import { useAppStore } from '../../../store/useAppStore';
import { avatarStyle } from '../../../lib/widgets';

export { avatarStyle };

export function coverStyle(preset: ProfileSettings['coverPreset'], image?: string): CSSProperties {
  return image ? { backgroundImage: `url("${image}")` } : {
    backgroundColor: `var(--color-cover-${preset}-bg)`, color: `var(--color-cover-${preset}-glyph)`,
  };
}
export function ProfileAvatar({ name, color, image, className = '' }: {
  name: string; color: ProfileSettings['avatarColor']; image?: string; className?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | undefined>();
  return <span className={`profile-avatar ${className}`} style={avatarStyle(color)}>
    {image && failedImage !== image ? <img src={image} alt="" className="h-full w-full rounded-full object-cover" onError={() => setFailedImage(image)} /> : (name.trim()[0] || '?').toUpperCase()}
  </span>;
}
const COVER_GLYPHS = { traditional: '你好我是學生中國人謝謝請問老師朋友喝茶吃飯書看說話', simplified: '你好我是学生中国人谢谢请问老师朋友喝茶吃饭书看说话' };
export function CoverGlyphs() {
  const form = useAppStore((state) => state.characterPreference);
  return <span className="profile-glyphs" aria-hidden="true">{COVER_GLYPHS[form]}</span>;
}
