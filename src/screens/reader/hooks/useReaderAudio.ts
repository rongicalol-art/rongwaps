import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DialogueAlignment, ReadingRecord } from '../../../types/models';
import { audioService } from '../../../services/audioService';
import { useAppStore } from '../../../store/useAppStore';
import {
  alignmentDuration,
  lineIndexForTime,
} from '../../../utils/dialogueSync';
import { officialAudioFileName } from '../../../utils/officialAudio';

export interface UseReaderAudioOptions {
  reading: ReadingRecord;
  alignment: DialogueAlignment | null;
  characterPreference: 'traditional' | 'simplified';
  audioMode: 'book' | 'tts';
}

export function useReaderAudio({
  reading,
  alignment,
  characterPreference,
  audioMode,
}: UseReaderAudioOptions) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isLooping, setIsLooping] = useState(false);

  const playbackTokenRef = useRef(0);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const isLoopingRef = useRef(isLooping);
  isLoopingRef.current = isLooping;

  const playbackSpeedRef = useRef(playbackSpeed);
  playbackSpeedRef.current = playbackSpeed;

  const bookAudioFileName = useMemo(
    () => officialAudioFileName(reading.bookId, reading.audioReference),
    [reading.bookId, reading.audioReference],
  );

  const totalDuration = useMemo(
    () => (alignment ? alignmentDuration(alignment) : 0),
    [alignment],
  );

  const canKaraoke = Boolean(alignment && bookAudioFileName);

  const fullText = useMemo(
    () => reading.paragraphs
      .map((p) => (characterPreference === 'simplified' ? p.simplified : p.traditional))
      .join(''),
    [characterPreference, reading.paragraphs],
  );

  // Warm dialogue track in advance
  useEffect(() => {
    if (bookAudioFileName) {
      void audioService.preload([bookAudioFileName]);
    }
  }, [bookAudioFileName]);

  // Reset audio on reading switch
  useEffect(() => {
    playbackTokenRef.current += 1;
    audioService.stop();
    setPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
  }, [reading.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      playbackTokenRef.current += 1;
      audioService.stop();
    };
  }, []);

  const activeLineIndex = useMemo(() => {
    if (!alignment || (!playing && currentTime === 0)) return null;
    return lineIndexForTime(alignment, currentTime);
  }, [alignment, playing, currentTime]);

  const playRange = useCallback((startSec: number, endSec: number) => {
    if (!bookAudioFileName) return;
    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;
    setPlaying(true);
    setCurrentTime(startSec);
    currentTimeRef.current = startSec;

    void audioService.playRange(bookAudioFileName, startSec, endSec, {
      rate: playbackSpeedRef.current,
      onTime: (time) => {
        if (playbackTokenRef.current === token) {
          setPlaying(true);
          setCurrentTime(time);
          currentTimeRef.current = time;
        }
      },
    }).then(() => {
      if (playbackTokenRef.current === token) {
        if (isLoopingRef.current) {
          playRange(startSec, endSec);
        } else {
          setPlaying(false);
          if (totalDuration > 0 && endSec >= totalDuration - 0.25) {
            setCurrentTime(0);
            currentTimeRef.current = 0;
          } else {
            setCurrentTime(endSec);
            currentTimeRef.current = endSec;
          }
        }
      }
    });
  }, [bookAudioFileName, totalDuration]);

  const pause = useCallback(() => {
    playbackTokenRef.current += 1;
    audioService.pause();
    setPlaying(false);
  }, []);

  const stop = useCallback(() => {
    playbackTokenRef.current += 1;
    audioService.stop();
    setPlaying(false);
    setCurrentTime(0);
    currentTimeRef.current = 0;
  }, []);

  const dictionaryWord = useAppStore((state) => state.dictionaryWord);
  useEffect(() => {
    if (dictionaryWord && playing) {
      pause();
    }
  }, [dictionaryWord, playing, pause]);

  const togglePlay = useCallback(() => {
    if (playing) {
      pause();
      return;
    }

    if (audioMode === 'tts' || !bookAudioFileName) {
      const locale = characterPreference === 'simplified' ? 'zh-CN' : 'zh-TW';
      setPlaying(true);
      void audioService.speakText(fullText, locale, 0.84 * playbackSpeedRef.current).then(() => {
        setPlaying(false);
      });
      return;
    }

    if (alignment) {
      const current = currentTimeRef.current;
      const startFrom = current > 0 && current < totalDuration ? current : 0;
      playRange(startFrom, totalDuration);
    } else {
      setPlaying(true);
      const current = currentTimeRef.current;
      void audioService.play(
        bookAudioFileName,
        playbackSpeedRef.current,
        fullText,
        undefined,
        current,
      ).then(() => {
        setPlaying(false);
      });
    }
  }, [playing, pause, audioMode, bookAudioFileName, characterPreference, fullText, alignment, totalDuration, playRange]);

  const playLine = useCallback((lineIndex: number) => {
    const line = alignment?.lines[lineIndex];
    const lineHasAlignment = Boolean(
      line && !line.unmatched && line.end > line.start && bookAudioFileName,
    );

    if (!lineHasAlignment) {
      // No usable alignment for this line (missing alignment entirely, or an
      // `unmatched` line the recording never cleanly spoke) — fall back to
      // TTS so tapping the sentence still plays it. Karaoke highlighting is
      // impossible without word timings.
      const paragraph = reading.paragraphs[lineIndex];
      if (paragraph) {
        const text = characterPreference === 'simplified' ? paragraph.simplified : paragraph.traditional;
        const locale = characterPreference === 'simplified' ? 'zh-CN' : 'zh-TW';
        setPlaying(true);
        void audioService.speakText(text, locale, 0.84 * playbackSpeedRef.current).then(() => {
          setPlaying(false);
        });
      }
      return;
    }

    // Play from this line through the rest of the reading — audio must keep
    // flowing past the line boundary instead of stopping at it.
    playRange(line!.start, totalDuration);
  }, [alignment, bookAudioFileName, characterPreference, playRange, totalDuration, reading.paragraphs]);

  const seekTo = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(timeSec, totalDuration));
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;

    // Immediately cue audio element to avoid seek delay on subsequent play
    const audio = audioService.getGlobalAudio();
    if (audio && !isNaN(audio.duration) && audio.duration > 0) {
      try {
        audio.currentTime = clamped;
      } catch { /* ignore */ }
    }

    if (playing && alignment && bookAudioFileName) {
      playRange(clamped, totalDuration);
    }
  }, [alignment, bookAudioFileName, playing, playRange, totalDuration]);

  const scrubTo = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(timeSec, totalDuration));
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;
  }, [totalDuration]);

  const prevSentence = useCallback(() => {
    if (!alignment || alignment.lines.length === 0) {
      seekTo(Math.max(0, currentTimeRef.current - 5));
      return;
    }
    const currentIdx = activeLineIndex ?? 0;
    const prevIdx = Math.max(0, currentIdx - 1);
    playLine(prevIdx);
  }, [activeLineIndex, alignment, playLine, seekTo]);

  const nextSentence = useCallback(() => {
    if (!alignment || alignment.lines.length === 0) {
      seekTo(Math.min(totalDuration, currentTimeRef.current + 5));
      return;
    }
    const currentIdx = activeLineIndex ?? -1;
    const nextIdx = Math.min(alignment.lines.length - 1, currentIdx + 1);
    playLine(nextIdx);
  }, [activeLineIndex, alignment, playLine, seekTo, totalDuration]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const currentIdx = speeds.indexOf(playbackSpeedRef.current);
    const nextSpeed = speeds[(currentIdx + 1) % speeds.length] ?? 1;
    playbackSpeedRef.current = nextSpeed;
    setPlaybackSpeed(nextSpeed);
    audioService.setPlaybackRate(nextSpeed);
  }, []);

  const toggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  const playFromTime = useCallback((startSec: number, endSec?: number) => {
    if (!bookAudioFileName) return;
    const targetEnd = endSec ?? totalDuration;
    playRange(startSec, targetEnd);
  }, [bookAudioFileName, totalDuration, playRange]);

  return {
    playing,
    currentTime,
    totalDuration,
    playbackSpeed,
    isLooping,
    canKaraoke,
    activeLineIndex,
    togglePlay,
    pause,
    playLine,
    playRange,
    playFromTime,
    stop,
    seekTo,
    scrubTo,
    prevSentence,
    nextSentence,
    cycleSpeed,
    toggleLoop,
  };
}
