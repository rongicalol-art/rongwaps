import { flashcardService } from '../../services/flashcardService';
import { useAppStore } from '../../store/useAppStore';
import { serializeFolderColor } from '../../utils/folderColors';

/** Creates a library folder: saved to the account when signed in, then added locally. Returns its id. */
export async function createLibraryFolder(name: string, colorId: string, userId: string | undefined): Promise<string> {
  const id = crypto.randomUUID();
  const color = serializeFolderColor(colorId);
  if (userId) await flashcardService.createFolder(userId, { id, name, color });
  useAppStore.getState().addCustomFolder(name, color, id);
  return id;
}
