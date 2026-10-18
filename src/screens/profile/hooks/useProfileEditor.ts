import { useEffect, useRef, useState } from 'react';
import type { ProfileSettings } from '../../../store/slices/profileSlice';
import { useAppStore } from '../../../store/useAppStore';
import { prepareProfileImage, removeProfileMedia, uploadProfileMedia } from '../../../services/profileMedia';

type MediaKind = 'avatar' | 'cover';
export interface ProfileDraft {
  settings: ProfileSettings;
  avatar?: string;
  cover?: string;
}
export function useProfileEditor(userId: string | undefined, onSaved: () => void) {
  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blobs = useRef<Partial<Record<MediaKind, Blob>>>({});
  const urls = useRef<string[]>([]);
  const session = useRef(0);
  const pending = useRef(0);
  const saving = useRef(false);
  const release = () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); urls.current = []; blobs.current = {}; };
  useEffect(() => {
    session.current++;
    urls.current.forEach((url) => URL.revokeObjectURL(url));
    urls.current = []; blobs.current = {};
    setDraft(null); setError(null);
    const sessionRef = session;
    const urlRef = urls;
    return () => { sessionRef.current++; urlRef.current.forEach((url) => URL.revokeObjectURL(url)); };
  }, [userId]);
  const close = () => { if (saving.current) return; session.current++; release(); setDraft(null); setError(null); };
  const open = (settings: ProfileSettings, avatar?: string, cover?: string) => {
    session.current++; release(); setError(null); setDraft({ settings: { ...settings }, avatar, cover });
  };
  const change = (patch: Partial<ProfileSettings>) => setDraft((value) => value && ({ ...value, settings: { ...value.settings, ...patch } }));
  const chooseCover = (coverPreset: ProfileSettings['coverPreset']) => {
    delete blobs.current.cover;
    setDraft((value) => value && ({ ...value, cover: undefined, settings: { ...value.settings, coverPreset, coverPath: null } }));
  };
  const removeAvatar = (fallback?: string) => {
    delete blobs.current.avatar;
    setDraft((value) => value && ({ ...value, avatar: fallback, settings: { ...value.settings, avatarPath: null } }));
  };
  const upload = async (kind: MediaKind, file?: File) => {
    if (!file || !userId || saving.current) return;
    const token = session.current;
    pending.current++; setBusy(true); setError(null);
    try {
      const blob = await prepareProfileImage(file, kind);
      if (token !== session.current) return;
      const url = URL.createObjectURL(blob);
      urls.current.push(url); blobs.current[kind] = blob;
      setDraft((value) => value && ({ ...value, [kind]: url }));
    } catch (cause) {
      if (token === session.current) setError(cause instanceof Error ? cause.message : 'Couldn’t prepare the image.');
    } finally { pending.current--; setBusy(pending.current > 0); }
  };
  const save = async () => {
    if (!draft || busy || saving.current) return;
    const token = session.current;
    saving.current = true; setBusy(true); setError(null);
    try {
      const settings = { ...draft.settings, displayName: draft.settings.displayName.trim().slice(0, 30) };
      if (userId) {
        // Storage writes happen only on Save, never while previewing.
        for (const kind of ['avatar', 'cover'] as const) {
          const field = `${kind}Path` as const;
          const blob = blobs.current[kind];
          if (blob) settings[field] = await uploadProfileMedia(userId, kind, blob);
          else {
            const oldPath = useAppStore.getState()[field];
            if (oldPath && !settings[field]) await removeProfileMedia(userId, oldPath);
          }
        }
      }
      if (token !== session.current || useAppStore.getState().currentUser?.id !== userId) return;
      useAppStore.getState().setProfile(settings);
      release(); setDraft(null); onSaved();
    } catch {
      setError('Couldn’t save your profile. Check your connection and try again.');
    } finally { saving.current = false; setBusy(false); }
  };
  return { draft, error, busy, open, close, change, chooseCover, removeAvatar, upload, save, hasAvatarUpload: Boolean(blobs.current.avatar) };
}
