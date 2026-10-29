import { useState } from 'react';
import type { ProfileSettings } from '../../../store/slices/profileSlice';
import { useAppStore } from '../../../store/useAppStore';
import { avatarStyle, coverStyle, ProfileCoverGlyphs } from '../../../lib/widgets';

export { avatarStyle, coverStyle };

export function ProfileAvatar({ name, color, image, className = '' }: {
  name: string; color: ProfileSettings['avatarColor']; image?: string; className?: string;
}) {
  const [failedImage, setFailedImage] = useState<string | undefined>();
  return <span className={`profile-avatar ${className}`} style={avatarStyle(color)}>
    {image && failedImage !== image ? <img src={image} alt="" className="h-full w-full rounded-full object-cover" onError={() => setFailedImage(image)} /> : (name.trim()[0] || '?').toUpperCase()}
  </span>;
}
export function CoverGlyphs() {
  const form = useAppStore((state) => state.characterPreference);
  return <ProfileCoverGlyphs form={form} className="profile-glyphs" />;
}
