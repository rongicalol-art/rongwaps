import { PiBookOpenFill, PiBooksBold } from 'react-icons/pi';
import { Soft3DButton } from '../../../lib/widgets';

export type DictionaryMode = 'dictionary' | 'courses';

interface DictionaryModeTabsProps {
  mode: DictionaryMode;
  selectedBookId: number | null;
  onChange: (mode: DictionaryMode) => void;
}

export function DictionaryModeTabs({ mode, selectedBookId, onChange }: DictionaryModeTabsProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 rounded-[22px] bg-ui-canvas p-2">
      <Soft3DButton
        type="button"
        variant="custom"
        depth="sm"
        onClick={() => onChange('dictionary')}
        className={`rounded-[16px] px-3 py-2.5 text-[12px] shadow-none ${
          mode === 'dictionary'
            ? 'border-[#1899D6] bg-[#1CB0F6] text-white'
            : 'border-ui-border bg-white text-ui-muted-strong'
        }`}
      >
        <PiBookOpenFill size={17} />
        Dictionary
      </Soft3DButton>
      <Soft3DButton
        type="button"
        variant="custom"
        depth="sm"
        onClick={() => onChange('courses')}
        className={`rounded-[16px] px-3 py-2.5 text-[12px] shadow-none ${
          mode === 'courses'
            ? 'border-[#1899D6] bg-[#1CB0F6] text-white'
            : 'border-ui-border bg-white text-ui-muted-strong'
        }`}
      >
        <PiBooksBold size={17} />
        {selectedBookId ? `Book ${selectedBookId}` : 'Course words'}
      </Soft3DButton>
    </div>
  );
}
