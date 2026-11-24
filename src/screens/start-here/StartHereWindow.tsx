import { useCallback, useRef, useState } from 'react';
import { WorkspaceWindow } from '../../lib/widgets';
import { useModalFocus } from '../../hooks/useModalFocus';
import { useAppStore } from '../../store/useAppStore';
import { stopStartHereAudio } from './audio/startHereAudio';
import { ReadyCheckRunner } from './ReadyCheckRunner';
import { StartHereLessonRunner } from './StartHereLessonRunner';
import { StartHereOverview } from './StartHereOverview';
import { READY_CHECK_PASS, READY_CHECK_QUESTIONS, START_HERE_LESSONS, START_HERE_PARTS } from './data';
import type { PartId } from './data/types';
import './startHere.css';

type WindowMode =
  | { kind: 'overview' }
  | { kind: 'lesson'; lessonId: number }
  | { kind: 'readyCheck' };

interface StartHereWindowProps {
  onClose: () => void;
  onGoToLesson1: () => void;
  initialLessonId?: number;
  initialReadyCheck?: boolean;
}

export function StartHereWindow({
  onClose,
  onGoToLesson1,
  initialLessonId,
  initialReadyCheck,
}: StartHereWindowProps) {
  const completedLessons = useAppStore((s) => s.startHereCompletedLessons);
  const passed = useAppStore((s) => s.startHerePassed);
  const markStartHereLessonDone = useAppStore((s) => s.markStartHereLessonDone);
  const markStartHerePassed = useAppStore((s) => s.markStartHerePassed);

  const [mode, setMode] = useState<WindowMode>(() => {
    if (initialReadyCheck) return { kind: 'readyCheck' };
    if (initialLessonId) return { kind: 'lesson', lessonId: initialLessonId };
    return { kind: 'overview' };
  });

  const [activeTab, setActiveTab] = useState<PartId | 'test'>(() => {
    const doneSet = new Set(completedLessons);
    const nextLesson = START_HERE_LESSONS.find((l) => !doneSet.has(l.id));
    return passed || !nextLesson ? 'test' : nextLesson.partId;
  });

  const [skipOpen, setSkipOpen] = useState(false);

  const handleClose = useCallback(() => {
    stopStartHereAudio();
    onClose();
  }, [onClose]);

  const handleGoLesson1 = useCallback(() => {
    stopStartHereAudio();
    onClose();
    onGoToLesson1();
  }, [onClose, onGoToLesson1]);

  const windowRef = useRef<HTMLDivElement>(null);
  const modalFocus = useModalFocus({ containerRef: windowRef, isActive: !skipOpen, onEscape: handleClose });
  const activeLesson =
    mode.kind === 'lesson'
      ? START_HERE_LESSONS.find((l) => l.id === mode.lessonId) ?? START_HERE_LESSONS[0]
      : null;

  return (
    <WorkspaceWindow
      ref={windowRef}
      {...modalFocus}
      role="dialog"
      aria-modal="true"
      aria-label="Start here"
      tabIndex={-1}
      layer="overlay"
      tone="canvas"
      className="sh-root"
    >
      {mode.kind === 'overview' && (
        <StartHereOverview
          parts={START_HERE_PARTS}
          lessons={START_HERE_LESSONS}
          activeTab={activeTab}
          completedLessons={completedLessons}
          passed={passed}
          onSelectTab={setActiveTab}
          onStartLesson={(lessonId) => setMode({ kind: 'lesson', lessonId })}
          onStartReadyCheck={() => {
            setActiveTab('test');
            setMode({ kind: 'readyCheck' });
          }}
          onGoToLesson1={handleGoLesson1}
          onClose={handleClose}
          skipOpen={skipOpen}
          onSetSkipOpen={setSkipOpen}
        />
      )}

      {mode.kind === 'lesson' && activeLesson && (
        <StartHereLessonRunner
          key={activeLesson.id}
          lesson={activeLesson}
          totalLessons={START_HERE_LESSONS.length}
          onFinishLesson={(lessonId) => markStartHereLessonDone(lessonId)}
          onNextLesson={(nextId) => setMode({ kind: 'lesson', lessonId: nextId })}
          onExitOverview={(partId) => {
            if (partId) setActiveTab(partId);
            setMode({ kind: 'overview' });
          }}
        />
      )}

      {mode.kind === 'readyCheck' && (
        <ReadyCheckRunner
          questions={READY_CHECK_QUESTIONS}
          passThreshold={READY_CHECK_PASS}
          onPass={markStartHerePassed}
          onExitOverview={() => setMode({ kind: 'overview' })}
          onGoToLesson1={handleGoLesson1}
          onReviewPart={(partId) => {
            setActiveTab(partId);
            setMode({ kind: 'overview' });
          }}
        />
      )}
    </WorkspaceWindow>
  );
}
