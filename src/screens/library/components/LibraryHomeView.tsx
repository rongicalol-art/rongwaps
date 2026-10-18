import type { ReactNode } from 'react';
import { ActionButton } from '../../../lib/widgets';
import { FolderItem } from './FolderItem';
import { LibraryRecentChips, type RecentItem } from './LibraryRecentChips';

interface LibraryCollectionSummary {
  id: string;
  title: string;
  count: number;
  icon?: ReactNode;
  accentBg?: string;
  accentBorder?: string;
  colorFront?: string;
}

interface LibraryHomeViewProps {
  reviewCard?: ReactNode;
  collections: LibraryCollectionSummary[];
  recentItems?: RecentItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCollection: (id: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onCreateFolder: () => void;
  onSelectWord?: (word: string) => void;
}

/** Library home: your folders straight on the page, one line of totals, recently added words. */
export function LibraryHomeView({
  reviewCard,
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
    ? collections.filter((collection) => (collection.title ?? '').toLowerCase().includes(normalizedSearch))
    : collections;
  const totalCards = collections.reduce((sum, collection) => sum + (collection.count || 0), 0);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(260px,1fr)] lg:gap-8">
      <section
        aria-label="Folders"
        className="min-w-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-black text-ui-ink-strong">Your folders</h2>
          <span className="text-[13px] font-extrabold text-ui-muted">
            {totalCards} {totalCards === 1 ? 'card' : 'cards'} in {collections.length} {collections.length === 1 ? 'folder' : 'folders'}
          </span>
        </div>

        {visibleCollections.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6">
            {visibleCollections.map((collection) => (
              <FolderItem
                key={collection.id}
                {...collection}
                onSelect={() => onSelectCollection(collection.id)}
                onDeleteRequest={() => onDeleteFolder(collection.id, collection.title)}
              />
            ))}
            {!normalizedSearch && (
              <FolderItem id="new-folder" title="New folder" isNewButton onSelect={onCreateFolder} />
            )}
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center px-6 text-center">
            <p className="text-[17px] font-black text-ui-ink-strong">No matching folder</p>
            <ActionButton variant="secondary" size="sm" onClick={() => onSearchChange('')} className="mt-4">
              Clear search
            </ActionButton>
          </div>
        )}
      </section>

      <aside className="grid min-w-0 gap-7 sm:grid-cols-2 lg:grid-cols-1">
        {reviewCard}
        <LibraryRecentChips items={recentItems} onSelectWord={onSelectWord} />
      </aside>
    </div>
  );
}
