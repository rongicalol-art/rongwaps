import { CharacterBreakdown } from './CharacterBreakdown';
import { SAMPLE_BOOKS } from '../../../data/books';
import { DetailShell } from '../../../lib/widgets';

type CourseBook = (typeof SAMPLE_BOOKS)[number];

interface DeepBreakdownModalProps {
  initialChar: string;
  onClose: () => void;
  activeBook: CourseBook;
  onWordClick?: (char: string) => void;
}

export function DeepBreakdownModal({ initialChar, onClose, onWordClick }: DeepBreakdownModalProps) {
  return (
    <DetailShell
      ariaLabel={`Component tree for ${initialChar}`}
      title="Component tree"
      onClose={onClose}
      maxWidthClassName="max-w-[900px]"
      contentInnerClassName="pb-24"
    >
      <CharacterBreakdown character={initialChar} selectedCharIndex={0} onWordClick={onWordClick} />
    </DetailShell>
  );
}
