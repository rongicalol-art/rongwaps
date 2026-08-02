import { ActionButton, AppIcon } from '../../../lib/widgets';
import type { InteractiveGrammarPart } from '../../../types/models';

interface GrammarCompletionPageProps {
  part: InteractiveGrammarPart;
  onReview: () => void;
  onFinish: () => void;
}

export function GrammarCompletionPage({ part, onReview, onFinish }: GrammarCompletionPageProps) {
  return (
    <article className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-4 sm:py-8">
      <div className="w-full rounded-[24px] border border-ui-divider bg-ui-surface px-5 py-8 text-center sm:px-10 sm:py-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#E8F9DC] text-feedback-success">
          <AppIcon name="check" size={38} />
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.1em] text-feedback-success">Part complete</p>
        <h1 className="mt-2 text-2xl font-black text-ui-ink-strong sm:text-3xl">{part.completionTitle}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-bold leading-6 text-ui-muted-strong sm:text-base">
          {part.completionDescription}
        </p>

        <section className="mx-auto mt-7 max-w-lg border-y-2 border-ui-divider py-5" aria-label="Grammar learned">
          <p className="text-[11px] font-black uppercase tracking-[0.08em] text-ui-muted">Grammar learned</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {(part.dialogue.grammarFocus ?? []).map((grammar) => (
              <span key={grammar} className="rounded-[12px] bg-[#EAF7FE] px-4 py-2 font-chinese text-xl font-black text-brand-primary">
                {grammar}
              </span>
            ))}
          </div>
        </section>

        <div className="mx-auto mt-7 grid max-w-lg gap-3 sm:grid-cols-[0.8fr_1.2fr]">
          <ActionButton
            variant="secondary"
            onClick={onReview}
          >
            <AppIcon name="restart" size={18} /> Review grammar
          </ActionButton>
          <ActionButton onClick={onFinish}>
            Return to Lesson {part.lessonId} <AppIcon name="next" size={18} />
          </ActionButton>
        </div>

        <p className="mt-6 text-xs font-bold text-ui-muted">{part.nextBookLabel}</p>
      </div>
    </article>
  );
}

