import type { ReactNode } from 'react';
import { Avatar } from '../../../lib/widgets';
import { getReadingIllustration } from '../../../data/readingIllustrations';
import type { ChallengeLesson } from '../../../../shared/challenge';
import type { SocialColor } from '../../../../shared/quizRace';

/** The lesson's picture: its first reading's illustration (the art its lesson tile and link preview show). */
export function challengePicture({ book, lesson }: ChallengeLesson) {
  return getReadingIllustration(`B${book}L${String(lesson).padStart(2, '0')}-R01`);
}

/**
 * What a challenge link opens to: the lesson picture with the sender's face on its edge, one headline, one quiet
 * line, then the action (Continue with Google, or Start). Says its message once.
 */
export function ChallengeInvite({ lesson, name, color, headline, line, children }: {
  lesson: ChallengeLesson;
  /** The sender; null when not known (signed out, or the challenge ended). */
  name: string | null;
  color: SocialColor;
  headline: string;
  line?: string;
  children: ReactNode;
}) {
  const picture = challengePicture(lesson);
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center text-center">
      <div className="relative w-full">
        {picture
          ? <img src={picture.url} alt={picture.alt} className="block aspect-video w-full rounded-feature object-cover" />
          : <div className="aspect-video w-full rounded-feature bg-brand-primary-soft" />}
        {name && (
          <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 rounded-full border-4 border-ui-canvas">
            <Avatar name={name} color={color} size="xl" className="!h-14 !w-14 !text-2xl !ring-0" />
          </span>
        )}
      </div>
      <h1 className={`${name ? 'mt-11' : 'mt-6'} text-balance text-2xl font-black text-ui-ink-strong`}>{headline}</h1>
      {line && <p className="mt-1.5 text-sm font-bold text-ui-muted-strong">{line}</p>}
      <div className="mt-6 w-full">{children}</div>
    </div>
  );
}

export const challengeLessonLine = ({ book, lesson }: ChallengeLesson) => `Book ${book} · Lesson ${lesson}`;
