import type { ReactNode } from 'react';
import { PiFolderFill } from 'react-icons/pi';
import { GraphPaperPanel, SearchBar3D, Soft3DButton } from '../../../lib/widgets';
import { FolderItem } from './FolderItem';
import { LibraryContinueCard } from './LibraryContinueCard';
import { LibraryStatsCard } from './LibraryStatsCard';

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
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onSelectCollection: (id: string) => void;
  onDeleteFolder: (id: string, name: string) => void;
  onCreateFolder: () => void;
  onPracticeCollection?: (id: string) => void;
  onAddCard?: () => void;
}

export function LibraryHomeView({
  collections,
  searchQuery,
  onSearchChange,
  onSelectCollection,
  onDeleteFolder,
  onCreateFolder,
  onPracticeCollection,
  onAddCard,
}: LibraryHomeViewProps) {
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const visibleCollections = normalizedSearch
    ? collections.filter((collection) => collection.title.toLowerCase().includes(normalizedSearch))
    : collections;
  const savedCount = collections.find((collection) => collection.id === 'starred')?.count ?? 0;
  const cardCount = collections
    .filter((collection) => collection.id !== 'starred')
    .reduce((total, collection) => total + collection.count, 0);
  const featuredCollection = collections.reduce(
    (best, collection) => (collection.count > best.count ? collection : best),
    collections[0],
  );

  return (
    <>
      <section className="mb-6">
        <SearchBar3D
          value={searchQuery}
          onValueChange={onSearchChange}
          onSubmit={onSearchChange}
          showSubmit={false}
          placeholder="Search folders and collections..."
        />
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <GraphPaperPanel className="min-h-[510px] p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4 px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <PiFolderFill size={22} className="text-[#FFB020]" />
              <h1 className="text-[14px] font-black uppercase tracking-wider text-ui-ink-strong">Folders</h1>
            </div>
            <span className="text-[11px] font-black uppercase tracking-wide text-ui-muted-strong">
              {collections.length} collections
            </span>
          </div>

          {visibleCollections.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] bg-white/80 px-6 text-center">
              <PiFolderFill size={42} className="mb-3 text-ui-muted" />
              <p className="text-[16px] font-black text-ui-ink">No folder matches that search.</p>
              <Soft3DButton
                variant="custom"
                depth="sm"
                onClick={() => onSearchChange('')}
                className="mt-3 w-auto rounded-[16px] border-[#BDEAFF] bg-[#E5F7FF] px-5 py-2.5 text-[12px] text-[#1CB0F6]"
              >
                Clear search
              </Soft3DButton>
            </div>
          )}
        </GraphPaperPanel>

        <aside className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
          <LibraryStatsCard savedCount={savedCount} cardCount={cardCount} folderCount={collections.length} />
          <LibraryContinueCard
            title={featuredCollection.title}
            itemCount={featuredCollection.count}
            onPractice={onPracticeCollection ? () => onPracticeCollection(featuredCollection.id) : undefined}
            onAddCard={onAddCard}
          />
        </aside>
      </div>
    </>
  );
}
