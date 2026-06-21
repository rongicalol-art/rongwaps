import { supabase } from "./supabaseClient";
import { UserFlashcard, UserFolder } from "../types/models";

type FlashcardListener = (cards: UserFlashcard[]) => void;
type FolderListener = (folders: UserFolder[]) => void;

/**
 * Flashcard & folder service with optimistic updates + observer pattern.
 *
 * Architecture:
 *  • Maintains in-memory caches of flashcards and folders per user
 *  • Notifies registered listeners on every mutation (observer pattern)
 *  • Uses Supabase real-time subscriptions to sync across tabs
 *  • Optimistic updates: UI updates immediately, rolls back on error
 *
 * The `deletingFolderIds` set prevents a race condition where Supabase
 * real-time events could briefly re-appear a folder that's being deleted.
 */
class FlashcardService {
  private flashcardListeners: Set<FlashcardListener> = new Set();
  private folderListeners: Set<FolderListener> = new Set();

  private cachedFlashcards: UserFlashcard[] | null = null;
  private cachedFolders: UserFolder[] | null = null;
  private currentUserId: string | null = null;
  private deletingFolderIds: Set<string> = new Set();

  private notifyFlashcards() {
    if (this.cachedFlashcards) {
      this.flashcardListeners.forEach((listener) =>
        listener(this.cachedFlashcards!),
      );
    }
  }

  private notifyFolders() {
    if (this.cachedFolders) {
      const filtered = this.cachedFolders.filter(
        (f) => !this.deletingFolderIds.has(f.id),
      );
      this.folderListeners.forEach((listener) => listener(filtered));
    }
  }

  async refetchFlashcards(userId: string) {
    const { data, error } = await supabase
      .from("user_flashcards")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

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

  async refetchFolders(userId: string) {
    const { data, error } = await supabase
      .from("user_folders")
      .select("*")
      .eq("user_id", userId);

    if (!error && data) {
      this.cachedFolders = data
        .map((d) => ({
          id: d.id,
          name: d.name,
          color: d.color,
        }))
        .filter((f) => !this.deletingFolderIds.has(f.id));
      this.notifyFolders();
    }
  }

  async createFlashcard(card: UserFlashcard) {
    try {
      // Optimistic update
      if (this.cachedFlashcards) {
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
        if (this.cachedFlashcards) {
          this.cachedFlashcards = this.cachedFlashcards.filter(
            (c) => c.id !== card.id,
          );
          this.notifyFlashcards();
        }
        throw error;
      }

      await this.refetchFlashcards(card.userId);
    } catch (e) {
      console.error("Error creating flashcard", e);
      throw e;
    }
  }

  async deleteFlashcard(userId: string, cardId: string) {
    try {
      // Optimistic update
      if (this.cachedFlashcards) {
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
      console.error("Error deleting flashcard", e);
      throw e;
    }
  }

  subscribeToUserFlashcards(userId: string, onUpdate: FlashcardListener) {
    this.flashcardListeners.add(onUpdate);

    if (this.currentUserId !== userId) {
      this.currentUserId = userId;
      this.cachedFlashcards = null;
      this.cachedFolders = null;
    }

    if (this.cachedFlashcards) {
      onUpdate(this.cachedFlashcards);
    } else {
      this.refetchFlashcards(userId);
    }

    // Attempt real-time too
    const subscription = supabase
      .channel("public:user_flashcards")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_flashcards",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          this.refetchFlashcards(userId);
        },
      )
      .subscribe();

    return () => {
      this.flashcardListeners.delete(onUpdate);
      supabase.removeChannel(subscription);
    };
  }

  async createFolder(userId: string, folder: UserFolder) {
    try {
      if (this.cachedFolders) {
        this.cachedFolders = [...this.cachedFolders, folder];
        this.notifyFolders();
      }

      const { error } = await supabase.from("user_folders").insert([
        {
          id: folder.id,
          user_id: userId,
          name: folder.name,
          color: folder.color,
        },
      ]);

      if (error) {
        if (this.cachedFolders) {
          this.cachedFolders = this.cachedFolders.filter(
            (f) => f.id !== folder.id,
          );
          this.notifyFolders();
        }
        throw error;
      }

      await this.refetchFolders(userId);
    } catch (e) {
      console.error("Error creating folder", e);
      throw e;
    }
  }

  async deleteFolder(userId: string, folderId: string) {
    try {
      this.deletingFolderIds.add(folderId);

      if (this.cachedFolders) {
        this.cachedFolders = this.cachedFolders.filter(
          (f) => f.id !== folderId,
        );
        this.notifyFolders();
      }

      if (this.cachedFlashcards) {
        this.cachedFlashcards = this.cachedFlashcards.map((c) =>
          c.folderId === folderId ? { ...c, folderId: "custom" } : c
        );
        this.notifyFlashcards();
      }

      const { error } = await supabase
        .from("user_folders")
        .delete()
        .match({ id: folderId, user_id: userId });

      if (error) {
        await this.refetchFolders(userId);
        throw error;
      }
    } catch (e) {
      console.error("Error deleting folder", e);
      throw e;
    } finally {
      // Cooldown timer to prevent overlapping asynchronous PostgreSQL stream triggers from resurrecting the folder
      setTimeout(() => {
        this.deletingFolderIds.delete(folderId);
      }, 1500);
    }
  }

  async syncOfflineFolders(userId: string, localFolders: UserFolder[]) {
    try {
      const { data, error } = await supabase
        .from("user_folders")
        .select("id")
        .eq("user_id", userId);

      if (!error && data) {
        const remoteIds = new Set(data.map((f: any) => f.id));
        const offlineOnly = localFolders.filter(f => !remoteIds.has(f.id));

        if (offlineOnly.length > 0) {
          for (const lf of offlineOnly) {
            await this.createFolder(userId, lf);
          }
        }
      }
    } catch (err) {
      console.error("Failed to migrate offline folders:", err);
    }
  }

  subscribeToFolders(userId: string, onUpdate: FolderListener) {
    this.folderListeners.add(onUpdate);

    if (this.cachedFolders) {
      onUpdate(this.cachedFolders);
    } else {
      this.refetchFolders(userId);
    }

    const subscription = supabase
      .channel("public:user_folders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_folders",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          this.refetchFolders(userId);
        },
      )
      .subscribe();

    return () => {
      this.folderListeners.delete(onUpdate);
      supabase.removeChannel(subscription);
    };
  }
}

export const flashcardService = new FlashcardService();
