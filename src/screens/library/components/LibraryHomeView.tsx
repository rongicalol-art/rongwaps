import type { ReactNode } from 'react';
import { AppIcon, ActionButton } from '../../../lib/widgets';
import { FolderItem } from './FolderItem';
import { LibraryRecentCardsCard, type RecentItem } from './LibraryRecentCardsCard';

interface LibraryCollectionSummary {
  id: string;
  title: string;
  count: number;
  icon?: ReactNode;
  accentBg?: string;
  accentBorder?: string;
}

interface LibraryHomeViewProps {
  collections: LibraryCollectionSummary[];
  recentItems?: RecentItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCollection: (id: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onCreateFolder: () => void;
  onSelectWord?: (word: string) => void;
}

export function LibraryHomeView({
  collections,
  recentItems = [],
  searchQuery,
  onSearchChange,
  onSelectCollection,
  onDeleteFolder,
  onCreateFolder,
  onSelectWord,
}: LibraryHomeViewProps) {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleCollections = normalizedSearch
    ? collections.filter((collection) => collection.title.toLowerCase().includes(normalizedSearch))
    : collections;

  return (
    <div className="flex flex-col gap-7">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.72fr)]">
        <section className="min-h-[420px] rounded-[28px] bg-ui-surface p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4 px-1">
            <div className="flex items-center gap-2.5">
              <AppIcon name="folder" size={20} className="text-[#FFB020]" />
              <h2 className="text-[17px] font-black text-ui-ink-strong">Folders</h2>
            </div>
            <span className="text-[12px] font-extrabold text-ui-muted">
              {collections.length}
            </span>
          </div>

          {visibleCollections.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
              {visibleCollections.map((collection) => (
                <FolderItem
                  key={collection.id}
                  {...collection}
                  onSelect={() => onSelectCollection(collection.id)}
                  onDeleteRequest={() => onDeleteFolder(collection.id, collection.title)}
                />
              ))}
              {!normalizedSearch && (
                <FolderItem id="new-folder" title="New Folder" isNewButton onSelect={onCreateFolder} />
              )}
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[24px] bg-ui-surface px-6 text-center">
              <AppIcon name="folder" size={40} className="mb-3 text-ui-muted" />
              <p className="text-[16px] font-black text-ui-ink">No matching folder</p>
              <ActionButton
                variant="secondary"
                size="sm"
                onClick={() => onSearchChange('')}
                className="mt-4"
              >
                Clear search
              </ActionButton>
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-6">
          <LibraryRecentCardsCard
            items={recentItems}
            onSelectWord={onSelectWord}
          />
        </aside>
      </div>
    </div>
  );
}
