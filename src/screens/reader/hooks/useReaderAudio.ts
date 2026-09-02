import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DialogueAlignment } from '../../../data/dialogueAlignment';
import type { ReadingRecord } from '../../../types/models';
import { audioService } from '../../../services/audioService';
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

    void audioService.playRange(bookAudioFileName, startSec, endSec, {
      rate: playbackSpeedRef.current,
      onTime: (time) => {
        if (playbackTokenRef.current === token) {
          setPlaying(true);
          setCurrentTime(time);
        }
      },
    }).then(() => {
      if (playbackTokenRef.current === token) {
        if (isLoopingRef.current) {
          playRange(startSec, endSec);
        } else {
          setPlaying(false);
          setCurrentTime(0);
        }
      }
    });
  }, [bookAudioFileName]);

  const stop = useCallback(() => {
    playbackTokenRef.current += 1;
    audioService.stop();
    setPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) {
      stop();
      return;
    }

    if (audioMode === 'tts' || !bookAudioFileName) {
      const locale = characterPreference === 'simplified' ? 'zh-CN' : 'zh-TW';
      setPlaying(true);
      void audioService.speakText(fullText, locale, 0.84 * playbackSpeed).then(() => {
        setPlaying(false);
      });
      return;
    }

    if (alignment) {
      const startFrom = currentTime > 0 && currentTime < totalDuration ? currentTime : 0;
      playRange(startFrom, totalDuration);
    } else {
      void audioService.play(bookAudioFileName, playbackSpeed, fullText);
    }
  }, [playing, stop, audioMode, bookAudioFileName, characterPreference, fullText, playbackSpeed, alignment, currentTime, totalDuration, playRange]);

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
        void audioService.speakText(text, locale, 0.84 * playbackSpeed).then(() => {
          setPlaying(false);
        });
      }
      return;
    }

    playRange(line!.start, line!.end);
  }, [alignment, bookAudioFileName, characterPreference, playbackSpeed, playRange, reading.paragraphs]);

  const seekTo = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(timeSec, totalDuration));
    setCurrentTime(clamped);
    if (playing && alignment && bookAudioFileName) {
      playRange(clamped, totalDuration);
    }
  }, [alignment, bookAudioFileName, playing, playRange, totalDuration]);

  const scrubTo = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(timeSec, totalDuration));
    setCurrentTime(clamped);
  }, [totalDuration]);

  const prevSentence = useCallback(() => {
    if (!alignment || alignment.lines.length === 0) return;
    const currentIdx = activeLineIndex ?? 0;
    const prevIdx = Math.max(0, currentIdx - 1);
    playLine(prevIdx);
  }, [activeLineIndex, alignment, playLine]);

  const nextSentence = useCallback(() => {
    if (!alignment || alignment.lines.length === 0) return;
    const currentIdx = activeLineIndex ?? -1;
    const nextIdx = Math.min(alignment.lines.length - 1, currentIdx + 1);
    playLine(nextIdx);
  }, [activeLineIndex, alignment, playLine]);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25];
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
    playLine,
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
