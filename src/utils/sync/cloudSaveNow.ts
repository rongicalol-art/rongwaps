/**
 * Lets code outside the sync hooks (sign-out) ask for an upload of unsaved changes right now.
 * `useCloudSyncSave` registers its save while a learner is signed in.
 */
let save: (() => Promise<void>) | null = null;

export function registerCloudSave(next: (() => Promise<void>) | null): void {
  save = next;
}

/** Uploads pending changes, waiting at most `timeoutMs`; never throws (the changes stay on this device). */
export async function saveToCloudNow(timeoutMs = 4_000): Promise<void> {
  if (!save) return;
  await Promise.race([
    save().catch(() => {}),
    new Promise<void>((resolve) => { setTimeout(resolve, timeoutMs); }),
  ]);
}
