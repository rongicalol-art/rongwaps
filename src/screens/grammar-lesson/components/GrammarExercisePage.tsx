import type { InteractiveGrammarPage } from '../../../types/models';
import { GrammarExerciseRenderer } from './GrammarExerciseRenderer';

interface GrammarExercisePageProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
  onComplete: () => void;
  onContinue: () => void;
  continueLabel: string;
  completionMessage: string;
}

export function GrammarExercisePage({
  page,
  characterPreference,
  onOpenWord,
  onComplete,
  onContinue,
  continueLabel,
  completionMessage,
}: GrammarExercisePageProps) {
  return (
    <article className="mx-auto w-full max-w-5xl pb-8">
      <GrammarExerciseRenderer
        page={page}
        characterPreference={characterPreference}
        onOpenWord={onOpenWord}
        onComplete={onComplete}
        onContinue={onContinue}
        continueLabel={continueLabel}
        completionMessage={completionMessage}
      />
    </article>
  );
}

