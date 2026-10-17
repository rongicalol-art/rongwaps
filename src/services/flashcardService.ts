import { debugLogger } from '../utils/debug/debugLogger';
import { supabase } from "./supabaseClient";
import { UserFlashcard, UserFolder } from "../types/models";

type FlashcardListener = (cards: UserFlashcard[]) => void;

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
    const { data, error } = await supabase
      .from("user_flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (generation !== this.accountGeneration) return;
    if (error) {
      // Graceful degradation: keep the previous list; the library surfaces
      // emptiness, so a failed refetch must leave a visible trace.
      debugLogger.warn('Supabase', "refetchFlashcards failed; keeping the previous card list.", error);
    }

    if (!error && data) {
      this.cachedFlashcards = data.map((d) => ({
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
  }

  async getReviewCards(userId: string, ids: string[]): Promise<UserFlashcard[]> {
    const cached = this.getCachedFlashcards(userId);
    if (cached) return cached.filter(card => ids.includes(card.id));
    const { data, error } = await supabase.from('user_flashcards').select('*').eq('user_id', userId).in('id', ids);
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

  async updateFlashcardTranslation(userId: string, cardId: string, translation: string) {
    try {
      if (this.currentUserId === userId && this.cachedFlashcards) {
        this.cachedFlashcards = this.cachedFlashcards.map((c) =>
          c.id === cardId ? { ...c, translation } : c,
        );
        this.notifyFlashcards();
      }

      const { error } = await supabase
        .from("user_flashcards")
        .update({ translation })
        .match({ id: cardId, user_id: userId });
      if (error) throw error;
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
        .match({ id: cardId, user_id: userId });

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
        this.cachedFlashcards = this.cachedFlashcards.map((c) => (ids.has(c.id) ? { ...c, folderId } : c));
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

  async deleteFolder(userId: string, folderId: string) {
    // Cards in the folder fall back to "Custom Cards" (the FK sets folder_id null).
    if (this.currentUserId === userId && this.cachedFlashcards) {
      this.cachedFlashcards = this.cachedFlashcards.map((c) =>
        c.folderId === folderId ? { ...c, folderId: "custom" } : c,
      );
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
