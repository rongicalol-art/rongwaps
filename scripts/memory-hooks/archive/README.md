# Archived memory-hooks experiments

Pilot and experiment stages from 2026-08-28. Nothing in `src/`, `tests/` or the live pack build depends on them. Their npm aliases were removed from `package.json`.

To run one: `npx tsx scripts/memory-hooks/archive/<name>.ts`. To restore it, `git mv` it back to `scripts/memory-hooks/` and fix its relative imports (`../` becomes `./`).

- `prepareBookOnePilot.ts`
- `generatePilotHooksV2.ts`
- `criticPilotHooksV2.ts`
- `reviewPilotStyleLocally.ts`
- `buildComponentLabelCandidates.ts`
- `prepareComponentLabelProposalPacket.ts`
- `runComponentLabelProposal.ts`
- `prepareReviewedLabelsAndSceneViability.ts`
- `runSceneViability.ts`
- `runSceneViabilityStrict.ts`
- `prepareFrameRecoveryPass.ts`
- `prepareRelationshipEvidenceReconnaissance.ts`
- `prepareTargetRelationshipEvidencePilot.ts`
- `adjudicateTargetRelationshipEvidencePilot.ts`
- `prepareCharacterMeaningProfilePreview.ts`
- `previewCanonicalMeaningCleanup.ts`
- `reviewConstructionMeaningLayer.ts`
