import { GrammarFocusText } from '../../../lib/widgets';
import type { GrammarContrast, GrammarWordToken } from '../../../types/models';
import { GrammarParticleWorkshop } from './GrammarParticleWorkshop';
import { GrammarQuickChecks } from './GrammarQuickChecks';

interface GrammarContrastSectionProps {
  contrast: GrammarContrast;
  characterPreference: 'traditional' | 'simplified';
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarContrastSection({
  contrast,
  characterPreference,
  contextTokens,
  onOpenWord,
}: GrammarContrastSectionProps) {
  return (
    <section className="border-t-2 border-ui-divider py-8" aria-labelledby="grammar-contrast-heading">
      <div className="mb-5 max-w-3xl">
        <h2 id="grammar-contrast-heading" className="text-sm font-black uppercase text-ui-ink-strong">
          <GrammarFocusText
            text={contrast.title}
            contextTokens={contextTokens}
            characterPreference={characterPreference}
            onOpenWord={onOpenWord}
          />
        </h2>
        <p className="mt-2 text-sm font-bold leading-6 text-ui-muted-strong">
          <GrammarFocusText
            text={contrast.description}
            contextTokens={contextTokens}
            characterPreference={characterPreference}
            onOpenWord={onOpenWord}
          />
        </p>
      </div>

      <GrammarParticleWorkshop
        items={contrast.items}
        characterPreference={characterPreference}
        contextTokens={contextTokens}
        onOpenWord={onOpenWord}
      />
      {contrast.microChecks && (
        <GrammarQuickChecks
          checks={contrast.microChecks}
          characterPreference={characterPreference}
          contextTokens={contextTokens}
          onOpenWord={onOpenWord}
        />
      )}
    </section>
  );
}
