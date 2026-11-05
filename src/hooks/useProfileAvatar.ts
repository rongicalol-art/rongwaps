import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { showsGooglePhoto } from '../store/slices/profileSlice';
import { getProfileMediaUrl, PROFILE_MEDIA_REFRESH_MS } from '../services/profileMedia';

/** The current user's photo as others see it: the uploaded one, else the Google photo when shown, else none (initials). */
export function useProfileAvatar(): string | undefined {
  const user = useAppStore((state) => state.currentUser);
  const userId = user?.id;
  const avatarPath = useAppStore((state) => state.avatarPath);
  const revision = useAppStore((state) => state.avatarMediaRevision);
  const googlePhoto = useAppStore((state) => state.googlePhoto);
  const [media, setMedia] = useState<{ key: string; url?: string }>({ key: '' });
  const key = `${userId ?? ''}:${avatarPath ?? ''}:${revision}`;

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!userId || !avatarPath) {
        setMedia({ key });
        return;
      }
      try {
        const url = await getProfileMediaUrl(userId, avatarPath);
        if (active) setMedia({ key, url });
      } catch {
        if (active) setMedia({ key });
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), PROFILE_MEDIA_REFRESH_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [userId, avatarPath, key]);

  const fallback = showsGooglePhoto(googlePhoto, user?.createdAt) ? user?.avatarUrl || user?.avatar_url : undefined;
  return (media.key === key ? media.url : undefined) || fallback;
}
