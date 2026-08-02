import type { GrammarExerciseProfile } from '../../../types/models';
import { CountryFlag, RongWapsCharacterPortrait } from '../../../lib/widgets';

interface ExerciseProfileStripProps {
  profiles: GrammarExerciseProfile[];
}

export function ExerciseProfileStrip({ profiles }: ExerciseProfileStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Exercise profiles">
      {profiles.map((profile) => (
        <article
          key={profile.id}
          className="flex min-h-[104px] items-center gap-2 rounded-[18px] border border-ui-divider bg-ui-surface p-3 text-left sm:min-h-[116px] sm:gap-4 sm:p-4"
        >
          <RongWapsCharacterPortrait
            character={profile.avatar}
            label={`${profile.surname}${profile.givenName}`}
            className="h-14 w-14 shrink-0 rounded-[16px] sm:h-[72px] sm:w-[72px]"
          />
          <div className="min-w-0">
            <p className="font-chinese text-sm font-black text-ui-ink-strong sm:text-lg">
              {profile.surname}{profile.givenName}
            </p>
            <p className="truncate text-[10px] font-bold text-ui-muted-strong sm:text-sm">{profile.fullNamePinyin}</p>
            <p className="mt-1.5 flex items-center gap-1.5 font-chinese text-xs font-bold text-ui-ink sm:mt-2 sm:gap-2 sm:text-base">
              <CountryFlag code={profile.countryCode} alt="" className="w-5 sm:w-6" />
              {profile.country}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
