import { LevelTag } from '../../../../lib/widgets';
import { BreakdownRow } from './BreakdownRow';
import { useCharBreakdownState } from '../../../../hooks/useCharBreakdown';
import { useLevels } from '../../../../hooks/useLevels';
import { usePrimaryReading } from '../../../../hooks/usePronunciation';
import { isPureVariantDefinition } from '../../../../utils/vocabulary/dictionaryDefinitions';
import { resolveLevel } from '../../../../utils/lesson/levels';
import { numberToToneMarks } from '../../../../utils/pinyin/pinyin';
import type { BuiltWithMember } from '../../utils/rankBuiltWith';

/** A sound-alike as a standard reference row (glyph, pinyin over meaning, lesson or level); pure variants hidden. */
export function SoundRow({ member, onOpen }: {
  member: BuiltWithMember;
  onOpen: (character: string) => void;
}) {
  const levels = useLevels();
  const { data, isLoading } = useCharBreakdownState(member.character);
  const pinyin = numberToToneMarks(usePrimaryReading(member.character, data?.pinyin?.[0]));
  const gloss = data?.definition?.split(';')[0]?.trim() || '';
  if (!isLoading && gloss && isPureVariantDefinition(gloss)) return null;
  return (
    <BreakdownRow
      glyph={member.character}
      pinyin={pinyin}
      meaning={gloss}
      loading={isLoading}
      onClick={() => onOpen(member.character)}
      ariaLabel={`Open ${member.character}${gloss ? `, ${gloss}` : ''}`}
      trailing={<LevelTag bookId={member.bookId} lessonId={member.lessonId} level={resolveLevel(member.character, levels)} />}
    />
  );
}
