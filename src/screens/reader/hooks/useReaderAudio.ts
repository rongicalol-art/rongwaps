import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DialogueAlignment, ReadingRecord } from '../../../types/models';
import { audioService } from '../../../services/audioService';
import { debugLogger } from '../../../utils/debug/debugLogger';
import { useAppStore } from '../../../store/useAppStore';
import {
  alignmentDuration,
  lineIndexForTime,
} from '../../../utils/lesson/dialogueSync';
import { officialAudioFileName } from '../../../utils/lesson/officialAudio';
import { playSentence } from '../../../services/audio/sentenceAudio';

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
  const pronunciationRate = useAppStore((state) => state.pronunciationRate);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => pronunciationRate ?? 1);
  const [isLooping, setIsLooping] = useState(false);
  /** The recording has played through to its end at least once for this reading. */
  const [hasFinished, setHasFinished] = useState(false);

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

  // No hosted track but recorded lines: play the lines one after another.
  const hasClips = audioMode === 'book' && !bookAudioFileName && reading.paragraphs.some((p) => p.audio);
  const [clipLine, setClipLine] = useState<number | null>(null);

  const canKaraoke = audioMode === 'book' && Boolean(alignment && bookAudioFileName);

  const fullText = useMemo(
    () => reading.paragraphs
      .map((p) => (characterPreference === 'simplified' ? p.simplified : p.traditional))
      .join(''),
    [characterPreference, reading.paragraphs],
  );

  // Reset audio on reading switch
  useEffect(() => {
    playbackTokenRef.current += 1;
    audioService.stop();
    setPlaying(false);
    setClipLine(null);
    setCurrentTime(0);
    currentTimeRef.current = 0;
  }, [reading.id, audioMode, characterPreference]);

  useEffect(() => {
    setHasFinished(false);
  }, [reading.id]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      playbackTokenRef.current += 1;
      audioService.stop();
    };
  }, []);

  const activeLineIndex = useMemo(() => {
    if (hasClips) return clipLine;
    if (!canKaraoke || !alignment || (!playing && currentTime === 0)) return null;
    return lineIndexForTime(alignment, currentTime);
  }, [alignment, canKaraoke, clipLine, hasClips, playing, currentTime]);

  const playRange = useCallback((startSec: number, endSec: number) => {
    if (!bookAudioFileName) return;
    const token = playbackTokenRef.current + 1;
    playbackTokenRef.current = token;
    setPlaying(true);
    setCurrentTime(startSec);
    currentTimeRef.current = startSec;

    let finished = false;
    void audioService.playRange(bookAudioFileName, startSec, endSec, {
      rate: playbackSpeedRef.current,
      onComplete: () => { finished = true; },
      onUnavailable: () => { useAppStore.getState().showFeedbackToast('Recording unavailable.'); },
      onTime: (time) => {
        if (playbackTokenRef.current === token) {
          setPlaying(true);
          setCurrentTime(time);
          currentTimeRef.current = time;
        }
      },
    }).then(() => {
      if (playbackTokenRef.current === token) {
        if (isLoopingRef.current && finished) {
          playRange(startSec, endSec);
        } else {
          setPlaying(false);
          if (!finished) return;
          if (totalDuration > 0 && endSec >= totalDuration - 0.25) {
            setHasFinished(true);
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

  /** Plays recorded lines from `start` to the end of the reading, or just that line. */
  const playClips = useCallback(async (start: number, onlyThisLine = false) => {
    const token = ++playbackTokenRef.current;
    setPlaying(true);
    for (let index = start; index < reading.paragraphs.length; index += 1) {
      const paragraph = reading.paragraphs[index];
      setClipLine(index);
      await playSentence(
        characterPreference === 'simplified' ? paragraph.simplified : paragraph.traditional,
        paragraph.audio,
        characterPreference,
        playbackSpeedRef.current,
      );
      if (playbackTokenRef.current !== token) return;
      if (onlyThisLine) break;
    }
    setPlaying(false);
    if (!onlyThisLine) {
      setHasFinished(true);
      setClipLine(null);
    }
  }, [characterPreference, reading.paragraphs]);

  const pause = useCallback(() => {
    playbackTokenRef.current += 1;
    audioService.pause();
    setPlaying(false);
  }, []);

  const stop = useCallback(() => {
    playbackTokenRef.current += 1;
    audioService.stop();
    setPlaying(false);
    setClipLine(null);
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

    if (hasClips) {
      void playClips(clipLine ?? 0);
      return;
    }

    const token = ++playbackTokenRef.current;
    if (audioMode === 'tts' || !bookAudioFileName) {
      const locale = characterPreference === 'simplified' ? 'zh-CN' : 'zh-TW';
      setPlaying(true);
      void audioService.speakText(fullText, locale, 0.84 * playbackSpeedRef.current).then(() => {
        if (playbackTokenRef.current === token) setPlaying(false);
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
        if (playbackTokenRef.current === token) setPlaying(false);
      });
    }
  }, [playing, pause, hasClips, playClips, clipLine, audioMode, bookAudioFileName, characterPreference, fullText, alignment, totalDuration, playRange]);

  /** Plays a line and on through the reading, or just that line when `onlyThisLine`. */
  const playLine = useCallback((lineIndex: number, onlyThisLine = false) => {
    if (hasClips) {
      void playClips(lineIndex, onlyThisLine);
      return;
    }
    const line = alignment?.lines[lineIndex];
    const lineHasAlignment = Boolean(
      audioMode === 'book' && line && !line.unmatched && line.end > line.start && bookAudioFileName,
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
        const token = ++playbackTokenRef.current;
        setPlaying(true);
        void audioService.speakText(text, locale, 0.84 * playbackSpeedRef.current).then(() => {
          if (playbackTokenRef.current === token) setPlaying(false);
        });
      }
      return;
    }

    // Audio keeps flowing past the line boundary unless only this line was asked for.
    playRange(line!.start, onlyThisLine ? line!.end : totalDuration);
  }, [alignment, audioMode, bookAudioFileName, characterPreference, hasClips, playClips, playRange, totalDuration, reading.paragraphs]);

  const seekTo = useCallback((timeSec: number) => {
    const clamped = Math.max(0, Math.min(timeSec, totalDuration));
    setCurrentTime(clamped);
    currentTimeRef.current = clamped;

    // Immediately cue audio element to avoid seek delay on subsequent play
    const audio = audioService.getGlobalAudio();
    if (audio && !isNaN(audio.duration) && audio.duration > 0) {
      try {
        audio.currentTime = clamped;
      } catch (err) {
        // Graceful degradation: media element not ready or seek operation interrupted
        debugLogger.warn('Audio', 'HTMLAudioElement seek failed during cue', err);
      }
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

  const setSpeed = useCallback((speed: number) => {
    playbackSpeedRef.current = speed;
    setPlaybackSpeed(speed);
    audioService.setPlaybackRate(speed);
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
    hasFinished,
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
    setSpeed,
    toggleLoop,
  };
}
