# Memory-hook metadata enrichment

This is a development-only preparation layer. It does not publish labels,
change the frozen 47-character evaluation, or call an AI provider.

## Canonical learner meaning

`CanonicalMeaningDecision.selectedMeaning` is the learner-facing construction
label. Classifier/course notes are stored separately in
`selectedClassifier`, for example:

```json
{
  "selectedMeaning": "letter",
  "selectedClassifier": {
    "raw": "(M: 封fēng)",
    "entries": [{ "character": "封", "pinyin": "fēng" }],
    "source": "lesson-vocabulary"
  }
}
```

The raw lesson meaning remains in `lessonSpecificMeanings`. The classifier is
not allowed to enter a target `字(label)` token.

## Component label candidates

`memory-hooks:prepare:labels` creates
`output/memory-hooks/book-1-component-label-candidates-v1.json` from the
development-only component profiles. Each record keeps:

- raw glosses and readings;
- unapproved label candidates derived from those raw glosses;
- a deterministic disposition (`candidate-review`, `review-required`, or
  `withhold`);
- reasons and source references;
- an explicit `targetSpecificUse: "not-evaluated"` marker.

These are proposals, not lexicon entries. No candidate is automatically
approved, treated as a visual label, or assigned a semantic/phonetic role.
Unencoded nodes, missing metadata, stroke fragments, and component-cluster
descriptions remain withheld. Ambiguous or technical metadata remains review
required.

## Next controlled step

The next step is to review the candidate artifact and decide which provider and
endpoint should propose learner labels. The repository currently has no Luna
configuration. Once a provider is explicitly selected, its output should be
stored as a separate proposal artifact and passed through deterministic checks;
only manually approved proposals should update the lexicon. Target-specific
usefulness and frame selection remain a separate planner stage.
