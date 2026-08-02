import { useMemo, useState } from 'react';
import { AppIcon, IconButton3D, SmartSentence, Soft3DButton } from '../../../lib/widgets';
import { audioService } from '../../../services/audioService';
import type { GrammarDialogue } from '../../../types/models';
import { cn } from '../../../utils/cn';
import { getGrammarText } from './GrammarText';

interface GrammarDialoguePageProps {
  dialogue: GrammarDialogue;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  canComplete: boolean;
  onBack: () => void;
  onStartExercise: () => void;
  onComplete: () => void;
}

export function GrammarDialoguePage({
  dialogue,
  characterPreference,
  showPinyin,
  showTranslation,
  canComplete,
  onBack,
  onStartExercise,
  onComplete,
}: GrammarDialoguePageProps) {
  const [focusedSpeaker, setFocusedSpeaker] = useState('all');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerStatus, setAnswerStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const speakers = useMemo(() => Array.from(new Set(dialogue.lines.map((line) => line.speaker))), [dialogue.lines]);
  const comprehension = dialogue.comprehension;

  const speakLine = (lineIndex: number) => {
    const line = dialogue.lines[lineIndex];
    return audioService.speakText(
      getGrammarText(line.text, characterPreference),
      characterPreference === 'traditional' ? 'zh-TW' : 'zh-CN',
      0.9,
    );
  };

  const playDialogue = async () => {
    for (let index = 0; index < dialogue.lines.length; index += 1) {
      await speakLine(index);
    }
  };

  const checkAnswer = () => {
    if (!selectedAnswer || !comprehension) return;
    setAnswerStatus(selectedAnswer === comprehension.answer ? 'correct' : 'wrong');
  };

  return (
    <article className="mx-auto w-full max-w-4xl rounded-[24px] border-b-[5px] border-ui-border bg-ui-surface px-4 py-6 sm:px-8 sm:py-9 lg:px-12">
      <header className="border-b-2 border-ui-divider pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-brand-primary">Apply it · Dialogue</p>
            <h1 className="mt-1 font-chinese text-2xl font-black text-ui-ink-strong sm:text-3xl">{dialogue.title}</h1>
            <p className="mt-1 text-sm font-bold text-ui-muted-strong">
              Pages {dialogue.printedPages.join('–')} · {dialogue.setting}
            </p>
          </div>
          <Soft3DButton
            type="button"
            variant="custom"
            depth="sm"
            onClick={playDialogue}
            className="w-auto rounded-[13px] border-brand-primary-edge bg-brand-primary px-4 py-2.5 text-xs normal-case tracking-normal text-white"
          >
            <AppIcon name="audio" size={18} />
            Play full dialogue
          </Soft3DButton>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-ui-muted">Role-play</span>
          {['all', ...speakers].map((speaker) => (
            <Soft3DButton
              key={speaker}
              type="button"
              variant="custom"
              depth="sm"
              aria-pressed={focusedSpeaker === speaker}
              onClick={() => setFocusedSpeaker(speaker)}
              className={cn(
                'w-auto rounded-[11px] px-3 py-1.5 text-xs normal-case tracking-normal',
                focusedSpeaker === speaker
                  ? 'border-brand-primary-edge bg-[#EAF7FE] text-brand-primary'
                  : 'border-ui-border bg-ui-surface text-ui-muted-strong',
              )}
            >
              {speaker === 'all' ? 'Both speakers' : speaker}
            </Soft3DButton>
          ))}
        </div>

        {dialogue.grammarFocus && (
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Grammar focus">
            <span className="mr-1 text-[11px] font-black uppercase tracking-[0.08em] text-ui-muted">Grammar focus</span>
            {dialogue.grammarFocus.map((grammar) => (
              <span key={grammar} className="rounded-[10px] bg-[#EAF7FE] px-3 py-1 font-chinese text-sm font-black text-brand-primary">
                {grammar}
              </span>
            ))}
          </div>
        )}
      </header>

      <section className="mt-6 space-y-3" aria-label="Dialogue lines">
        {dialogue.lines.map((line, index) => {
          const isFocused = focusedSpeaker === 'all' || focusedSpeaker === line.speaker;
          const alignRight = index % 2 === 1;
          return (
            <article
              key={line.id}
              className={cn(
                'flex gap-3 transition-opacity',
                alignRight && 'flex-row-reverse',
                !isFocused && 'opacity-35',
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ui-canvas font-chinese text-sm font-black text-brand-primary" aria-hidden="true">
                {line.speaker.slice(0, 1)}
              </div>
              <div className={cn(
                'max-w-[82%] rounded-[18px] border-b-2 p-4',
                alignRight
                  ? 'rounded-tr-[6px] border-brand-primary-edge bg-[#EAF7FE]'
                  : 'rounded-tl-[6px] border-ui-border bg-ui-canvas',
              )}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="font-chinese text-xs font-black text-brand-primary">{line.speaker}</p>
                  <IconButton3D
                    icon={<AppIcon name="audio" size={15} />}
                    size="sm"
                    variant="primary"
                    onClick={() => speakLine(index)}
                    className="h-8 w-8 rounded-[10px] border-b-2 border-brand-primary-edge bg-ui-surface p-1 text-brand-primary active:translate-y-[3px]"
                    aria-label={`Play ${line.speaker}'s line ${index + 1}`}
                  />
                </div>
                <SmartSentence
                  text={getGrammarText(line.text, characterPreference)}
                  className="font-chinese text-lg font-bold leading-relaxed text-ui-ink-strong sm:text-xl"
                />
                {showPinyin && line.text.pinyin && (
                  <p className="mt-1 text-sm font-bold leading-relaxed text-brand-primary">{line.text.pinyin}</p>
                )}
                {showTranslation && line.text.english && (
                  <p className="mt-1 text-sm font-bold leading-relaxed text-ui-muted-strong">{line.text.english}</p>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {comprehension && canComplete && (
        <section className="mt-8 border-t-2 border-ui-divider pt-6" aria-labelledby="dialogue-check-heading">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-brand-secondary">Check understanding</p>
          <h2 id="dialogue-check-heading" className="mt-1 font-chinese text-xl font-black text-ui-ink-strong">{comprehension.prompt}</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {comprehension.options.map((option) => (
              <Soft3DButton
                key={option}
                type="button"
                variant="custom"
                depth="sm"
                onClick={() => {
                  setSelectedAnswer(option);
                  setAnswerStatus('idle');
                }}
                aria-pressed={selectedAnswer === option}
                className={cn(
                  'rounded-[13px] px-3 py-2.5 font-chinese text-base normal-case tracking-normal',
                  selectedAnswer === option
                    ? 'border-brand-primary-edge bg-[#EAF7FE] text-brand-primary'
                    : 'border-ui-border bg-ui-surface text-ui-ink-strong',
                )}
              >
                {option}
              </Soft3DButton>
            ))}
          </div>
          {answerStatus === 'wrong' && (
            <p className="mt-4 rounded-[14px] bg-[#FFF1F1] p-3 text-sm font-bold text-feedback-danger" role="status">
              {comprehension.hint}
            </p>
          )}
          {answerStatus === 'correct' && (
            <p className="mt-4 flex items-center gap-2 rounded-[14px] bg-[#E8F9DC] p-3 text-sm font-black text-feedback-success" role="status">
              <AppIcon name="check" size={19} /> Correct — {comprehension.answer}.
            </p>
          )}
        </section>
      )}

      {!canComplete && (
        <p className="mt-6 rounded-[14px] bg-[#EAF7FE] p-3 text-sm font-bold text-brand-primary" role="status">
          Reference mode: return to the exercise when you are ready to complete this lesson.
        </p>
      )}

      <div className="sticky bottom-3 z-10 mt-6 flex gap-3 rounded-[18px] border border-ui-divider bg-ui-surface/95 p-3 backdrop-blur-sm">
        <Soft3DButton
          type="button"
          variant="custom"
          depth="sm"
          onClick={onBack}
          className="w-auto rounded-[13px] border-ui-border bg-ui-surface px-4 py-2.5 text-xs normal-case tracking-normal text-ui-muted-strong"
        >
          <AppIcon name="back" size={17} /> Back
        </Soft3DButton>
        {!canComplete ? (
          <Soft3DButton type="button" depth="sm" onClick={onStartExercise} className="py-2.5 normal-case tracking-normal">
            Start exercise <AppIcon name="next" size={18} />
          </Soft3DButton>
        ) : answerStatus === 'correct' ? (
          <Soft3DButton type="button" depth="sm" onClick={onComplete} className="py-2.5 normal-case tracking-normal">
            Finish lesson <AppIcon name="next" size={18} />
          </Soft3DButton>
        ) : (
          <Soft3DButton
            type="button"
            depth="sm"
            disabled={!selectedAnswer}
            onClick={checkAnswer}
            className="py-2.5 normal-case tracking-normal"
          >
            Check answer
          </Soft3DButton>
        )}
      </div>
    </article>
  );
}
