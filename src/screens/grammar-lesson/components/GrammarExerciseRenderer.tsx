import type { InteractiveGrammarPage } from '../../../types/models';
import { DragBlankExercise } from './DragBlankExercise';
import { SentenceUnscrambleExercise } from './SentenceUnscrambleExercise';

interface GrammarExerciseRendererProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  onOpenWord: (word: string) => void;
  onComplete: () => void;
  onContinue: () => void;
  continueLabel: string;
  completionMessage: string;
}

export function GrammarExerciseRenderer(props: GrammarExerciseRendererProps) {
  if (props.page.exerciseType === 'unscramble') {
    return <SentenceUnscrambleExercise {...props} />;
  }
  return <DragBlankExercise {...props} standalone />;
}

