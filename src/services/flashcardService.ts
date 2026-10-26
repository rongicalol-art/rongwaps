import { debugLogger } from '../utils/debug/debugLogger';
import { supabase } from "./supabaseClient";
import type { Database } from '../types/database';
import { UserFlashcard, UserFolder } from "../types/models";

type FlashcardListener = (cards: UserFlashcard[]) => void;

export type FlashcardTextPatch = Partial<
  Pick<UserFlashcard, 'simplified' | 'traditional' | 'pinyin' | 'translation' | 'notes'>
>;

/**
 * Custom flashcard + folder writes with an observable flashcard cache.
 *
 *  • Keeps an in-memory flashcard cache per user and notifies listeners on
 *    every mutation (observer pattern); optimistic updates roll back on error.
 *  • No realtime: another device's changes arrive when the tab becomes
 *    visible again (refetch below). Folders live in the store and are pulled
 *    by the cloud sync (`get_sync_state`); this service only writes them.
 */
class FlashcardService {
  private flashcardListeners: Set<FlashcardListener> = new Set();

  private cachedFlashcards: UserFlashcard[] | null = null;
  private currentUserId: string | null = null;
  private accountGeneration = 0;
  private fetchRevision = 0;
  private folderRefetchedAt = new Map<string, number>();

  constructor() {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.currentUserId && this.flashcardListeners.size > 0) {
        void this.refetchFlashcards(this.currentUserId);
      }
    });
  }

  private notifyFlashcards() {
    if (this.cachedFlashcards) {
      this.flashcardListeners.forEach((listener) =>
        listener(this.cachedFlashcards!),
      );
    }
  }

  getCachedFlashcards(userId: string): UserFlashcard[] | null {
    return this.currentUserId === userId ? this.cachedFlashcards : null;
  }

  async refetchFlashcards(userId: string) {
    if (this.currentUserId !== userId) return;
    const generation = this.accountGeneration;
    const revision = ++this.fetchRevision;
    const rows: Database['public']['Tables']['user_flashcards']['Row'][] = [];
    // PostgREST caps each response at 1000 rows; live folders can contain 2000.
    const pageSize = 1000;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase.from('user_flashcards').select('*')
        .order('created_at', { ascending: false }).order('id')
        .range(offset, offset + pageSize - 1);
      if (generation !== this.accountGeneration || revision !== this.fetchRevision) return;
      if (error) {
        debugLogger.warn('Supabase', 'refetchFlashcards failed; keeping the previous card list.', error);
        return;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    this.cachedFlashcards = rows.map((d) => ({
      id: d.id,
      folderId: d.folder_id || "custom",
      simplified: d.simplified,
      traditional: d.traditional || undefined,
      pinyin: d.pinyin || undefined,
      translation: d.translation,
      notes: d.notes || undefined,
      measure_words: d.measure_words || [],
      createdAt: d.created_at,
      userId: d.user_id,
    }));
    this.notifyFlashcards();
  }

  /** Opening the same live folder repeatedly must not flood the free-tier API. */
  async refetchFolderFlashcards(userId: string, folderId: string) {
    if (this.currentUserId !== userId) return;
    const key = `${userId}:${folderId}`;
    const now = Date.now();
    if (now - (this.folderRefetchedAt.get(key) ?? 0) < 30_000) return;
    this.folderRefetchedAt.set(key, now);
    await this.refetchFlashcards(userId);
  }

  async getReviewCards(userId: string, ids: string[]): Promise<UserFlashcard[]> {
    const cached = this.getCachedFlashcards(userId);
    if (cached) return cached.filter(card => ids.includes(card.id));
    const { data, error } = await supabase.from('user_flashcards').select('*').in('id', ids);
    if (error) throw error;
    return (data ?? []).map(d => ({ id: d.id, folderId: d.folder_id || 'custom', simplified: d.simplified,
      traditional: d.traditional || undefined, pinyin: d.pinyin || undefined, translation: d.translation,
      notes: d.notes || undefined, measure_words: d.measure_words || [], createdAt: d.created_at, userId: d.user_id }));
  }

  async createFlashcard(card: UserFlashcard) {
    const generation = this.accountGeneration;
    try {
      // Optimistic update
      if (this.currentUserId === card.userId && this.cachedFlashcards) {
        this.cachedFlashcards = [card, ...this.cachedFlashcards];
        this.notifyFlashcards();
      }

      const { error } = await supabase.from("user_flashcards").insert([
        {
          id: card.id,
          user_id: card.userId,
          folder_id: card.folderId === "custom" ? null : card.folderId || null,
          simplified: card.simplified,
          traditional: card.traditional || null,
          pinyin: card.pinyin || null,
          translation: card.translation,
          notes: card.notes || null,
          measure_words: card.measure_words || [],
          created_at: card.createdAt,
        },
      ]);

      if (error) {
        // Rollback optimistic update
        if (generation === this.accountGeneration && this.currentUserId === card.userId && this.cachedFlashcards) {
          this.cachedFlashcards = this.cachedFlashcards.filter(
            (c) => c.id !== card.id,
          );
          this.notifyFlashcards();
        }
        throw error;
      }
    } catch (e) {
      debugLogger.error('Supabase', "Error creating flashcard", e);
      throw e;
    }
  }

  /** Inserts a group of new cards in one request, then updates the active cache. */
  async createFlashcards(cards: UserFlashcard[]) {
    if (cards.length === 0) return;
    const userId = cards[0].userId;
    if (cards.some((card) => card.userId !== userId)) throw new Error('All cards in a batch must belong to one user.');
    const { error } = await supabase.from('user_flashcards').insert(cards.map((card) => ({
      id: card.id,
      user_id: card.userId,
      folder_id: card.folderId === 'custom' ? null : card.folderId || null,
      simplified: card.simplified,
      traditional: card.traditional || null,
      pinyin: card.pinyin || null,
      translation: card.translation,
      notes: card.notes || null,
      measure_words: card.measure_words || [],
      created_at: card.createdAt,
    })));
    if (error) {
      debugLogger.error('Supabase', 'Error creating flashcard batch', error);
      throw error;
    }
    if (this.currentUserId === userId && this.cachedFlashcards) {
      this.cachedFlashcards = [...cards, ...this.cachedFlashcards];
      this.notifyFlashcards();
    }
  }

  /** Edits the given text fields only; empty optional fields are stored as null. */
  async updateFlashcard(userId: string, cardId: string, patch: FlashcardTextPatch) {
    try {
      if (this.currentUserId === userId && this.cachedFlashcards) {
        this.cachedFlashcards = this.cachedFlashcards.map((c) =>
          c.id === cardId ? { ...c, ...patch } : c,
        );
        this.notifyFlashcards();
      }

      const { error } = await supabase
        .from("user_flashcards")
        .update({
          ...(patch.simplified !== undefined && { simplified: patch.simplified }),
          ...(patch.translation !== undefined && { translation: patch.translation }),
          ...(patch.traditional !== undefined && { traditional: patch.traditional || null }),
          ...(patch.pinyin !== undefined && { pinyin: patch.pinyin || null }),
          ...(patch.notes !== undefined && { notes: patch.notes || null }),
        })
        .match({ id: cardId });
      if (error) {
        await this.refetchFlashcards(userId);
        throw error;
      }
    } catch (e) {
      debugLogger.error('Supabase', "Error updating flashcard", e);
      throw e;
    }
  }

  async deleteFlashcard(userId: string, cardId: string) {
    try {
      // Optimistic update
      if (this.currentUserId === userId && this.cachedFlashcards) {
        this.cachedFlashcards = this.cachedFlashcards.filter(
          (c) => c.id !== cardId,
        );
        this.notifyFlashcards();
      }

      const { error } = await supabase
        .from("user_flashcards")
        .delete()
        .match({ id: cardId });

      if (error) {
        await this.refetchFlashcards(userId);
        throw error;
      }
    } catch (e) {
      debugLogger.error('Supabase', "Error deleting flashcard", e);
      throw e;
    }
  }

  /** Moves cards into a folder (`custom` is the built-in Custom cards folder). */
  async moveFlashcards(userId: string, cardIds: string[], folderId: string) {
    if (cardIds.length === 0) return;
    const ids = new Set(cardIds);
    try {
      if (this.currentUserId === userId && this.cachedFlashcards) {
        this.cachedFlashcards = this.cachedFlashcards.map((c) => (ids.has(c.id) && c.userId === userId ? { ...c, folderId } : c));
        this.notifyFlashcards();
      }

      const { error } = await supabase
        .from("user_flashcards")
        .update({ folder_id: folderId === "custom" ? null : folderId })
        .eq("user_id", userId)
        .in("id", cardIds);

      if (error) {
        await this.refetchFlashcards(userId);
        throw error;
      }
    } catch (e) {
      debugLogger.error('Supabase', "Error moving flashcards", e);
      throw e;
    }
  }

  subscribeToUserFlashcards(userId: string, onUpdate: FlashcardListener) {
    if (this.currentUserId !== userId) {
      this.accountGeneration++;
      this.currentUserId = userId;
      this.cachedFlashcards = null;
      this.flashcardListeners.forEach((listener) => listener([]));
      this.flashcardListeners.clear();
    }
    this.flashcardListeners.add(onUpdate);

    if (this.cachedFlashcards) {
      onUpdate(this.cachedFlashcards);
    } else {
      onUpdate([]);
      void this.refetchFlashcards(userId);
    }

    return () => {
      this.flashcardListeners.delete(onUpdate);
      if (this.flashcardListeners.size === 0) {
        this.accountGeneration++;
        this.currentUserId = null;
        this.cachedFlashcards = null;
      }
    };
  }

  async createFolder(userId: string, folder: UserFolder) {
    const { error } = await supabase.from("user_folders").insert([
      {
        id: folder.id,
        user_id: userId,
        name: folder.name,
        color: folder.color,
      },
    ]);
    if (error) {
      debugLogger.error('Supabase', "Error creating folder", error);
      throw error;
    }
  }

  /**
   * One-time guest -> account migration: upload the folders created before
   * sign-in in a single upsert. Regular folder writes stay on
   * createFolder/deleteFolder.
   */
  async importFolders(userId: string, folders: UserFolder[]) {
    folders = folders.filter((folder) => folder.role !== 'editor' && (!folder.ownerId || folder.ownerId === userId));
    if (folders.length === 0) return;
    const { error } = await supabase.from("user_folders").upsert(
      folders.map((folder) => ({
        id: folder.id,
        user_id: userId,
        name: folder.name,
        color: folder.color,
      })),
      { onConflict: "id" },
    );
    if (error) {
      debugLogger.error('Supabase', "Error importing guest folders", error);
      throw error;
    }
  }

  async updateFolder(userId: string, folderId: string, patch: { name: string; color: string }) {
    const { error } = await supabase
      .from("user_folders")
      .update({ name: patch.name, color: patch.color })
      .match({ id: folderId, user_id: userId });
    if (error) {
      debugLogger.error('Supabase', "Error updating folder", error);
      throw error;
    }
  }

  async deleteFolder(userId: string, folderId: string) {
    // The folder FK cascades deletion to every creator’s cards.
    if (this.currentUserId === userId && this.cachedFlashcards) {
      this.cachedFlashcards = this.cachedFlashcards.filter((c) => c.folderId !== folderId);
      this.notifyFlashcards();
    }

    const { error } = await supabase
      .from("user_folders")
      .delete()
      .match({ id: folderId, user_id: userId });
    if (error) {
      debugLogger.error('Supabase', "Error deleting folder", error);
      await this.refetchFlashcards(userId);
      throw error;
    }
  }
}

export const flashcardService = new FlashcardService();
