# RongWaps Character Bible

## Purpose

The RongWaps cast makes grammar feel like communication between real people, not a stack of abstract rules. Characters should help a learner understand *who is speaking, what they want, and why the grammar changes* before the learner reads a formal explanation.

The cast is designed for a broad audience. They are friendly college-age adults and working adults, never child mascots. Their warmth comes from expression, posture, and clear visual storytelling rather than exaggerated cartoon proportions.

## Reference sheets

- `src/assets/images/characters/rongwaps-main-cast-reference.png`
- `src/assets/images/characters/rongwaps-supporting-cast-reference.png`

The sheets are visual direction only. Production lesson art should use individually exported character poses or portraits derived from this direction, not display a complete reference sheet.
Compressed `*-app.jpg` copies are the temporary runtime crops used by the first pilot.

## Main student cast

| Character | Role in the learning world | Visual signature | Personality and teaching use |
| --- | --- | --- | --- |
| 友美 Youmei | Calm observer and frequent newcomer | Coral cardigan, dark bob, sketchbook | Gives beginners time to notice details. Best for introductions, comparisons, descriptions, and reflective choices. |
| 中明 Zhongming | Curious connector | Yellow overshirt, blue shirt, phone and backpack | Asks the question a beginner may be afraid to ask. Best for discovery, routes, social situations, and friendly mistakes. |
| 宜文 Yiwen | Energetic guide | Teal jacket, high ponytail, notebooks | Moves a scene forward and makes patterns visible. Best for classroom, planning, shopping, and collaborative challenges. |
| 國安 Guoan | Practical supporter | Green hoodie, navy jacket, water bottle | Grounds grammar in useful everyday action. Best for schedules, health, transport, and problem-solving. |
| 元真 Yuanzhen | Confident organizer | Cobalt top, coral scarf, route card/tablet | Makes sequence, categories, and decisions easy to see. Best for time, directions, comparison, and structured tasks. |
| 家樂 Jiale | Friendly analyst | Burnt-orange sweater, curly hair, workbook | Notices patterns without sounding like a textbook. Best for grammar repair, evidence, and “why this answer?” moments. |

## Supporting cast

The teacher, parent, doctor, café worker, apartment agent, and older neighbor widen the app beyond student life. They should appear when a scene genuinely needs their role, not merely as decoration.

Each supporting character has one immediately readable prop. Props must clarify the situation without requiring English text.

## Visual language

- Original modern 2D editorial illustration with rounded, crisp shapes.
- Adult proportions around 5.5–6 heads tall. Never chibi or childlike.
- Dark-charcoal outlines, flat color, minimal tonal shading, no glossy 3D rendering.
- Core palette: vivid sky blue, sunny yellow, leaf green, warm coral, cream, deep navy, and soft charcoal.
- One clear gesture and one useful prop per pose.
- Expressions should be readable at small lesson-card sizes.
- Avoid franchise resemblance, branded clothing, flags as emoji, written labels inside art, and culturally reductive costumes.

## Expression set

Every main character should eventually have:

1. Neutral/listening
2. Friendly speaking
3. Curious/questioning
4. Thinking/uncertain
5. “I noticed it” realization
6. Gentle correction
7. Small success
8. Situation-specific action pose

Wrong answers should never make a character look angry at the learner. A repair moment uses curiosity, surprise, or an encouraging “look again” expression.

## Motion principles

- Motion explains meaning: a name card slides to 叫, a surname tab narrows to 姓, and 嗎 travels to the sentence ending.
- Character motion is small and purposeful: eye direction, a hand pointing to evidence, a card being offered, or a posture shift.
- Avoid constant idle bouncing. The workspace should stay calm enough to read.
- Success animation celebrates the learner’s idea, not speed or streak pressure.

## Scene composition

- One dominant teaching idea per view.
- Characters look toward the important word, object, or sentence slot.
- Use props and spatial relationships before explanatory paragraphs.
- Chinese is visually primary; pinyin is quieter; English support is last.
- A scene must still make sense when English translation is hidden.
- Every Chinese teaching word remains selectable for contextual dictionary help.

## Production rules

- Keep the reference-sheet source files unchanged.
- Export individual production assets with consistent crop, line weight, and scale.
- Prefer transparent PNG or SVG-ready vector art for reusable portraits and poses.
- Name assets by character, pose, and version, for example `youmei-questioning-v1.png`.
- Add new reusable portrait or scene components to `src/lib/widgets/` and document them in `WIDGETS.md`.
- Lesson-specific composition belongs with its lesson screen, while shared character rendering remains reusable.

## Grammar lesson use

Character art is optional support, not the structure of a grammar lesson. The default Learn view stays book-first and text-led. Use a portrait only when the speaker’s identity is necessary to understand a source example or practice prompt.
