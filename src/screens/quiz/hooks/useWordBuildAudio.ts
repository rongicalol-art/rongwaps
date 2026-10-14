import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { usePronunciation } from '../../../hooks/usePronunciation';
import { audioService } from '../../../services/audioService';
import { getCourseVocabLookupMap } from '../../../services/courseVocabLookup';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { resolveWordBuildTileAudio, wordBuildTileReading } from '../utils/wordBuildAudio';

/** Resolve readings and warm a few current clips without playing or blocking the quiz. */
export function useWordBuildAudio(card: Flashcard, tiles: string[], enabled: boolean) {
  const readings = usePronunciation();
  const [tileAudio, setTileAudio] = useState<{ key: string; clips: Map<string, string> } | null>(null);
  const [audioError, setAudioError] = useState('');
  const audioRequest = useRef(0);
  const lookupRequest = useRef(0);
  const tilePlaying = useRef(false);
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const audioKey = `${card.id}|${card.front}|${card.pinyin}`;
  const cancelTileAudio = useCallback(() => {
    audioRequest.current++;
    if (tilePlaying.current) { tilePlaying.current = false; audioService.stop(); }
  }, []);

  useEffect(() => {
    const requestCounter = lookupRequest;
    const playbackCounter = audioRequest;
    const playing = tilePlaying;
    const request = ++requestCounter.current;
    const controller = new AbortController();
    setAudioError('');
    if (enabled) {
      void getCourseVocabLookupMap().catch(() => new Map<string, Flashcard>()).then(async (recordings) => {
        const characters = [...new Set(tiles)];
        const needsSounds = characters.some((char) => wordBuildTileReading(card, char, readings)
          && !resolveWordBuildTileAudio(card, char, recordings, undefined, readings));
        const sounds = needsSounds
          ? await getPronunciationAudioIndex().catch(() => new Map<string, string>()) : undefined;
        if (requestCounter.current !== request) return;
        const clips = new Map<string, string>();
        for (const char of characters) {
          const audio = resolveWordBuildTileAudio(card, char, recordings, sounds, readings);
          if (audio) clips.set(char, audio);
        }
        setTileAudio({ key: audioKey, clips });
        setAudioError('');
        void audioService.preload([...new Set(clips.values())].slice(0, 4), controller.signal);
      });
    }
    return () => {
      controller.abort();
      requestCounter.current++;
      playbackCounter.current++;
      if (playing.current) { playing.current = false; audioService.stop(); }
    };
  }, [audioKey, card, tiles, readings, enabled]);

  const playTile = (char: string) => {
    const audio = tileAudio?.key === audioKey ? tileAudio.clips.get(char) : undefined;
    const request = ++audioRequest.current;
    if (!audio) {
      if (tilePlaying.current) { tilePlaying.current = false; audioService.stop(); }
      if (tileAudio?.key !== audioKey && wordBuildTileReading(card, char, readings)) setAudioError('Audio is loading…');
      return;
    }
    tilePlaying.current = true;
    const unavailable = () => { if (audioRequest.current === request) setAudioError('Recording unavailable.'); };
    void audioService.play(audio, pronunciationRate, undefined, undefined, 0, {
      fallback: 'none', onUnavailable: unavailable,
    }).catch(unavailable).then(() => { if (audioRequest.current === request) tilePlaying.current = false; });
  };

  return { playTile, cancelTileAudio, audioError, clearAudioError: () => setAudioError('') };
}
