import type { ReactNode } from 'react';
import { ActionButton, SectionEyebrow } from '../../../lib/widgets';
import { FolderItem } from './FolderItem';
import type { MenuPoint } from './LibraryContextMenu';
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
  progressCard?: ReactNode;
  collections: LibraryCollectionSummary[];
  recentItems?: RecentItem[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCollection: (id: string) => void;
  onFolderMenu: (id: string, point: MenuPoint) => void;
  onCreateFolder: () => void;
  onSelectWord?: (word: string) => void;
}

/** Library home: your folders straight on the page, one line of totals, recently added words. */
export function LibraryHomeView({
  reviewCard,
  progressCard,
  collections,
  recentItems = [],
  searchQuery,
  onSearchChange,
  onSelectCollection,
  onFolderMenu,
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
      <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
        <section
          aria-label="Folders"
          className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6"
        >
          <SectionEyebrow
            title="Folders"
            action={(
              <span className="text-[13px] font-extrabold text-ui-muted">
                {totalCards} {totalCards === 1 ? 'card' : 'cards'} in {collections.length} {collections.length === 1 ? 'folder' : 'folders'}
              </span>
            )}
          />

          {visibleCollections.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6">
              {visibleCollections.map((collection) => (
                <FolderItem
                  key={collection.id}
                  {...collection}
                  onSelect={() => onSelectCollection(collection.id)}
                  onMenuRequest={(point) => onFolderMenu(collection.id, point)}
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

        <section className="min-w-0 rounded-feature border-b-[length:var(--depth-md)] border-ui-border bg-ui-surface p-4 sm:p-6">
          <LibraryRecentChips items={recentItems} onSelectWord={onSelectWord} />
        </section>
      </div>

      {(reviewCard || progressCard) && (
        <aside className="order-first flex min-w-0 flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:sticky-rail">
          {reviewCard}
          {progressCard}
        </aside>
      )}
    </div>
  );
}
