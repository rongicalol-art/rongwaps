import { supabase } from './supabaseClient';

const BUCKET = 'profile-media';
const signedUrls = new Map<string, { url: string; expires: number }>();
export const PROFILE_MEDIA_REFRESH_MS = 50 * 60 * 1000;
export const PROFILE_IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const PROFILE_IMAGE_MAX_PIXELS = 40_000_000;

export interface ProfileImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function profileImageFileError(file: File): string | null {
  if (!file.type.startsWith('image/')) return 'Choose an image file.';
  if (file.size > PROFILE_IMAGE_MAX_BYTES) return 'Choose an image smaller than 20 MB.';
  return null;
}

const ownedPaths = (userId: string) => [`${userId}/avatar.webp`, `${userId}/cover.webp`];

function ownedPath(userId: string, path: string): string {
  if (!ownedPaths(userId).includes(path)) throw new Error('Invalid profile media path');
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

/** Crop and encode locally so the source image and its metadata are never uploaded. */
export async function prepareProfileImage(file: File, kind: 'avatar' | 'cover', crop?: ProfileImageCrop): Promise<Blob> {
  const fileError = profileImageFileError(file);
  if (fileError) throw new Error(fileError);
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > PROFILE_IMAGE_MAX_PIXELS) {
      throw new Error('That image is too large to edit. Choose one with fewer pixels.');
    }
    const canvas = document.createElement('canvas');
    const square = kind === 'avatar';
    const defaultCrop = square
      ? { x: (image.naturalWidth - Math.min(image.naturalWidth, image.naturalHeight)) / 2, y: (image.naturalHeight - Math.min(image.naturalWidth, image.naturalHeight)) / 2, width: Math.min(image.naturalWidth, image.naturalHeight), height: Math.min(image.naturalWidth, image.naturalHeight) }
      : { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    const sourceCrop = crop ?? defaultCrop;
    const cropWidth = Math.max(1, Math.min(image.naturalWidth, sourceCrop.width));
    const cropHeight = Math.max(1, Math.min(image.naturalHeight, sourceCrop.height));
    const cropX = Math.max(0, Math.min(image.naturalWidth - cropWidth, sourceCrop.x));
    const cropY = Math.max(0, Math.min(image.naturalHeight - cropHeight, sourceCrop.y));
    canvas.width = square ? 256 : Math.min(1600, Math.max(1, Math.round(cropWidth)));
    canvas.height = square ? 256 : Math.max(1, Math.round(canvas.width * cropHeight / cropWidth));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image editing is unavailable.');
    context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
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
/** Account deletion: SQL cannot delete Storage files, so the owner removes both before the account goes. */
export async function removeAllProfileMedia(userId: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove(ownedPaths(userId));
  if (error) throw error;
  signedUrls.clear();
}

export async function removeProfileMedia(userId: string, path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([ownedPath(userId, path)]);
  if (error) throw error;
  signedUrls.delete(path);
}
