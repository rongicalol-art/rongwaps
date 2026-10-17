import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import { useAppStore } from '../../store/useAppStore';
import { buildMeasureWordChoices, createQuizRng, parseMeasureWord, type QuizBeat, type QuizFormat, type QuizTypeId } from '../../utils/vocabulary/quizDirector';
import { useQuizMixed } from './hooks/useQuizMixed';
import { cancelQuizLaunch } from './quizShuffle';
import { QuizShell, type QuizModeProps } from './QuizShell';
import { MeasureWordFollowUp } from './formats/MeasureWordFollowUp';
import { PairMatch } from './formats/PairMatch';
import { PickOne, type PickChoice, type PickPrompt } from './formats/PickOne';
import { TrueFalseFlip } from './formats/TrueFalseFlip';
import { WordBuild } from './formats/WordBuild';
import { AudioBlocks } from './components/QuizAudioPreparation';
import { audioService } from '../../services/audioService';
import { getCourseVocabLookupMap } from '../../services/courseVocabLookup';
import { getPronunciationAudioIndex } from '../../services/pronunciationAudio';
import { fetchPronunciationIndex } from '../../services/contentPacks';
import { resolveWordBuildTileAudio } from './utils/wordBuildAudio';
import type { AudioPreloadProgress } from '../../services/audio/audioCache';
import type { Flashcard } from '../../data/flashcards';

const TITLES: Record<QuizFormat, string> = {
  'pair-match': 'Tap the pairs',
  'sound-match': 'Match the sounds',
  'pick-meaning': 'Select the meaning',
  'listen-pick': 'What did you hear?',
  'pick-hanzi': 'Select the character',
  'true-false': 'True or false?',
  'word-build': 'Build the Chinese word',
};

const PICK_SHAPE: Partial<Record<QuizFormat, { prompt: PickPrompt; choice: PickChoice }>> = {
  'pick-meaning': { prompt: 'hanzi', choice: 'meaning' },
  'listen-pick': { prompt: 'audio', choice: 'meaning' },
  'pick-hanzi': { prompt: 'meaning', choice: 'hanzi' },
};

/**
 * The mixed vocab quiz: every question type (or only the picked `types`) is open to every word; the director
 * varies them and covers each word once.
 */
export const QuizMixed: React.FC<QuizModeProps & { types?: readonly QuizTypeId[] | null }> = ({ cards, sessionKey, types = null, ...shell }) => {
  const [buildReady, setBuildReady] = useState(false);
  const buildCheck = useRef<(() => void) | null>(null);
  const onBuildReady = useCallback((ready: boolean) => setBuildReady(ready), []);
  const session = useQuizMixed(cards, sessionKey, types ?? undefined);
  const { beat, currentCard, status, followUp, isReviewPass } = session;
  const [audioPreparedFor, setAudioPreparedFor] = useState<{ key: string; beats: Set<QuizBeat> } | null>(null);
  const [audioProgress, setAudioProgress] = useState<AudioPreloadProgress | null>(null);
  const [audioPreparationError, setAudioPreparationError] = useState(false);
  const preparationAbort = useRef<AbortController | null>(null);
  const preparationKey = session.audioPreparationKey;
  // Keep the quiz shell mounted during review so its intro and honey tone survive round changes.
  const preparingAudio = !isReviewPass && session.audioBeats.length > 0 && !session.completed && (audioPreparedFor?.key !== preparationKey || !audioPreparedFor.beats.has(session.audioBeats[0]));
  useEffect(() => {
    if (!session.audioBeats.length) return;
    const controller = new AbortController();
    preparationAbort.current = controller;
    let active = true;
    let currentReady = false;
    setAudioProgress(null);
    setAudioPreparationError(false);
    void (async () => {
      for (const [index, question] of session.audioBeats.entries()) {
        if (!active) return;
        let lookupFailed = false;
        const files = new Set(question.cards.map((card) => card.audio));
        if (question.format === 'word-build') {
          const [recordings, sounds, readings] = await Promise.all([
            getCourseVocabLookupMap().catch(() => { lookupFailed = true; return new Map<string, Flashcard>(); }),
            getPronunciationAudioIndex().catch(() => { lookupFailed = true; return new Map<string, string>(); }),
            fetchPronunciationIndex().catch(() => { lookupFailed = true; return null; }),
          ]);
          if (!active) return;
          for (const char of new Set(question.tiles ?? [])) {
            files.add(resolveWordBuildTileAudio(question.cards[0], char, recordings, sounds, readings));
          }
        }
        let failed = 0;
        await audioService.preload([...files], controller.signal, (progress) => {
          failed = progress.failed;
          if (active && index === 0) setAudioProgress(progress);
        });
        if (!active) return;
        if (index === 0) {
          setAudioPreparationError(failed > 0 || lookupFailed);
          if (failed || lookupFailed) return;
          // Open the current question before warming the following one.
          currentReady = true;
        }
        if (!failed && !lookupFailed) setAudioPreparedFor((previous) => ({
          key: preparationKey,
          beats: new Set([...(previous?.key === preparationKey ? previous.beats : []), question]),
        }));
      }
    })().catch(() => { if (active && !currentReady) setAudioPreparationError(true); });
    return () => {
      active = false;
      controller.abort();
      if (preparationAbort.current === controller) preparationAbort.current = null;
    };
  }, [session.audioBeats, preparationKey]);
  useEffect(() => {
    setBuildReady(false);
  }, [session.beatKey, sessionKey]);
  useEffect(() => {
    if (audioPreparationError || audioProgress?.failed || audioProgress?.blocked) cancelQuizLaunch();
  }, [audioPreparationError, audioProgress]);
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === shell.activeBookId) || SAMPLE_BOOKS[0];


  const measureWord = beat?.format === 'pick-meaning' && currentCard ? parseMeasureWord(currentCard.back) : null;
  const measureChoices = useMemo(
    () => (measureWord && currentCard
      ? buildMeasureWordChoices(measureWord, cards.map((c) => c.back), createQuizRng(`${sessionKey}|measure|${currentCard.id}`))
      : []),
    [measureWord, currentCard, cards, sessionKey],
  );

  const single = beat && beat.cards.length === 1;
  const isBuild = Boolean(single && beat?.format === 'word-build' && beat.tiles);
  const matchCards = beat && beat.cards.length > 1 ? beat.cards : [];
  const isMatch = matchCards.length > 0;
  const missedFeedback = status === 'wrong' && isMatch;
  const showPinyin = useAppStore((state) => state.showPinyin);
  const matchPairType = useAppStore((state) => state.matchPairType);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const matchVariant: 'sound' | 'hanzi' = matchPairType === 'audio'
    ? 'sound'
    : matchPairType === 'characters'
    ? 'hanzi'
    : beat?.format === 'sound-match' ? 'sound' : 'hanzi';
  const matchTitle = matchVariant === 'sound' ? 'Match the sounds' : 'Tap the pairs';
  const beatTitle = followUp === 'open' ? 'Choose the measure word' : isMatch ? matchTitle : beat ? TITLES[beat.format] : '';
  const startQuiz = () => {
    preparationAbort.current?.abort();
    setAudioPreparedFor((previous) => ({
      key: preparationKey,
      beats: new Set([...(previous?.key === preparationKey ? previous.beats : []), ...session.audioBeats.slice(0, 1)]),
    }));
  };

  if (preparingAudio) return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Skip audio preparation and start quiz"
      onClick={startQuiz}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          startQuiz();
        }
      }}
      className="relative flex flex-1 cursor-pointer flex-col items-center justify-center pt-18 focus-ring"
    >
      <div role="status" aria-live="polite" aria-busy className="flex flex-col items-center gap-8 px-4 py-12">
        <AudioBlocks progress={audioProgress} error={Boolean(audioPreparationError || audioProgress?.failed || audioProgress?.blocked)} />
        <h2 className="text-2xl font-black text-ui-ink-strong">
          {audioProgress?.blocked ? 'Audio downloads could not connect' : audioPreparationError ? 'Some audio could not load' : 'Getting audio ready'}
        </h2>
      </div>
      {audioProgress?.failed ? <p role="alert" className="mb-3 text-center text-sm text-ui-muted-strong">{audioProgress.blocked ? 'Check your connection or site access. You can still start.' : `${audioProgress.failed} recordings could not download.`}</p> : null}
      <p className="pb-sheet-safe pt-4 text-sm font-extrabold text-ui-muted-strong">
        <span className="hidden pointer-fine:inline">Click anywhere to start</span>
        <span className="pointer-fine:hidden">Tap anywhere to start</span>
      </p>
    </div>
  );

  return (
    <QuizShell
      {...shell}
      sessionKey={sessionKey}
      session={session}
      mode="quiz-choices"
      title={beatTitle}
      wide
      status={status}
      correctAnswer={missedFeedback ? session.missedLabel : currentCard ? `${currentCard.front}  ${currentCard.back}` : ''}
      pinyin={!missedFeedback && showPinyin ? currentCard?.pinyin : undefined}
      word={single && currentCard ? { hanzi: currentCard.front, pinyin: currentCard.pinyin, meaning: currentCard.back, simple: simpleDefinitions ? currentCard.simple : undefined } : undefined}
      isCheckDisabled={isBuild ? !buildReady : status === 'idle'}
      onCheck={isBuild && status === 'idle' ? () => buildCheck.current?.() : undefined}
      rise={Boolean(types)}
      hideBreakdown={isMatch}
      isMatchPair={isMatch}
      holdAutoAdvance={followUp === 'open'}
      // Match and build questions have no single prompt card to land the review intro's card on: it fades.
      landsReviewGhost={!beat || (beat.cards.length === 1 && beat.format !== 'word-build')}
    >
      {({ openBreakdown, breakdownOpen, reviewHandoff }) => {
        if (!beat || !currentCard) return null;
        const landing = isReviewPass ? reviewHandoff : null;
        const isChecked = status !== 'idle';

        if (isMatch) {
          return (
            <PairMatch
              variant={matchVariant}
              cards={matchCards}
              meanings={beat.options ?? matchCards}
              activeBook={activeBook}
              onPair={session.resolvePair}
              onMismatch={session.resolveMismatch}
            />
          );
        }
        if (isBuild && beat.tiles) {
          return (
            <WordBuild
              card={currentCard}
              tiles={beat.tiles}
              isChecked={isChecked}
              breakdownOpen={breakdownOpen}
              activeBook={activeBook}
              onAnswer={session.resolveSingle}
              onReadyChange={onBuildReady}
              checkRef={buildCheck}
            />
          );
        }
        if (single && beat.format === 'true-false' && beat.shown) {
          return (
            <TrueFalseFlip
              card={currentCard}
              shown={beat.shown}
              isChecked={isChecked}
              onAnswer={session.resolveSingle}
              onOpenBreakdown={openBreakdown}
              breakdownOpen={breakdownOpen}
              activeBook={activeBook}
              handoff={landing}
            />
          );
        }
        const shape = PICK_SHAPE[beat.format] ?? PICK_SHAPE['pick-meaning']!;
        return (
          <PickOne
            card={currentCard}
            options={beat.options ?? [currentCard]}
            prompt={shape.prompt}
            choice={shape.choice}
            isChecked={isChecked}
            onAnswer={session.resolveSingle}
            onOpenBreakdown={openBreakdown}
            breakdownOpen={breakdownOpen}
            activeBook={activeBook}
            handoff={landing}
            afterAnswer={followUp !== 'closed' && measureWord ? (
              <MeasureWordFollowUp
                noun={currentCard.front}
                answer={measureWord}
                choices={measureChoices}
                activeBook={activeBook}
                onDone={session.closeFollowUp}
              />
            ) : undefined}
          />
        );
      }}
    </QuizShell>
  );
};
