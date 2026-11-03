# Lesson-test picture review (one reviewer per picture, Sonnet)

A reviewer looks at the finished picture as a learner sees it (the cut panels `src/assets/images/lesson-tests/<name>-1/2/3.webp`
for a strip, `<name>.webp` for a single) next to its brief (`briefs/<name>.txt`) and the style benchmark
(`src/assets/images/readings/b1l01-r01-new-classmate-v8.webp`, the owner's approved lesson cover). Read every image file.
Judge only what is drawn; never edit files. Be strict: a learner must answer from this picture alone.

## Fail the picture for any of these

1. **Weird AI mistakes**: things a person would never do or that cannot physically be. Examples: holding a phone the
   wrong way round (looking at it while its screen faces the viewer), a watch on the wrong side of the wrist, a cup
   with no bottom, a straw through a lid that isn't there, hands with extra, missing or fused fingers, limbs bending
   wrongly, two left feet, objects melting into each other or into a person, a chair with three legs at odd angles,
   a door handle on the hinge side, shadows going two ways, a bowl floating above the table.
2. **Unclear focus**: the thing the question is about is small, hidden, cropped, blurred into the background, or
   competes with a bigger or brighter object. At a 180 px wide thumbnail you must still see it at once. In a strip,
   the panels must differ only in the tested detail, and that difference must be obvious.
3. **Wrong content**: it doesn't show what the brief says (wrong object, wrong number, wrong person, wrong time on a
   clock, a forbidden item present), or a wrong answer panel could also be read as right.
4. **Text**: any garbled, fake or misspelled writing; any writing the brief didn't ask for; text the brief gives
   that isn't drawn exactly (every Chinese character and number).
5. **Style drift** from the benchmark: anime styling (outlined hair strands, big glossy eyes, detailed lips),
   painterly or soft shading, gradients, 3D, photorealism, or children's clip-art (a lone icon on a blank
   background, mascot animals with tongues out, primary-colour kids' book look). The benchmark is flat, saturated
   (cobalt, coral, yellow, teal), geometric, with sparse hard-edged shadow shapes and real settings. Test it
   honestly: picture this image on a phone right after the benchmark in the same app. If it would look like it came
   from a different artist (a single object floating on a plain coloured backdrop or one flat wall-and-table-edge
   strip, chibi kids with huge heads, generic faces in another drawing style), it fails; this was missed before, so
   don't wave it through because the content is right.
6. **People**: book characters must match their portraits (`src/assets/images/characters/portraits/`); adults,
   not children (unless the brief says children); faces in the benchmark's simple style.

## Answer (JSON only)

```json
{"name": "b1l07-check", "verdict": "keep" | "redraw",
 "issues": [{"panel": 1 | 2 | 3 | null, "kind": "ai-mistake" | "focus" | "content" | "text" | "style" | "people",
             "detail": "what is wrong, in one sentence", "fix": "the one instruction a redraw needs"}]}
```

`redraw` when any issue would confuse a learner or looks wrong to an adult at a glance; `keep` with no issues
otherwise. Don't report taste preferences that don't fit a kind above.
