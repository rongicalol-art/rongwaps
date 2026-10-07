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

Book-1 simplicity loop (archived 2026-10, Book 1 rollout complete; Book N uses `hooks gates` / `hooks run`). Hard-coded to `book-1-*` artifacts:

- `reviewBookOneSimplicity.ts`, `remakeBookOneHooks.ts`, `runBookOneReviewLoop.ts` (run the last; it imports the other two)
