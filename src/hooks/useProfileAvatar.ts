import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { getProfileMediaUrl, PROFILE_MEDIA_REFRESH_MS } from '../services/profileMedia';

/** Resolves the current user's private custom avatar for the shared workspace headers. */
export function useProfileAvatar(): string | undefined {
  const user = useAppStore((state) => state.currentUser);
  const userId = user?.id;
  const avatarPath = useAppStore((state) => state.avatarPath);
  const revision = useAppStore((state) => state.avatarMediaRevision);
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

  const fallback = user?.avatarUrl || user?.avatar_url;
  return (media.key === key ? media.url : undefined) || fallback;
}
