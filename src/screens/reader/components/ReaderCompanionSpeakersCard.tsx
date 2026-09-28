import React, { useMemo, useState } from 'react';
import type { ReadingRecord, RongWapsCharacter } from '../../../types/models';
import {
  CHARACTER_PROFILES,
  getCharacterForSpeaker,
  type CharacterProfileInfo,
} from '../../../utils/speakerCharacters';
import { AppIcon, RongWapsCharacterPortrait } from '../../../lib/widgets';
import { cn } from '../../../utils/cn';

export interface ReaderCompanionSpeakersCardProps {
  reading: ReadingRecord;
  characterPreference: 'traditional' | 'simplified';
  onClose?: () => void;
  showCloseButton?: boolean;
}

interface SpeakerSummary {
  name: string;
  charId: RongWapsCharacter | null;
  profile: CharacterProfileInfo | null;
  lineCount: number;
}

export const ReaderCompanionSpeakersCard = React.memo(function ReaderCompanionSpeakersCard({
  reading,
  characterPreference,
}: ReaderCompanionSpeakersCardProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isNarrative = reading.dialogueNumber === 3 || reading.title.includes('短文');

  const speakers = useMemo(() => {
    const map = new Map<
      string,
      { charId: RongWapsCharacter | null; profile: CharacterProfileInfo | null; lineCount: number }
    >();

    for (const paragraph of reading.paragraphs) {
      const rawSpeaker = paragraph.speaker?.trim();
      if (!rawSpeaker || rawSpeaker.toLowerCase() === 'narrator') continue;

      const existing = map.get(rawSpeaker);
      if (existing) {
        existing.lineCount += 1;
      } else {
        const charId = getCharacterForSpeaker(rawSpeaker);
        const profile = charId ? CHARACTER_PROFILES[charId] : null;
        map.set(rawSpeaker, { charId, profile, lineCount: 1 });
      }
    }

    return Array.from(map.entries()).map(([name, data]): SpeakerSummary => ({
      name,
      ...data,
    }));
  }, [reading.paragraphs]);

  if (isNarrative || speakers.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Dialogue Speakers"
      className="shrink-0 rounded-2xl bg-ui-surface border-2 border-ui-border border-b-[length:var(--depth-md)] shadow-xs p-3 sm:p-3.5 flex flex-col gap-2"
    >
      {/* Harmonized Bento Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AppIcon name="profile" size={16} className="text-ui-muted-strong shrink-0" />
          <h3 className="font-sans text-xs font-black uppercase tracking-wider text-ui-muted-strong">
            Characters
          </h3>
          <span
            className="font-sans text-[10px] font-black px-1.5 py-0.5 rounded-full bg-ui-surface-soft text-ui-muted-strong"
            title="Characters in this reading"
          >
            {speakers.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1 rounded-lg text-ui-muted hover:text-ui-ink-strong hover:bg-ui-surface-soft transition-colors focus-ring"
          title={isCollapsed ? 'Expand characters' : 'Collapse characters'}
          aria-expanded={!isCollapsed}
        >
          <AppIcon
            name="dropdown"
            size={15}
            className={cn('transition-transform duration-200', !isCollapsed && 'rotate-180')}
          />
        </button>
      </div>

      {!isCollapsed && (
        <div className="flex flex-col gap-1 pt-0.5">
          {speakers.map((speaker) => {
            const displayName =
              characterPreference === 'simplified' && speaker.profile?.nameSimplified
                ? speaker.profile.nameSimplified
                : speaker.profile?.nameTraditional || speaker.name;

            return (
              <div
                key={speaker.name}
                className="group flex min-h-9 w-full items-center gap-2.5 rounded-compact px-2 py-1 text-left transition-colors hover:bg-ui-hover select-none"
              >
                {/* Compact Portrait */}
                <div className="h-7 w-7 rounded-full overflow-hidden bg-ui-hover shrink-0 flex items-center justify-center">
                  {speaker.charId ? (
                    <RongWapsCharacterPortrait
                      character={speaker.charId}
                      label={displayName}
                      className="h-full w-full"
                    />
                  ) : (
                    <span className="font-chinese font-bold text-xs text-brand-primary">
                      {speaker.name[0]}
                    </span>
                  )}
                </div>

                {/* Speaker Identity: Chinese name + English name */}
                <div className="flex items-baseline min-w-0 flex-1 gap-1.5">
                  <span className="font-chinese text-sm font-bold leading-tight text-ui-ink-strong group-hover:text-brand-primary transition-colors">
                    {displayName}
                  </span>
                  {speaker.profile?.englishName && (
                    <span className="font-sans text-xs font-bold text-ui-muted truncate">
                      {speaker.profile.englishName}
                    </span>
                  )}
                </div>

                {/* Quiet dialogue line count */}
                <span className="shrink-0 font-sans text-xs font-bold text-ui-muted-strong tabular-nums">
                  {speaker.lineCount} lines
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
});
