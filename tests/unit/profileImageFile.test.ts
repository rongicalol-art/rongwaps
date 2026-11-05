import assert from 'node:assert/strict';
import test from 'node:test';
import { PROFILE_IMAGE_MAX_BYTES, profileImageFileError } from '../../src/services/profileMedia';

test('profile photo accepts WebP and other image types', () => {
  for (const [name, type] of [['a.webp', 'image/webp'], ['a.jpg', 'image/jpeg'], ['a.heic', 'image/heic']]) {
    assert.equal(profileImageFileError(new File(['x'], name, { type })), null);
  }
});

test('profile photo accepts images the system reports without a type, by extension', () => {
  assert.equal(profileImageFileError(new File(['x'], 'photo.WEBP', { type: '' })), null);
  assert.equal(profileImageFileError(new File(['x'], 'photo.avif', { type: 'application/octet-stream' })), null);
});

test('profile photo rejects non-images and oversized files', () => {
  assert.equal(profileImageFileError(new File(['x'], 'notes.pdf', { type: 'application/pdf' })), 'Choose an image file.');
  assert.equal(profileImageFileError(new File(['x'], 'notes.txt', { type: '' })), 'Choose an image file.');
  const big = new File(['x'], 'big.webp', { type: 'image/webp' });
  Object.defineProperty(big, 'size', { value: PROFILE_IMAGE_MAX_BYTES + 1 });
  assert.match(profileImageFileError(big) ?? '', /smaller than 20 MB/);
});
