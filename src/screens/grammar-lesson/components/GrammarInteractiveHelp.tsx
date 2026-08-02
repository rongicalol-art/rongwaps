import {
  DisclosureLine,
  GrammarAbilityLab,
  GrammarCompareLab,
  GrammarDiscoveryLab,
  GrammarLiveSceneLab,
  GrammarNumberLab,
  GrammarPairCompareLab,
  GrammarRouteLab,
  GrammarRuleContrast,
  GrammarSequenceLab,
  GrammarTimeRangeLab,
  GrammarTimelineLab,
  SentenceSpine,
} from '../../../lib/widgets';
import type { GrammarWordToken, InteractiveGrammarPage } from '../../../types/models';
import { GrammarContrastSection } from './GrammarContrastSection';

interface GrammarInteractiveHelpProps {
  page: InteractiveGrammarPage;
  characterPreference: 'traditional' | 'simplified';
  showPinyin: boolean;
  showTranslation: boolean;
  contextTokens: GrammarWordToken[];
  onOpenWord: (word: string) => void;
}

export function GrammarInteractiveHelp({
  page,
  characterPreference,
  showPinyin,
  showTranslation,
  contextTokens,
  onOpenWord,
}: GrammarInteractiveHelpProps) {
  const hasSpecializedLab = Boolean(
    page.numberLab
    || page.routeLab
    || page.sentenceSpine
    || page.liveSceneLab
    || page.timeRangeLab
    || page.timelineLab
    || page.sequenceLab
    || page.abilityLab
    || page.compareLab
    || page.pairCompareLab,
  );
  const hasHelp = Boolean(
    page.discoveryLab
    || hasSpecializedLab
    || page.contrast
    || page.ruleContrast,
  );

  if (!hasHelp) return null;

  const sharedLabProps = {
    characterPreference,
    showPinyin,
    showTranslation,
    contextTokens,
    onOpenWord,
  };

  return (
    <DisclosureLine
      className="mt-8"
      title="Interactive help"
      description="Optional visual explanation"
    >
      {page.discoveryLab && !hasSpecializedLab && (
        <GrammarDiscoveryLab
          lab={page.discoveryLab}
          focusTerms={page.focusTerms}
          {...sharedLabProps}
        />
      )}
      {page.numberLab && <GrammarNumberLab lab={page.numberLab} {...sharedLabProps} />}
      {page.routeLab && <GrammarRouteLab lab={page.routeLab} {...sharedLabProps} />}
      {page.sentenceSpine && <SentenceSpine spine={page.sentenceSpine} {...sharedLabProps} />}
      {page.liveSceneLab && <GrammarLiveSceneLab lab={page.liveSceneLab} {...sharedLabProps} />}
      {page.timeRangeLab && <GrammarTimeRangeLab lab={page.timeRangeLab} {...sharedLabProps} />}
      {page.timelineLab && <GrammarTimelineLab lab={page.timelineLab} {...sharedLabProps} />}
      {page.sequenceLab && <GrammarSequenceLab lab={page.sequenceLab} {...sharedLabProps} />}
      {page.abilityLab && <GrammarAbilityLab lab={page.abilityLab} {...sharedLabProps} />}
      {page.compareLab && <GrammarCompareLab lab={page.compareLab} {...sharedLabProps} />}
      {page.pairCompareLab && <GrammarPairCompareLab lab={page.pairCompareLab} {...sharedLabProps} />}
      {page.contrast && (
        <GrammarContrastSection
          contrast={page.contrast}
          characterPreference={characterPreference}
          contextTokens={contextTokens}
          onOpenWord={onOpenWord}
        />
      )}
      {page.ruleContrast && (
        <GrammarRuleContrast
          contrast={page.ruleContrast}
          characterPreference={characterPreference}
          contextTokens={contextTokens}
          onOpenWord={onOpenWord}
        />
      )}
    </DisclosureLine>
  );
}
