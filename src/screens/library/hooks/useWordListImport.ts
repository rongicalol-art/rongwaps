import { useEffect } from 'react';
import { WORD_LIST_LEVELS } from '../../../app/routes';
import { saveWordsToFolder } from '../../../features/library';
import { useAuth } from '../../../hooks/useAuth';
import { useAppStore } from '../../../store/useAppStore';
import { takeWordListReturn, wordKey } from '../../../utils/browser/wordListReturn';
import { debugLogger } from '../../../utils/debug/debugLogger';
import { loadWordList, wordListInfo, wordListPart, wordListRange } from '../../word-list';

/**
 * Back from a public word list's Study button: saves the words the visitor did not mark as known
 * into a folder named after the list, then opens that folder. Waits for the account's folders, so
 * a second visit adds to the same folder instead of making another.
 */
export function useWordListImport(): void {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;
  const foldersReady = useAppStore((state) => Boolean(userId) && state.foldersSyncedUserId === userId);

  useEffect(() => {
    if (!userId || !foldersReady) return;
    const pending = takeWordListReturn();
    // A level shown in parts is remembered as `b1/2`.
    const [slug, partText] = (pending?.slug ?? '').split('/');
    const entry = WORD_LIST_LEVELS.find((item) => item.slug === slug);
    if (!pending || !entry) return;
    void (async () => {
      try {
        const known = new Set(pending.known);
        const info = wordListInfo(entry);
        const part = Math.min(Math.max(Number(partText) || 1, 1), info.parts);
        const listed = wordListPart(await loadWordList(entry.level), part, info.parts);
        // Each part gets its own folder, named by its letters, so no folder outgrows the card limit.
        const folderName = info.parts > 1 ? `${info.folderName} ${wordListRange(listed)}` : info.folderName;
        const words = listed
          .filter(([hanzi, pinyin]) => !known.has(wordKey(hanzi, pinyin)))
          .map(([traditional, pinyin, translation, simplified]) => ({ traditional, simplified: simplified ?? traditional, pinyin, translation }));
        const folderId = await saveWordsToFolder(userId, folderName, words);
        const store = useAppStore.getState();
        if (store.currentUser?.id !== userId) return;
        store.setLibraryActiveFolder(folderId);
        store.setLibraryActiveView('folder');
      } catch (error) {
        debugLogger.error('Supabase', 'Failed to save a word list into a folder', error);
        useAppStore.getState().setSyncError('Couldn’t save the word list. Check your connection, then tap Study on the list again.');
      }
    })();
  }, [userId, foldersReady]);
}
