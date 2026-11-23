import { useCallback, useEffect, useRef, useState } from 'react';
import { ActionButton, ScreenHeader } from '../../lib/widgets';
import { playStartHereClip, speakStartHereLines, stopStartHereAudio } from './audio/startHereAudio';
import { CharPartsView, SentenceBuildView, VocabCardsView } from './components/CharacterAndVocabViews';
import { PinyinChartView } from './components/PinyinChartView';
import { QuestionView } from './components/QuestionView';
import { SortActivity } from './components/SortActivity';
import { BuildView, PiecesView, SplitView } from './components/SyllableLab';
import { TeacherHeader } from './components/TeacherHeader';
import { ToneFlipCard } from './components/ToneFlipCard';
import { MarkCompareView, ToneIntroView, TraceView } from './components/ToneTracePad';
import { JoinView, PairsView, SpellingView, TilesView, WordSpotlightView } from './components/WordAndTileViews';
import type { MouthSoundId, PartId, StartHereLesson, StartHereScreen } from './data/types';
import { MouthLabView, MouthQuizView, type MouthHandle } from './mouth/MouthView';

interface LessonRunnerProps {
  lesson: StartHereLesson;
  totalLessons: number;
  onFinishLesson: (id: number) => void;
  onNextLesson: (id: number) => void;
  onExitOverview: (part: PartId | 'test') => void;
}

export function StartHereLessonRunner({
  lesson, totalLessons, onFinishLesson, onNextLesson, onExitOverview,
}: LessonRunnerProps) {
  const [step, setStep] = useState(0);
  const total = lesson.screens.length;
  const screen = lesson.screens[step];
  const hasNext = lesson.id < totalLessons;

  return (
    <>
      <ScreenHeader
        variant="window"
        onClose={() => onExitOverview(lesson.partId)}
        progress={100 * Math.min(step + 1, total) / total}
        currentIndex={Math.min(step, total - 1)}
        totalCount={total}
      />
      {screen ? (
        <LessonStep
          key={step}
          screen={screen}
          onContinue={() => {
            if (step + 1 === total) onFinishLesson(lesson.id);
            setStep(step + 1);
          }}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto p-6 text-center">
          <h2 className="text-3xl font-black text-ui-ink-strong">Lesson complete</h2>
          <p className="font-extrabold text-ui-muted-strong">{lesson.title}</p>
          <div className="mt-3 flex w-full max-w-xs flex-col gap-2">
            <ActionButton variant="primary" size="lg" onClick={() => hasNext ? onNextLesson(lesson.id + 1) : onExitOverview('test')}>
              {hasNext ? 'Next lesson' : 'Go to Ready check'}
            </ActionButton>
            <ActionButton variant="quiet" onClick={() => onExitOverview(lesson.partId)}>Back to Start here</ActionButton>
          </div>
        </div>
      )}
    </>
  );
}

function LessonStep({ screen, onContinue }: { screen: StartHereScreen; onContinue: () => void }) {
  const [caption, setCaption] = useState(screen.k === 'pieces' ? screen.lines[0] : screen.k === 'mouthQuiz' ? screen.ask : screen.title);
  const [complete, setComplete] = useState(false);
  const [activeLine, setActiveLine] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [activeMouth, setActiveMouth] = useState<MouthSoundId | null>(null);
  const mouth = useRef<MouthHandle>(null);
  const markComplete = () => setComplete(true);

  const scripted = 'talk' in screen ? screen.talk : undefined;
  const question = screen.k === 'question';
  const exercise = screen.k === 'build' || screen.k === 'split' || screen.k === 'sort'
    || screen.k === 'trace' || screen.k === 'mouthQuiz' || screen.k === 'flip'
    || screen.k === 'sentenceBuild' || screen.k === 'vocabCards' || (screen.k === 'chart' && screen.huntTargets !== undefined);

  const playClip = useCallback((key: string | string[]) => {
    setSpeaking(false);
    void playStartHereClip(key);
  }, []);

  const narrate = (startLine: number, singleLineOnly: boolean) => {
    if (!scripted) return;
    mouth.current?.rest();
    speakStartHereLines(scripted, {
      startLine,
      singleLineOnly,
      mouth: mouth.current,
      onLineChange: setActiveLine,
      onSpeakingChange: setSpeaking,
      onMouthCue: setActiveMouth,
    });
  };

  useEffect(() => {
    if (scripted) {
      const introAudio = screen.k === 'word' || screen.k === 'toneIntro' ? screen.audio
        : screen.k === 'tiles' && screen.autoPlayAll ? screen.items.map(({ audio }) => audio)
          : undefined;
      speakStartHereLines(scripted, {
        introAudio,
        mouth: mouth.current,
        onLineChange: setActiveLine,
        onSpeakingChange: setSpeaking,
        onMouthCue: setActiveMouth,
      });
    }
    return stopStartHereAudio;
  }, [screen, scripted]);

  let visual;
  switch (screen.k) {
    case 'word': visual = <WordSpotlightView {...screen} onPlayAudio={playClip} />; break;
    case 'tiles': visual = <TilesView items={screen.items} onPlayAudio={playClip} />; break;
    case 'toneIntro': visual = <ToneIntroView {...screen} onPlayAudio={playClip} />; break;
    case 'trace': visual = <TraceView {...screen} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'markCompare': visual = <MarkCompareView tones={screen.tones} />; break;
    case 'pieces': visual = <PiecesView {...screen} finalPart={screen.final} onPlayAudio={playClip} onCaptionChange={setCaption} />; break;
    case 'split': visual = <SplitView {...screen} finalPart={screen.final} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'build': visual = <BuildView {...screen} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'mouth': visual = <MouthLabView {...screen} mouthRef={mouth} activeSound={activeMouth} onPlayAudio={playClip} />; break;
    case 'mouthQuiz': visual = <MouthQuizView {...screen} onPlayAudio={playClip} onAnsweredCorrect={markComplete} />; break;
    case 'pairs': visual = <PairsView {...screen} onPlayAudio={playClip} />; break;
    case 'spelling': visual = <SpellingView {...screen} onPlayAudio={playClip} />; break;
    case 'join': visual = <JoinView {...screen} onPlayAudio={playClip} />; break;
    case 'sort': visual = <SortActivity {...screen} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'chart': visual = <PinyinChartView chart={screen} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'flip': visual = <ToneFlipCard {...screen} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'charParts': visual = <CharPartsView {...screen} onPlayAudio={playClip} />; break;
    case 'sentenceBuild': visual = <SentenceBuildView {...screen} onPlayAudio={playClip} onComplete={markComplete} />; break;
    case 'vocabCards': visual = <VocabCardsView {...screen} onPlayAudio={playClip} onAllHeard={markComplete} />; break;
    case 'question': visual = <QuestionView question={screen} questionKey={screen.title} onPlayAudio={playClip} onContinue={onContinue} />; break;
  }

  return (
    <>
      {scripted ? (
        <TeacherHeader
          lines={scripted}
          activeLine={activeLine}
          speaking={speaking}
          onSelectLine={(line) => narrate(line, true)}
          onReplayCurrentLine={() => narrate(activeLine, true)}
          onPlayClip={(clip, isMouth, sound) => {
            if (isMouth && sound && mouth.current) {
              stopStartHereAudio();
              setSpeaking(false);
              setActiveMouth(sound);
              mouth.current.show(sound);
            } else {
              playClip(clip);
            }
          }}
        />
      ) : (
        <TeacherHeader prompt={caption} />
      )}

      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 ${question ? "pb-44" : ""}`}>
        <div className={`sh-step-enter mx-auto my-auto w-full ${screen.k === 'chart' || screen.k === 'mouth' || screen.k === 'mouthQuiz' ? 'max-w-4xl' : 'max-w-[520px]'}`}>
          {visual}
        </div>
      </div>

      {!question && (
        <div className="flex shrink-0 justify-center px-4 pb-sheet-safe pt-2">
          <ActionButton variant="primary" size="lg" className="w-full max-w-[360px]" disabled={exercise && !complete} onClick={onContinue}>
            Continue
          </ActionButton>
        </div>
      )}
    </>
  );
}
