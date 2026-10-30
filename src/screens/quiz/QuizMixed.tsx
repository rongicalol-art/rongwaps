import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SAMPLE_BOOKS } from '../../data/books';
import type { Flashcard } from '../../data/flashcards';
import { useAppStore } from '../../store/useAppStore';
import { buildMeasureWordChoices, createQuizRng, parseMeasureWord, type QuizFormat, type QuizTypeId } from '../../utils/vocabulary/quizDirector';
import { useQuizMixed } from './hooks/useQuizMixed';
import { QuizShell, type QuizModeProps } from './QuizShell';
import { MeasureWordFollowUp } from './formats/MeasureWordFollowUp';
import { PairMatch } from './formats/PairMatch';
import { PickOne, type PickChoice, type PickPrompt } from './formats/PickOne';
import { TrueFalseFlip } from './formats/TrueFalseFlip';
import { WordBuild } from './formats/WordBuild';
import { useQuizAudioPreparation } from './hooks/useQuizAudioPreparation';
import { QuizAudioPreparation } from './components/QuizAudioPreparation';
import { ActionButton, EmptyState, LoadingScreen } from '../../lib/widgets';
import { useRaceQuiz, useRaceReady } from '../../features/social';

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
export const QuizMixed: React.FC<QuizModeProps & { types?: readonly QuizTypeId[] | null; seed?: string }> = ({ cards, sessionKey, types = null, seed, ...shell }) => {
  const buildCheck = useRef<(() => void) | null>(null);
  const session = useQuizMixed(cards, sessionKey, types ?? undefined, seed);
  const { beat, currentCard, status, followUp, isReviewPass } = session;
  const activeBeatId = `${sessionKey}|${session.beatKey}|${currentCard?.id ?? ''}|${session.resetNonce ?? 0}`;
  const [readyBeatId, setReadyBeatId] = useState<string | null>(null);
  const buildReady = readyBeatId === activeBeatId;
  const onBuildReady = useCallback((ready: boolean) => {
    setReadyBeatId(ready ? activeBeatId : null);
  }, [activeBeatId]);
  const race = useRaceQuiz();
  const audio = useQuizAudioPreparation(session.audioBeats, session.audioPreparationKey, session.completed, race?.phase === 'preparing');
  const racePlanSource = useMemo(() => {
    if (!seed || session.planning.pending || session.planning.error || !session.planning.beats.length) return '';
    const describeCard = (card: Flashcard) => [card.id, card.bookId, card.lessonId, card.partId ?? null, card.front, card.back, card.simple ?? null, card.pinyin ?? null, card.audio ?? null, card.traditional ?? null, card.simplified ?? null];
    return JSON.stringify({
      seed,
      types: types ?? [],
      deck: [...cards].sort((a, b) => a.id.localeCompare(b.id)).map(describeCard),
      beats: session.planning.beats.map((question) => ({
        format: question.format,
        cards: question.cards.map(describeCard),
        options: question.options?.map(describeCard),
        shown: question.shown ? describeCard(question.shown) : null,
        tiles: question.tiles ?? null,
      })),
    });
  }, [seed, types, cards, session.planning.beats, session.planning.pending, session.planning.error]);
  const [racePlanDigest, setRacePlanDigest] = useState<{ source: string; hash: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!racePlanSource) return;
    let current = true;
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(racePlanSource)).then((value) => {
      if (current) setRacePlanDigest({ source: racePlanSource, hash: [...new Uint8Array(value)].map(byte => byte.toString(16).padStart(2, '0')).join('') });
    }).catch(() => { if (current) setRacePlanDigest({ source: racePlanSource, hash: '', error: true }); });
    return () => { current = false; };
  }, [racePlanSource]);
  const planHash = racePlanDigest?.source === racePlanSource ? racePlanDigest.hash : null;
  useRaceReady(seed && beat && !session.planning.pending && !session.planning.error && audio.ready ? planHash : null);
  const activeBook = SAMPLE_BOOKS.find((b) => b.id === shell.activeBookId) || SAMPLE_BOOKS[0];


  const measureWord = useMemo(() => beat?.format === 'pick-meaning' && currentCard ? parseMeasureWord(currentCard.back) : null, [beat, currentCard]);
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
  const matchPairType = useAppStore((state) => seed ? 'mixed' : state.matchPairType);
  const simpleDefinitions = useAppStore((state) => state.simpleDefinitions);
  const matchVariant: 'sound' | 'hanzi' = matchPairType === 'audio'
    ? 'sound'
    : matchPairType === 'characters'
    ? 'hanzi'
    : beat?.format === 'sound-match' ? 'sound' : 'hanzi';
  const matchTitle = matchVariant === 'sound' ? 'Match the sounds' : 'Tap the pairs';
  const beatTitle = followUp === 'open' ? 'Choose the measure word' : isMatch ? matchTitle : beat ? TITLES[beat.format] : '';
  return (
    <QuizShell
      {...shell}
      session={session}
      mode="quiz-choices"
      title={beatTitle}
      preparation={session.planning.pending ? <div className="flex flex-1 flex-col items-center justify-center"><LoadingScreen inline message="Preparing quiz…" tone="practice" /><ActionButton variant="secondary" onClick={shell.onEnd}>Cancel</ActionButton></div>
        : session.planning.error ? <EmptyState title="Quiz couldn’t load" action={<div className="flex gap-3"><ActionButton onClick={session.planning.retry}>Retry</ActionButton><ActionButton variant="secondary" onClick={shell.onEnd}>Back</ActionButton></div>} />
        : !audio.ready ? <QuizAudioPreparation progress={audio.progress} error={audio.error} onRetry={audio.retry} onBack={shell.onEnd} />
        : seed && race?.phase === 'preparing' && racePlanDigest?.source === racePlanSource && racePlanDigest.error ? <EmptyState title="Quiz couldn’t sync" description="This browser couldn’t verify the shared quiz data. Leave this race and try an updated browser." action={<ActionButton variant="secondary" onClick={shell.onEnd}>Leave race</ActionButton>} />
        : seed && race?.phase === 'preparing' ? <div className="flex flex-1 flex-col items-center justify-center gap-4"><LoadingScreen inline message={`${planHash ? 'Waiting for everyone’s audio' : 'Checking the shared quiz'}… ${race.preparedCount}/${race.playerCount}`} tone="practice" /><ActionButton variant="secondary" onClick={shell.onEnd}>Leave race</ActionButton></div>
        : undefined}
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
