import { ResumeDialog } from '../../../lib/widgets';
import { useActivityDataLoader } from '../../../hooks/useActivityDataLoader';
import type { PendingResume } from '../../../hooks/useResumeLaunch';
import { RESUME_ICON, resumeCopy, resumeDetail, resumeProgress } from '../../../utils/srs/resumeState';

interface ResumeLaunchProps {
  pending: PendingResume;
  onContinue: () => void;
  onStartOver: () => void;
  onClose: () => void;
}

/** The resume question over the screen the learner tapped from; the session window opens after the answer. */
export function ResumeLaunch({ pending, onContinue, onStartOver, onClose }: ResumeLaunchProps) {
  const { deck, resume } = pending;
  const { cards, isLoading } = useActivityDataLoader(deck.bookId, deck.lessons, deck.isReview, deck.isLibrary);
  const total = isLoading ? undefined : cards.length;
  const copy = resumeCopy(resume);
  return (
    <ResumeDialog
      title={copy.title}
      detail={resumeDetail(resume, total)}
      continueLabel={copy.continueLabel}
      startOverLabel={pending.activity === 'quiz' ? 'Restart quiz' : 'Study again'}
      icon={RESUME_ICON[resume.kind]}
      tone={resume.kind === 'review' ? 'review' : undefined}
      progress={resumeProgress(resume, total)}
      onContinue={onContinue}
      onStartOver={onStartOver}
      onClose={onClose}
    />
  );
}
