import { supabase } from './supabaseClient';

const BUCKET = 'profile-media';
const signedUrls = new Map<string, { url: string; expires: number }>();
export const PROFILE_MEDIA_REFRESH_MS = 50 * 60 * 1000;

function ownedPath(userId: string, path: string): string {
  if (![`${userId}/avatar.webp`, `${userId}/cover.webp`].includes(path)) throw new Error('Invalid profile media path');
  return path;
}

export async function getProfileMediaUrl(userId: string, path: string): Promise<string> {
  ownedPath(userId, path);
  const cached = signedUrls.get(path);
  if (cached && cached.expires > Date.now()) return cached.url;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  signedUrls.set(path, { url: data.signedUrl, expires: Date.now() + PROFILE_MEDIA_REFRESH_MS });
  return data.signedUrl;
}

/** Decode before uploading, so neither the source image nor its metadata is sent. */
export async function prepareProfileImage(file: File, kind: 'avatar' | 'cover'): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    const square = kind === 'avatar';
    canvas.width = square ? 256 : Math.min(1600, image.naturalWidth);
    canvas.height = square ? 256 : Math.max(1, Math.round(image.naturalHeight * canvas.width / image.naturalWidth));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing is unavailable.');
    const size = Math.min(image.naturalWidth, image.naturalHeight);
    if (square) context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 256, 256);
    else context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => {
      if (blob?.type === 'image/webp') resolve(blob);
      else reject(new Error('This browser could not create a WebP image.'));
    }, 'image/webp', 0.85));
  } finally {
    URL.revokeObjectURL(source);
  }
}

export async function uploadProfileMedia(userId: string, kind: 'avatar' | 'cover', blob: Blob): Promise<string> {
  const path = `${userId}/${kind}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '0' });
  if (error) throw error;
  signedUrls.delete(path);
  return path;
}
export async function removeProfileMedia(userId: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([ownedPath(userId, path)]);
  if (error) throw error;
  signedUrls.delete(path);
}
