import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CollectionListItem } from './CollectionListItem';
import { DBDictionaryEntry } from '../../types/database';
import { UserFlashcard } from '../../types/models';

interface VirtualizedListProps {
  items: any[];
  libraryActiveFolder: string;
  activeCollection: any;
  toggleFavorite: (id: string) => void;
  handleDeleteCustomCard: (id: string) => void;
  setDictionaryWord: (w: string) => void;
}

export function VirtualizedList({ 
  items, 
  libraryActiveFolder, 
  activeCollection, 
  toggleFavorite, 
  handleDeleteCustomCard, 
  setDictionaryWord 
}: VirtualizedListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72, 
    overscan: 5,
  });

  return (
    <div 
      ref={parentRef} 
      className="w-full max-h-[60vh] overflow-auto custom-scrollbar"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = items[virtualRow.index];
          const isStarred = libraryActiveFolder === 'starred';
          const key = isStarred 
            ? `star-${(item as DBDictionaryEntry).traditional}` 
            : `custom-${(item as UserFlashcard).id}`;

          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <CollectionListItem 
                 item={item}
                 activeTab={libraryActiveFolder}
                 accentColor={activeCollection.accentColor}
                 onAction={isStarred 
                   ? () => toggleFavorite((item as DBDictionaryEntry).traditional) 
                   : () => handleDeleteCustomCard((item as UserFlashcard).id)}
                 onClick={isStarred 
                   ? () => setDictionaryWord((item as DBDictionaryEntry).traditional) 
                   : () => setDictionaryWord((item as UserFlashcard).traditional || (item as UserFlashcard).simplified)}
                 isLast={virtualRow.index === items.length - 1}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
