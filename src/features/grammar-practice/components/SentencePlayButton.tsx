import { useEffect } from 'react';
import { AppIcon, IconActionButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { playSentence } from '../../../services/audio/sentenceAudio';
import { useAppStore } from '../../../store/useAppStore';
import type { PracticeSentence } from '../../../types/models';
import { textIn, type PracticeScript } from '../practiceTypes';

/**
 * Hear the finished sentence in the result. Plays automatically when the learner's
 * `autoPlayAudio` or `replayAudioAfterAnswer` setting is on, using the configured speech speed.
 */
export function SentencePlayButton({ sentence, script }: { sentence: PracticeSentence; script: PracticeScript }) {
  const autoPlayAudio = useAppStore((state) => state.autoPlayAudio);
  const replayAudioAfterAnswer = useAppStore((state) => state.replayAudioAfterAnswer);
  const rate = useAppStore((state) => state.pronunciationRate);
  const play = () => void playSentence(textIn(sentence, script), sentence.audio, script, rate);

  useEffect(() => {
    if (autoPlayAudio || replayAudioAfterAnswer) {
      void playSentence(textIn(sentence, script), sentence.audio, script, rate);
    }
    return () => audioService.pause();
    // Plays once per result; a settings change mid-result must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentence]);

  return (
    <IconActionButton
      onClick={play}
      size="sm"
      variant="quiet"
      icon={<AppIcon name="audio" size={22} />}
      label={sentence.audio?.voice === 'book' ? 'Play the sentence (book recording)' : 'Play the sentence'}
      className="-my-1 shrink-0 text-ui-ink-strong hover:brightness-90"
    />
  );
}
