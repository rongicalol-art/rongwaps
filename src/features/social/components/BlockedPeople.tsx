import { ActionButton, Avatar } from '../../../lib/widgets';
import { useAppStore } from '../../../store/useAppStore';
import { socialColor } from '../../../../shared/quizRace';
import { unblockPerson } from '../safety';

/** Settings → Study together: everyone this account blocked, each with Unblock. Hidden while the list is empty. */
export function BlockedPeople() {
  const blocks = useAppStore((state) => state.socialBlocks);
  if (!blocks?.length) return null;
  return (
    <div className="px-2 pt-2">
      <h4 className="pb-1 text-sm font-black text-ui-ink-strong">Blocked people</h4>
      {blocks.map((person) => (
        <div key={person.u} className="flex items-center gap-3 py-2">
          <Avatar name={person.n || '?'} color={socialColor(person.c)} size="md" />
          <span className="min-w-0 flex-1 truncate text-sm font-black text-ui-ink-strong">{person.n || 'Learner'}</span>
          <ActionButton size="sm" variant="secondary" className="normal-case tracking-normal" onClick={() => void unblockPerson(person)}>Unblock</ActionButton>
        </div>
      ))}
    </div>
  );
}
