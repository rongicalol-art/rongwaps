import { useEffect, useState } from 'react';
import { getProfileMediaUrl, PROFILE_MEDIA_REFRESH_MS } from '../../../services/profileMedia';

export function useProfileMedia(userId: string | undefined, avatarPath: string | null, coverPath: string | null, revision = 0) {
  const [media, setMedia] = useState<{ key: string; avatar?: string; cover?: string }>({ key: '' });
  const key = `${userId}:${avatarPath}:${coverPath}:${revision}`;
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const [avatar, cover] = await Promise.all([avatarPath, coverPath].map(async (path) => {
        if (!userId || !path) return undefined;
        try { return await getProfileMediaUrl(userId, path); } catch { return undefined; }
      }));
      if (alive) setMedia({ key, avatar, cover });
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), PROFILE_MEDIA_REFRESH_MS);
    return () => { alive = false; window.clearInterval(timer); };
  }, [userId, avatarPath, coverPath, revision, key]);
  return media.key === key ? media : { avatar: undefined, cover: undefined };
}
