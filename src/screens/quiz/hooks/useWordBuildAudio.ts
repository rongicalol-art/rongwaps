import { useCallback, useEffect, useRef, useState } from 'react';
import type { Flashcard } from '../../../data/flashcards';
import { useAppStore } from '../../../store/useAppStore';
import { usePronunciation } from '../../../hooks/usePronunciation';
import { audioService } from '../../../services/audioService';
import { getCourseVocabLookupMap } from '../../../services/courseVocabLookup';
import { getPronunciationAudioIndex } from '../../../services/pronunciationAudio';
import { resolveWordBuildTileAudio, wordBuildTileReading, wordBuildTileSpeech } from '../utils/wordBuildAudio';

/** A tile plays a recording (file name) or the cloud voice saying the character with its reading in this word. */
type TileSound = string | { text: string; reading: string };

/** Resolve readings and warm current clips without re-rendering or blocking the quiz. */
export function useWordBuildAudio(card: Flashcard, tiles: string[], enabled: boolean) {
  const readings = usePronunciation();
  const tileAudioRef = useRef<{ key: string; clips: Map<string, TileSound> } | null>(null);
  const [audioError, setAudioError] = useState('');
  const audioRequest = useRef(0);
  const lookupRequest = useRef(0);
  const tilePlaying = useRef(false);
  const pendingClipsRef = useRef<{ key: string; promise: Promise<Map<string, TileSound>> } | null>(null);
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const audioKey = `${card.id}|${card.front}|${card.pinyin}`;
  const tilesKey = [...new Set(tiles)].join('');
  const cancelTileAudio = useCallback((stopEngine = true) => {
    audioRequest.current++;
    if (tilePlaying.current) {
      tilePlaying.current = false;
      if (stopEngine) audioService.pause();
    }
  }, []);
  const clearAudioError = useCallback(() => {
    setAudioError((prev) => (prev ? '' : prev));
  }, []);

  useEffect(() => {
    const playbackCounter = audioRequest;
    const playing = tilePlaying;
    return () => {
      playbackCounter.current++;
      if (playing.current) { playing.current = false; audioService.pause(); }
    };
  }, [audioKey]);

  useEffect(() => {
    const requestCounter = lookupRequest;
    const request = ++requestCounter.current;
    const controller = new AbortController();
    setAudioError((prev) => (prev ? '' : prev));
    const characters = Array.from(tilesKey);
    const promise = getCourseVocabLookupMap().catch(() => new Map<string, Flashcard>()).then(async (recordings) => {
      const needsSounds = characters.some((char) => wordBuildTileReading(card, char, readings)
        && !resolveWordBuildTileAudio(card, char, recordings, undefined, readings));
      const sounds = needsSounds
        ? await getPronunciationAudioIndex().catch(() => new Map<string, string>()) : undefined;
      const clips = new Map<string, TileSound>();
      for (const char of characters) {
        const sound = resolveWordBuildTileAudio(card, char, recordings, sounds, readings) ?? wordBuildTileSpeech(card, char);
        if (sound) clips.set(char, sound);
      }
      if (requestCounter.current === request) {
        tileAudioRef.current = { key: audioKey, clips };
        const files = [...new Set([...clips.values()].filter((sound): sound is string => typeof sound === 'string'))];
        for (const sound of clips.values()) if (typeof sound !== 'string') audioService.prepareSpeech(sound.text, sound.reading);
        void audioService.preload(files, controller.signal).then(async () => {
          for (const audio of files) {
            if (controller.signal.aborted) return;
            await audioService.prepareRecording(audio, controller.signal, false);
          }
        }).catch(() => { /* Leaving the question cancels preparation. */ });
      }
      return clips;
    });
    pendingClipsRef.current = { key: audioKey, promise };
    return () => {
      controller.abort();
      requestCounter.current++;
    };
  }, [audioKey, card, tilesKey, readings]);

  const playClip = (audio: TileSound, request: number) => {
    if (audioRequest.current !== request) return;
    tilePlaying.current = true;
    const unavailable = () => { if (audioRequest.current === request) setAudioError('Recording unavailable.'); };
    const options = { fallback: 'none' as const, onUnavailable: unavailable };
    void (typeof audio === 'string'
      ? audioService.play(audio, pronunciationRate, undefined, undefined, 0, options)
      : audioService.speakReading(audio.text, audio.reading, pronunciationRate, options)
    ).catch(unavailable).then(() => { if (audioRequest.current === request) tilePlaying.current = false; });
  };

  const playTile = (char: string) => {
    if (!enabled) return;
    const request = ++audioRequest.current;
    if (tileAudioRef.current?.key === audioKey) {
      const audio = tileAudioRef.current.clips.get(char);
      if (!audio) {
        if (tilePlaying.current) { tilePlaying.current = false; audioService.pause(); }
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
    if (tilePlaying.current) { tilePlaying.current = false; audioService.pause(); }
    if (wordBuildTileReading(card, char, readings)) setAudioError('Audio is loading…');
  };

  return { playTile, cancelTileAudio, audioError, clearAudioError };
}
