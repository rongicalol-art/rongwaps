import type { GrammarCompletionRecap as GrammarCompletionRecapData } from '../../../types/models';

interface GrammarCompletionRecapProps {
  recap: GrammarCompletionRecapData;
  characterPreference: 'traditional' | 'simplified';
}

export function GrammarCompletionRecap({ recap, characterPreference }: GrammarCompletionRecapProps) {
  const textFor = (traditional: string, simplified?: string) => (
    characterPreference === 'simplified' && simplified ? simplified : traditional
  );

  return (
    <section aria-labelledby="grammar-completion-recap" className="mb-4 border-y-2 border-ui-divider py-4">
      <h3 id="grammar-completion-recap" className="text-sm font-black text-ui-ink-strong">{recap.title}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs font-black text-feedback-success">Keep</p>
          <p className="mt-1 font-chinese text-base font-black text-ui-ink-strong">
            {textFor(recap.correct.traditional, recap.correct.simplified)}
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-ui-muted-strong">{recap.correct.explanation}</p>
        </div>
        {recap.avoid.map((item) => (
          <div key={item.traditional}>
            <p className="text-xs font-black text-feedback-danger">Avoid</p>
            <p className="mt-1 font-chinese text-base font-black text-ui-ink-strong">
              {textFor(item.traditional, item.simplified)}
            </p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-ui-muted-strong">{item.explanation}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
