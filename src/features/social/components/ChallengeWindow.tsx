import { useCallback, useEffect, useState } from 'react';
import { ActionButton, AppIcon, IconActionButton, LoadingScreen, WorkspaceWindow } from '../../../lib/widgets';
import { loadChallenge } from '../../../services/challengeService';
import { challengeLesson, type ChallengeLesson, type ChallengeLink } from '../../../../shared/challenge';
import { ChallengeInvite, challengeLessonLine } from './ChallengeInvite';

export type ChallengeLoad = { state: 'loading' } | { state: 'ready'; link: ChallengeLink } | { state: 'gone' } | { state: 'error' };

/** The challenge behind a link: loading, ready, gone (expired, unknown or hidden), or a failed load to retry. */
export function useChallengeLink(code: string): [ChallengeLoad, () => void] {
  const [load, setLoad] = useState<ChallengeLoad>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setLoad({ state: 'loading' });
    loadChallenge(code).then(
      (link) => { if (live) setLoad(link ? { state: 'ready', link } : { state: 'gone' }); },
      () => { if (live) setLoad({ state: 'error' }); },
    );
    return () => { live = false; };
  }, [code, attempt]);
  return [load, useCallback(() => setAttempt((value) => value + 1), [])];
}

/** A signed-in learner opened a challenge link: who sent it, then Start. */
export function ChallengeWindow({ code, lesson, onStart, onClose }: {
  code: string;
  /** From the address, until the challenge itself says. */
  lesson: ChallengeLesson;
  onStart: (link: ChallengeLink) => void;
  onClose: () => void;
}) {
  const [load, retry] = useChallengeLink(code);
  const link = load.state === 'ready' ? load.link : null;
  const shown = (link && challengeLesson(link.selection)) ?? lesson;
  return (
    <WorkspaceWindow role="dialog" aria-modal="true" aria-label="Challenge" layer="window">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="px-4 pt-6 sm:px-6 md:pt-8 lg:px-10">
          <IconActionButton size="lg" label="Close" onClick={onClose} icon={<AppIcon name="close" size={22} />} />
        </div>
        <main className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 pb-16">
          {load.state === 'loading' ? <LoadingScreen inline message="Opening challenge…" tone="canvas" />
            : load.state === 'gone' ? (
              <ChallengeInvite lesson={shown} name={null} color="blue" headline="This challenge has ended" line="Challenge links last 30 days.">
                <ActionButton size="lg" fullWidth onClick={onClose}>Close</ActionButton>
              </ChallengeInvite>
            ) : load.state === 'error' ? (
              <ChallengeInvite lesson={shown} name={null} color="blue" headline="Couldn’t open this challenge" line="Check your connection.">
                <ActionButton size="lg" fullWidth onClick={retry}>Try again</ActionButton>
              </ChallengeInvite>
            ) : link?.mine ? (
              <ChallengeInvite lesson={shown} name={link.name} color={link.color} headline="Your challenge" line="Send this link to a classmate to race your run.">
                <ActionButton size="lg" fullWidth onClick={onClose}>Close</ActionButton>
              </ChallengeInvite>
            ) : link ? (
              <ChallengeInvite lesson={shown} name={link.name} color={link.color} headline={`Race ${link.name}’s run`} line={challengeLessonLine(shown)}>
                <ActionButton size="lg" fullWidth onClick={() => onStart(link)}>Start</ActionButton>
              </ChallengeInvite>
            ) : null}
        </main>
      </div>
    </WorkspaceWindow>
  );
}
