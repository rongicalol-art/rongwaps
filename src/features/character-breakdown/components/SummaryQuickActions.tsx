import { AppIcon } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import { useCharDictionaryEntry } from '../hooks/useCharDictionaryEntry';
import { FavoriteButton } from '../../library';
import { useEffect, useRef, useState } from 'react';
import { findMatchingCourseRecording, findCharacterCourseContext } from '../../../services/courseVocabLookup';
import { usePrimaryReading } from '../../../hooks/usePronunciation';
import { getCharacterAudio } from '../../../services/pronunciationAudio';

const ICON_ACTION =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-compact transition-colors focus-ring';

/**
 * Always-visible audio + save controls pinned to the top-right of the
 * breakdown summary card. Only plays recordings matching the displayed reading.
 */
export function SummaryQuickActions({
  char,
  pinyin: shownPinyin,
  meaning: shownMeaning,
  className = 'absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5',
  showAudio = true,
}: {
  char: string;
  audioSrc?: string | null;
  /** Reading and meaning the screen is showing, so Save keeps that sense instead of the first dictionary entry. */
  pinyin?: string;
  meaning?: string;
  /** Placement; defaults to pinned top-right of a card. */
  className?: string;
  /** Hide the speaker (and skip its audio lookup), leaving only Save. */
  showAudio?: boolean;
}) {
  const entries = useCharDictionaryEntry(char);

  const primary = entries[0];
  const headword = primary?.traditional || char;
  const indexedReading = usePrimaryReading(char, primary?.pinyin?.[0]);
  const reading = shownPinyin || indexedReading;
  const [message, setMessage] = useState('');
  const [recording, setRecording] = useState<{ key: string; audio?: string; contextWord?: string } | null>(null);
  const recordingKey = `${headword}|${reading}`;
  const requestId = useRef(0);
  useEffect(() => {
    if (!showAudio) return;
    const counter = requestId;
    const request = ++counter.current;
    setMessage('');
    void findMatchingCourseRecording(headword, reading).catch(() => undefined).then(async (course) => {
      if (course?.audio && audioService.isAudioFileName(course.audio)) return { audio: course.audio };
      if (counter.current !== request) return undefined;
      const audio = await getCharacterAudio(headword, reading).catch(() => undefined);
      if (audio) return { audio };
      if (counter.current !== request) return undefined;
      const context = await findCharacterCourseContext(headword, reading);
      return context ? { audio: context.audio, contextWord: context.front } : undefined;
    }).catch(() => undefined).then((result) => {
      if (counter.current === request) setRecording({ key: recordingKey, ...result });
    });
    return () => { counter.current++; };
  }, [headword, reading, recordingKey, showAudio]);

  const play = () => {
    if (recording?.key !== recordingKey || !recording.audio) return;
    const request = ++requestId.current;
    audioService.stop();
    setMessage('');
    const unavailable = () => {
      if (requestId.current === request) setMessage('Recording unavailable for this reading.');
    };
    void audioService.play(recording.audio, 1, undefined, undefined, 0, { fallback: 'none', onUnavailable: unavailable }).catch(unavailable);
  };

  const pinyinStr = primary?.pinyin
    ? Array.isArray(primary.pinyin)
      ? primary.pinyin.join(' ')
      : primary.pinyin
    : undefined;

  return (
    <div className={className}>
      {showAudio && (recording?.key === recordingKey && recording.audio ? <button
        type="button"
        aria-label={recording.contextWord ? `Hear ${headword} in ${recording.contextWord}` : `Hear pronunciation of ${headword}`}
        onClick={play}
        className={`${recording.contextWord ? 'flex h-10 items-center gap-1 rounded-compact px-2 focus-ring' : ICON_ACTION} text-ui-muted-strong transition-colors hover:bg-ui-hover hover:text-brand-primary active:scale-95`}
      >
        <AppIcon name="pronounce" size={22} />
        {recording.contextWord && <span className="text-sm">Hear {recording.contextWord}</span>}
      </button> : <span role="status" className="text-xs text-ui-muted-strong">{recording?.key === recordingKey ? 'No audio' : 'Checking audio…'}</span>)}
      {message && <span role="status" className="text-xs text-ui-muted-strong">{message}</span>}
      <FavoriteButton
        word={headword}
        traditional={primary?.traditional}
        simplified={primary?.simplified}
        pinyin={shownPinyin || pinyinStr}
        definitions={shownMeaning || primary?.definitions}
        variant="ghost"
        size="lg"
        idleFilled
        className="h-10 w-10 text-ui-muted-strong"
      />
    </div>
  );
}
