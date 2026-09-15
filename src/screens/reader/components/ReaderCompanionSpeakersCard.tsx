import React, { useMemo } from 'react';
import type { ReadingRecord } from '../../../types/models';
import {
  CHARACTER_PROFILES,
  getCharacterForSpeaker,
  type CharacterProfileInfo,
} from '../../../utils/speakerCharacters';
import {
  RongWapsCharacterPortrait,
  type RongWapsCharacter,
} from '../../../lib/widgets/RongWapsCharacterPortrait';

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
      className="shrink-0 rounded-3xl bg-ui-surface border-2 border-ui-border border-b-[length:var(--depth-md)] shadow-xs p-3.5 flex flex-col gap-1"
    >
      <div className="flex flex-col gap-1">
        {speakers.map((speaker) => {
          const displayName =
            characterPreference === 'simplified' && speaker.profile?.nameSimplified
              ? speaker.profile.nameSimplified
              : speaker.profile?.nameTraditional || speaker.name;

          return (
            <div
              key={speaker.name}
              className="group flex min-h-[48px] w-full items-center gap-3 rounded-2xl px-2.5 py-2 text-left transition-colors hover:bg-ui-hover select-none"
            >
              {/* Borderless Portrait */}
              <div className="h-10 w-10 rounded-full overflow-hidden bg-ui-hover shrink-0 flex items-center justify-center">
                {speaker.charId ? (
                  <RongWapsCharacterPortrait
                    character={speaker.charId}
                    label={displayName}
                    className="h-full w-full"
                  />
                ) : (
                  <span className="font-chinese font-bold text-base text-brand-primary">
                    {speaker.name[0]}
                  </span>
                )}
              </div>

              {/* Speaker Identity: Chinese name on top, English name below */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-chinese text-base font-bold leading-snug text-ui-ink-strong group-hover:text-brand-primary transition-colors">
                  {displayName}
                </span>
                {speaker.profile?.englishName && (
                  <span className="font-sans text-sm font-bold leading-snug text-ui-ink mt-0.5 truncate">
                    {speaker.profile.englishName}
                  </span>
                )}
              </div>

              {/* Dialogue line count token on the right */}
              <span className="shrink-0 font-sans text-xs font-bold px-2 py-0.5 rounded-full bg-ui-surface-soft text-ui-muted-strong">
                {speaker.lineCount} lines
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
});
