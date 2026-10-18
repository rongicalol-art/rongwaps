import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { usePronunciation } from '../../../hooks/usePronunciation';
import { audioService } from '../../../services/audioService';
import { getCourseVocabLookupMap } from '../../../services/courseVocabLookup';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { resolveWordBuildTileAudio, wordBuildTileReading } from '../utils/wordBuildAudio';

/** Resolve readings and warm current clips without re-rendering or blocking the quiz. */
export function useWordBuildAudio(card: Flashcard, tiles: string[], enabled: boolean) {
  const readings = usePronunciation();
  const tileAudioRef = useRef<{ key: string; clips: Map<string, string> } | null>(null);
  const [audioError, setAudioError] = useState('');
  const audioRequest = useRef(0);
  const lookupRequest = useRef(0);
  const tilePlaying = useRef(false);
  const pendingClipsRef = useRef<{ key: string; promise: Promise<Map<string, string>> } | null>(null);
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const audioKey = `${card.id}|${card.front}|${card.pinyin}`;
  const tilesKey = [...new Set(tiles)].join('');
  const cancelTileAudio = useCallback(() => {
    audioRequest.current++;
    if (tilePlaying.current) { tilePlaying.current = false; audioService.stop(); }
  }, []);
  const clearAudioError = useCallback(() => {
    setAudioError((prev) => (prev ? '' : prev));
  }, []);

  useEffect(() => {
    const playbackCounter = audioRequest;
    const playing = tilePlaying;
    return () => {
      playbackCounter.current++;
      if (playing.current) { playing.current = false; audioService.stop(); }
    };
  }, [audioKey, enabled]);

  useEffect(() => {
    const requestCounter = lookupRequest;
    const request = ++requestCounter.current;
    const controller = new AbortController();
    setAudioError((prev) => (prev ? '' : prev));
    if (enabled) {
      const characters = Array.from(tilesKey);
      const promise = getCourseVocabLookupMap().catch(() => new Map<string, Flashcard>()).then(async (recordings) => {
        const needsSounds = characters.some((char) => wordBuildTileReading(card, char, readings)
          && !resolveWordBuildTileAudio(card, char, recordings, undefined, readings));
        const sounds = needsSounds
          ? await getPronunciationAudioIndex().catch(() => new Map<string, string>()) : undefined;
        const clips = new Map<string, string>();
        for (const char of characters) {
          const audio = resolveWordBuildTileAudio(card, char, recordings, sounds, readings);
          if (audio) clips.set(char, audio);
        }
        if (requestCounter.current === request) {
          tileAudioRef.current = { key: audioKey, clips };
          void audioService.preload([...new Set(clips.values())], controller.signal);
        }
        return clips;
      });
      pendingClipsRef.current = { key: audioKey, promise };
    }
    return () => {
      controller.abort();
      requestCounter.current++;
    };
  }, [audioKey, card, tilesKey, readings, enabled]);

  const playClip = (audio: string, request: number) => {
    if (audioRequest.current !== request) return;
    tilePlaying.current = true;
    const unavailable = () => { if (audioRequest.current === request) setAudioError('Recording unavailable.'); };
    void audioService.play(audio, pronunciationRate, undefined, undefined, 0, {
      overlap: true, fallback: 'none', onUnavailable: unavailable,
    }).catch(unavailable).then(() => { if (audioRequest.current === request) tilePlaying.current = false; });
  };

  const playTile = (char: string) => {
    const request = ++audioRequest.current;
    if (tileAudioRef.current?.key === audioKey) {
      const audio = tileAudioRef.current.clips.get(char);
      if (!audio) {
        if (tilePlaying.current) { tilePlaying.current = false; audioService.stop(); }
        return;
      }
      playClip(audio, request);
      return;
    }
    if (pendingClipsRef.current?.key === audioKey) {
      void pendingClipsRef.current.promise.then((clips) => {
        if (audioRequest.current !== request) return;
        const audio = clips.get(char);
        if (audio) playClip(audio, request);
      });
      return;
    }
    if (tilePlaying.current) { tilePlaying.current = false; audioService.stop(); }
    if (wordBuildTileReading(card, char, readings)) setAudioError('Audio is loading…');
  };

  return { playTile, cancelTileAudio, audioError, clearAudioError };
}
