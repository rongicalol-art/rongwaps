import { SAMPLE_BOOKS } from '../../../data/books';
import { AppIcon, SegmentedControl } from '../../../lib/widgets';

export type DictionaryMode = 'dictionary' | 'courses';

interface DictionaryModeTabsProps {
  mode: DictionaryMode;
  selectedBookId: number | null;
  onChange: (mode: DictionaryMode) => void;
}

export function DictionaryModeTabs({ mode, selectedBookId, onChange }: DictionaryModeTabsProps) {
  return (
    <SegmentedControl
      value={mode}
      onChange={onChange}
      ariaLabel="Search source"
      className="w-full"
      options={[
        {
          value: 'dictionary',
          label: 'Dictionary',
          icon: <AppIcon name="dictionary" size={17} />,
        },
        {
          value: 'courses',
          label: selectedBookId
            ? SAMPLE_BOOKS.find((book) => book.id === selectedBookId)?.label || `Book ${selectedBookId}`
            : 'Course',
          icon: <AppIcon name="books" size={17} />,
        },
      ]}
    />
  );
}
