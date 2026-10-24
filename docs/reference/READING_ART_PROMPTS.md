# Book 1 reading art: Luna execution brief

Status: app illustrations are applied for Book 1 lessons 1–16, slots 1–3. Lesson 1 slot 1 remains the approved style benchmark. Slot 3 is the short reading, not a third dialogue.

Source: `content/readings/book-1.json`. Character identities: `src/utils/lesson/speakerCharacters.ts` and the saved portraits. Scenes below select one illustrative moment from each reading; they are not literal transcriptions. Where a short reading leaves its narrator unnamed, named cast members are illustrative casting choices, not claims about narrator identity.

## Paste this instruction into Luna

> Use `docs/reference/READING_ART_PROMPTS.md` as the complete image-generation brief. Generate only the lesson/slot or batch I request. Do not generate the entire book unless I explicitly ask. Use the built-in image-generation tool and imagegen skill. For each image, read the master prompt and its scene block, inspect and attach the approved L01-R01 illustration as the style reference, then inspect and attach only the cast portraits listed for that scene. Combine the master prompt, the selected cast descriptions, and the scene block into one complete prompt; do not send a scene block alone. Preserve character identities while changing pose, expression, camera, and setting. Produce one 16:9 image per reading. Inspect the actual output against the acceptance checklist. Save new images under `output/imagegen/book-1/B1Lxx-R0x.png`, using a version suffix if the filename already exists, and save the exact submitted prompt beside each image as `.prompt.txt`. Show each result for review. Keep the approved L01-R01 image. Generation only: do not replace app assets, edit reading content, change packs, or wire images into the app. Stop after the requested batch.

Generation batches A–C for Lessons 9–16 are complete. Generate additional images only for a newly requested batch; use separate image-generation calls, one image per call.

## Reference priority

1. **Current primary approved style reference: composition quality, rendering, saturation and proportions.** `src/assets/images/readings/b1l01-r01-new-classmate-v8.webp`. Inspect it first as a style reference, not as a template for its classroom or poses.
2. **Individual portraits: identity, hair, face, outfit colors.** All filenames below are relative to `src/assets/images/characters/portraits/`. Attach only the scene's listed cast; identify which reference belongs to which name in the submitted prompt.
3. **Scene block: action, setting, props, framing.** The scene block overrides the master prompt only where explicitly stated, such as adding a winter coat over an established outfit.

Use the flat portraits rather than the more detailed anime-like full-body cast sheets. Jiale's saved portrait has round glasses: keep them even though the older full-body sheet omits them. Yuanzhen and Youmei both have bobs: preserve Yuanzhen's side part/scarf and Youmei's straight bangs/coral cardigan. The teacher is a woman.

| Cast key / reference | Identity lock |
| --- | --- |
| `youmei.webp` | Youmei / 友美: plum-black bob with straight bangs; coral cardigan, white collared blouse; warm peach skin. |
| `zhongming.webp` | Zhongming / 中明: wavy black hair, warm tan skin; yellow overshirt, cyan/blue T-shirt. |
| `yiwen.webp` | Yiwen / 宜文: high dark ponytail with coral tie; teal jacket; expressive eyes. |
| `guoan.webp` | Guoan / 國安: short dark hair, broad eyebrows; green hoodie under navy jacket. |
| `yuanzhen.webp` | Yuanzhen / 元真: side-parted shoulder-length dark bob; cobalt top and coral neck scarf. |
| `jiale.webp` | Jiale / 家樂: curly light-brown hair, round glasses; burnt-orange sweater, white collar. |
| `teacher.webp` | Teacher / 林老師: woman with curled dark bob; royal-blue cardigan over ivory top. |
| `parent.webp` | Zhongming's mother / 媽媽: dark wavy hair; coral knit sweater. |
| `doctor.webp` | Doctor / 醫生: man with short parted dark hair; white coat, green shirt, stethoscope. |
| `cafeWorker.webp` | Shop worker / 女店員: woman with low bun; yellow apron over teal polo. |

Do not add unnamed recurring characters to existing cast identities. For the unnamed online friend in L11-R03, use the restrained treatment specified in that block rather than assigning him a canonical identity.

## Master prompt — prepend to every scene

```text
Use case: illustration-story.
Asset: one polished 16:9 landscape illustration for a Mandarin-learning reading. This is aesthetic story art: convey the situation through one memorable moment, without illustrating every line.

Use the attached approved classroom illustration as the visual benchmark. Use the separately attached, named character portraits to lock identities: recognizable faces, hairstyle silhouettes, skin tones, outfit colors, friendly geometric proportions. Adult university students, not children. Keep the same illustration system across the whole series; do not blend or swap character features. Repose the characters naturally for this scene.

Style: Kurzgesagt-inspired approachable flat vector illustration, rounded geometric forms, smooth curves, simplified expressive faces, crisp shape boundaries and confident single-hue color blocks. Keep eyes open with a clear natural gaze by default; use closed eyes only for an explicitly requested blink, sleep or wink. Expressions should feel natural, varied and suited to the scene; avoid repeated broad smiles and keep mouths closed by default. Draw mouths as simple single-line marks, with no detailed lips or facial anatomy. Open mouths only for explicit laughter or singing, and keep them simple. The scene-specific facial-acting directions below override generic smile cues. Treat the approved illustration as a reference for color, shape language and rendering only; do not copy its facial expression. Extremely saturated colors with strong warm/cool contrast: deep teal, indigo and cobalt against coral, golden yellow and cyan; occasional magenta accents. Let each scene choose a dominant pair rather than using every hue equally. Favor solid flat color, with sparse hard-edged shadow shapes and only the subtle tonal variation visible in the approved example. No conspicuous gradients, grain, texture, painterly shading, heavy outlines, photorealism or 3D.

Art direction: creative, dynamic and clearly composed. One primary action, strong silhouettes, purposeful diagonal or curved visual flow, expressive body language. Establish foreground, subject and background through overlap and scale. Vary camera height, distance, architecture and time of day across images. Give props physical places in the scene; do not scatter floating icons around people. Backgrounds support the action with a few deliberate shapes. Keep faces, hands and the key object comfortably within frame and readable at thumbnail size. Full image, no borders, no crop-dependent composition.

No dialogue balloons, captions, titles, labels, readable writing, fake Chinese, logos, watermarks or UI overlays. Book pages, signs, menus and device screens use restrained abstract marks or shapes only. Where a scene needs a clock, show an unnumbered analog face with the specified hands. No unnecessary flags or nationality stereotypes. Simple background extras only when the scene explicitly needs them; keep attention on the named cast.

Use the cast and scene instructions below. Deliver exactly one coherent illustration, not a comic, collage, storyboard, infographic or contact sheet.
```

## Lesson 1 — New classmates

### B1L01-R01 — The new classmate — APPROVED, SKIP

- Cast: `yiwen`, `youmei`, `zhongming`.
- Existing approved file: `output/imagegen/b1l01-dialogue-1-new-classmate.png`.
- Scene anchor: Youmei waves in the classroom doorway; Yiwen introduces her with an open palm; Zhongming turns in his chair. Sunlit windows, diagonal desks, coral against teal. Keep this image as the series benchmark; do not regenerate it by default.
- Facial acting: Yiwen is warmly confident, Youmei shyly curious, and Zhongming quietly intrigued.

### B1L01-R02 — First hello

- Cast references: `zhongming.webp`, `youmei.webp`.
- Scene prompt: In the classroom just after arrival, Zhongming and Youmei introduce themselves beside a broad sunlit window. Zhongming gestures lightly to his chest, while Youmei holds a book and answers with a friendly smile. Use an intimate side-on medium view, with a curved chair back anchoring the foreground and the window framing both faces. A few geometric campus roofs outside establish Taiwan without symbols or labels. Emphasize the yellow/coral outfits against cobalt window framing. Keep this a two-person connection, distinct from the three-person arrival scene.
- Facial acting: A warm, slightly shy first introduction.

### B1L01-R03 — A taste of Taiwan

- Cast references: `youmei.webp`.
- Scene prompt: Youmei enjoys a pearl milk tea and a colorful bowl of freshly cut fruit at an open-air Taiwanese café counter. Her lifted cup, visible dark tapioca pearls, and delighted expression are the focus; pineapple, watermelon and mango form a bold foreground still life. Frame her slightly off-center beneath a simple awning with bright foliage beyond. Use a low tabletop viewpoint and sweeping curved fruit shapes. Coral and mango yellow pop against deep teal. Convey her affection for Taiwan and its food through this one joyful moment, without a written self-introduction.
- Facial acting: Youmei is delighted by her first sip of bubble tea.

## Lesson 2 — Days and routines

### B1L02-R01 — Out the door

- Cast references: `zhongming.webp`, `parent.webp`.
- Scene prompt: At home on a bright morning, Zhongming swings a backpack over one shoulder near the open front door while his mother turns toward him from a breakfast table. Books tucked into the bag suggest a library visit before afternoon class. Capture the movement of the bag strap and his half-turn as they discuss his day. View from inside the home, with a diagonal strip of sunlight leading out toward campus. A modest unnumbered clock can show shortly before nine. Warm yellow door and coral mother against teal interior; no timetable or calendar graphics.
- Facial acting: A lively morning send-off at home.

### B1L02-R02 — Birthday plans after class

- Cast references: `yiwen.webp`, `zhongming.webp`, `youmei.webp`.
- Scene prompt: After Friday classes, Yiwen excitedly invites Zhongming and Youmei to her birthday gathering. They pause on broad school steps; Yiwen leans into the conversation with an animated hand gesture, Zhongming has a sudden delighted realization, and Youmei smiles warmly. No gifts yet: this is the invitation, not the party. Use a slightly low, wide view with the steps forming energetic diagonal bands and a school doorway behind. Coral afternoon light, teal shadows and golden book edges create a cheerful end-of-week mood. Keep the three faces unobstructed.
- Facial acting: An excited invitation catches Zhongming by surprise.

### B1L02-R03 — A busy student's day

- Cast references: `youmei.webp`.
- Scene prompt: Youmei studies at a library desk in early afternoon, setting her backpack down as she opens a book. A small lunch container tucked in the open bag hints at the busy day connecting school and home. An unnumbered wall clock shows one o'clock. Let a sweeping shelf and broad window guide the eye toward her focused face and busy hands. Use a high three-quarter view, with a cyan tabletop and saturated coral stationery against indigo shelving. One coherent moment from her daily routine; no multiple versions of Youmei or illustrated schedule.
- Facial acting: Youmei is quietly absorbed in her afternoon study.

## Lesson 3 — Gifts and birthdays

### B1L03-R01 — Choosing a thoughtful gift

- Cast references: `yiwen.webp`, `zhongming.webp`.
- Scene prompt: At a school courtyard table, Yiwen holds up two Chinese-study books as a proposed birthday gift for Youmei while Zhongming responds enthusiastically. Keep the pages and covers unlettered. His open hand suggests a lively new idea; do not show a purchased cake or flowers as if the shopping has already happened. Use an overhead three-quarter view with the two books as the compositional hinge and a circular tree shadow behind them. Bright coral book covers and golden sunlight against teal seating. The scene should feel conspiratorial and affectionate, planning a surprise for an absent friend.
- Facial acting: They share an eager, conspiratorial birthday plan.

### B1L03-R02 — The little white pencils

- Cast references: `yiwen.webp`, `zhongming.webp`.
- Scene prompt: At a stationery shop counter, Yiwen lifts two small white pencils together while Zhongming compares them with a red pencil nearby and nods approvingly. Make the white pair unmistakable against a saturated cobalt counter. Take a close, low counter-level viewpoint: large pencil trays in the foreground lead to their faces, with a few bold geometric shelves behind. Teal and coral shelf blocks, yellow clothing accents. The tiny objects receive the visual spotlight through scale and placement, not glow. No readable prices, packaging text, or extra products cluttering the scene.
- Facial acting: Focused concentration over a tiny but important choice.

### B1L03-R03 — Youmei's birthday table

- Cast references: `youmei.webp`, `yiwen.webp`, `zhongming.webp`, `guoan.webp`.
- Scene prompt: At Youmei's home, Youmei beams behind a large birthday cake while Yiwen places two wrapped books on the table, Zhongming presents flowers, and Guoan joins the celebration. Two tiny white pencils sit together beside the books; fruit and a small snack dish complete the table. Frame the four friends in a compact arc, with a bold cake in the near foreground and happy hands leading inward. Warm golden room lighting against indigo evening windows, with coral and teal clothing. No birthday writing, age numerals, floating confetti clutter or extra guests.
- Facial acting: The friends share the joy of Youmei’s birthday.

## Lesson 4 — Food and drinks

### B1L04-R01 — This noodle shop

- Cast references: `zhongming.webp`, `youmei.webp`.
- Scene prompt: On a hot Taiwanese street, Youmei gestures toward a welcoming, quieter noodle shop while Zhongming, warm and hungry, turns eagerly toward its open doorway. Suggest the busier neighboring restaurant with a few simplified silhouettes far behind; do not divide the frame into comparison panels. A steaming beef-noodle bowl visible just inside makes the choice legible without signage. Use a wide street-corner perspective, an awning sweeping across the top, and diagonals leading inside. Brilliant sun-yellow pavement and coral awnings contrast with cool teal shade. No readable shop signs.
- Facial acting: Youmei is thoughtful; Zhongming eagerly spots the noodle shop.

### B1L04-R02 — Two bowls, two teas

- Cast references: `zhongming.webp`, `youmei.webp`, `cafeWorker.webp`.
- Scene prompt: Zhongming and Youmei order at a restaurant counter while the cheerful worker places a tray with two bowls of beef noodles and two teas within reach. Distinguish reddish amber black tea from lighter green tea through liquid color. Zhongming reaches to pay, but show no readable banknote values. Use a strong counter diagonal and a slightly elevated view so the food and all three faces read clearly. Warm coral bowls and yellow apron against a deep teal counter and cobalt kitchen shapes. Generous appetizing food forms; no menu text, price labels or excessive kitchen detail.
- Facial acting: Anticipation as two bowls arrive at the counter.

### B1L04-R03 — Summer drink stop

- Cast references: `youmei.webp`, `yiwen.webp`, `cafeWorker.webp`.
- Scene prompt: At a street drink stall in summer, Youmei and Yiwen receive cold drinks from the worker. Put a vivid fruit juice in one hand and iced milk tea in the other; a few orderly cups behind the counter suggest coffee, milk and tea. Exaggerated clear ice shapes and condensation limited to a few flat marks make the drinks feel refreshing. View from just inside the stall, looking toward the friends under the awning. Huge warm sunlit street shapes beyond, cool cyan counter shade and coral fruit accents. Keep the drinks central; no brand marks or menu lettering.
- Facial acting: A refreshing surprise on a hot afternoon.

## Lesson 5 — Leisure and home

### B1L05-R01 — A delicious invitation

- Cast references: `zhongming.webp`, `youmei.webp`.
- Scene prompt: On a campus bench, Zhongming invites Youmei for Saturday afternoon tea, showing her a phone with a single unlettered photograph of chocolate ice cream. Youmei pauses her reading and lowers one headphone cup, considering his invitation with quiet interest. Keep both characters physically together; the café treat is an image on his phone, not an event already happening. A broad curved bench and the open book create a lively foreground rhythm. Teal foliage, golden sunlight and a coral bench accent. Use a medium three-quarter view; the phone is secondary to their expressions, with no app interface or readable text.
- Facial acting: Zhongming eagerly shares the idea while Youmei considers it with quiet interest.

### B1L05-R02 — Found under the book

- Cast references: `zhongming.webp`, `parent.webp`.
- Scene prompt: In his bedroom, Zhongming lifts a large book and discovers his wallet underneath, his face changing to relieved surprise. His mother appears only at the distant open doorway, carrying a cooking utensil as she returns to preparing food. The book, exposed wallet and reaching hand form a clear visual chain. Use a close desk-level composition with a strong diagonal from the wallet to his face, a few displaced books, and a simplified bed behind. Bright coral wallet against a cobalt desktop and golden overshirt. A funny discovery, not a room full of scattered search clues.
- Facial acting: Relief and a little embarrassment at the wallet discovery.

### B1L05-R03 — The sunny reading corner

- Cast references: `youmei.webp`.
- Scene prompt: Use Youmei as the illustrative resident of a cozy bedroom. She curls comfortably on a sofa reading, while a cat stretches in a broad patch of sunlight beside a large window. A desk, neatly suggested bed, shelves of unlettered books and an unused television in front of the sofa establish the room without crowding it. A gently elevated wide view makes the furniture relationships clear. A large diagonal sun patch connects the cat and reader. Coral sofa, deep teal walls and vivid golden light. Make the cat's relaxed silhouette a secondary delight, not the dominant subject.
- Facial acting: Quiet contentment in a sunny reading corner.

## Lesson 6 — Sports and interests

### B1L06-R01 — Let's play tennis

- Cast references: `guoan.webp`, `youmei.webp`, `yiwen.webp`.
- Scene prompt: Beside a seaside sports court, Yiwen offers a tennis racket toward Youmei while Guoan smiles and turns toward the court. The ocean behind them hints at the swimming suggestion they have moved past. Youmei accepts the new plan enthusiastically; no one is swimming or running. Use a racket rim large in the foreground, framing the friends through its curve, with a court line sweeping into the middle distance. Saturated ocean cyan and cobalt court against coral fence details and golden skin tones. Keep three distinct silhouettes and a lively sense of agreement.
- Facial acting: The friends are upbeat about choosing tennis.

### B1L06-R02 — Maybe this weekend

- Cast references: `guoan.webp`, `zhongming.webp`.
- Scene prompt: Outside a campus building after class, energetic Guoan holds a bicycle by the handlebars and suggests a ride; tired Zhongming slouches amiably on a low wall, headphones around his neck and backpack beside him. Guoan is persuasive, not scolding; Zhongming looks sleepy, not ill. Let the bicycle wheel dominate the near foreground and curve toward the two contrasting poses. A cool breeze bends one simple tree canopy. Cobalt shadows, coral wall, golden shirt and green hoodie. One shared setting, with no split-screen, date symbols, movie posters or multiple activity icons.
- Facial acting: Guoan is enthusiastic; Zhongming is tired but amused.

### B1L06-R03 — Friends on the weekend

- Cast references: `youmei.webp`, `yiwen.webp`, `guoan.webp`, `zhongming.webp`.
- Scene prompt: Four friends spill into a sunny recreation park on the weekend: Youmei carries a tennis racket, Guoan tucks a basketball under his arm, Yiwen walks beside them with a swimming bag and goggles attached, and Zhongming sings playfully as he walks. Use their movement along a broad curved path as the unifying action. Do not portray several sports being played simultaneously. A pool building and simple courts sit quietly in the background. Low wide camera, lively staggered silhouettes, vivid teal landscape against coral paving and golden sunlight. No floating musical notation.
- Facial acting: A relaxed weekend brings out each friend’s personality.

## Lesson 7 — Getting around

### B1L07-R01 — Planning before the bell

- Cast references: `youmei.webp`, `yuanzhen.webp`.
- Scene prompt: In a school corridor, Youmei and Yuanzhen lean together over a phone showing a simple unlabeled street map, then turn toward an open classroom as they realize class is starting. Capture the pivot: one foot already stepping toward the doorway, a bag swinging slightly, one hand still near the map. Use the corridor's diagonal perspective to draw the eye toward the classroom. Coral doorway and scarf against cobalt corridor shadows and bright cyan window light. This is planning tomorrow's hotel visit, not arrival at the hotel. No labels, navigation UI or floating map pins.
- Facial acting: A sudden realization sends them hurrying toward class.

### B1L07-R02 — The MRT makes sense

- Cast references: `youmei.webp`, `yuanzhen.webp`.
- Scene prompt: At a campus table, Youmei traces a route across a large unfolded street map while Yuanzhen nods, deciding that taking the MRT will be more comfortable than walking. Use an unlettered map with a simple rail line, station circles and tiny building blocks, not a detailed cartographic diagram. Through the broad window, an elevated train passes across the background, suggesting the chosen transport. High three-quarter camera with the map as an angular foreground plane. Cobalt rail and teal architecture against coral map accents. Keep Youmei's straight bangs and Yuanzhen's side-parted bob visibly distinct.
- Facial acting: A calm moment of choosing the easier route.

### B1L07-R03 — A city connected by rail

- Cast references: `youmei.webp`.
- Scene prompt: Youmei stands comfortably by an MRT carriage window with a weekend bag, enjoying a city journey. Through the window, a coherent panoramic cityscape leads toward distant airport runways and a small airplane. Overhead inside the carriage, an abstract route strip has red, green and blue lines with no writing; make this a modest environmental detail. Use a sweeping window curve and repeating seat shapes, with the train interior framing her face. Saturated cobalt interior, warm coral seat, brilliant cyan sky. Convey convenient travel from home toward the airport without turning the scene into a transit infographic.
- Facial acting: Youmei enjoys a peaceful ride through the city.

## Lesson 8 — Clothes and shopping

### B1L08-R01 — A skirt worth noticing

- Cast references: `yiwen.webp`, `yuanzhen.webp`.
- Scene prompt: Yiwen admires Yuanzhen's skirt as the friends chat on a campus walkway, planning a shopping trip. Yuanzhen lightly holds one side of the skirt to show its shape, smiling; preserve her cobalt top and coral scarf, adding a simple skirt compatible with that outfit. Yiwen's delighted open-handed gesture leads toward the fabric. Medium full-figure composition with a curved planter and broad architectural blocks behind. Cobalt, coral and bright teal dominate. Keep the conversation kind and confident; no body-size jokes, measuring tapes, brand logos or shopping scene presented as already underway.
- Facial acting: Yiwen admires Yuanzhen’s outfit, and Yuanzhen feels pleased.

### B1L08-R02 — Catching the elevator

- Cast references: `yiwen.webp`, `yuanzhen.webp`.
- Scene prompt: In a department store near closing, Yiwen and Yuanzhen hurry toward an open elevator, laughing at their rush to reach the shoe floor. A nearby fitting-room return rack holds the yellow and blue trousers Yiwen tried, making clear they were not purchased. A simple black shoe display hints at the next stop. Use an elongated aisle perspective and swinging ponytail/scarf to convey motion. An unnumbered clock shows nine. Violet-blue store architecture, golden elevator light and coral display blocks. No readable floor numerals, closing announcements, clothing labels or bags implying a completed purchase.
- Facial acting: The friends hurry for the elevator with playful urgency.

### B1L08-R03 — Looking is part of the fun

- Cast references: `yiwen.webp`, `jiale.webp`.
- Scene prompt: In a department store with an adjacent bookstore, Yiwen pauses to admire a striking outfit on a mannequin while Jiale browses an open car magazine at a nearby book display. A sweeping architectural curve connects the two zones into one believable shared interior; no divided panels. The magazine shows one bold car illustration without lettering. Both enjoy browsing, with no shopping bags or payment transaction. Saturated cobalt mannequin display, coral seating and warm golden shelves. Slightly elevated wide view, balanced attention on curiosity and discovery rather than luxury products or consumption.
- Facial acting: Quiet curiosity as they browse the store together.

## Lesson 9 — Studying together

### B1L09-R01 — These sentences are tricky

- Cast references: `guoan.webp`, `youmei.webp`.
- Scene prompt: At a quiet school desk, Guoan points to a difficult passage in an open workbook while Youmei leans in thoughtfully, equally puzzled but ready to help find an answer. Use sparse abstract page marks only. In the far background through an open doorway, calligraphy brushes drying on a rack hint at Jiale's class without adding a third visible character. The workbook forms a strong diagonal between the friends, hands and faces. Warm coral desk edges against deep teal shelves and cyan daylight. Focus on shared problem-solving; no floating question marks or magical solution imagery.
- Facial acting: Guoan is frustrated by the passage; Youmei is quietly puzzled but determined to help.

### B1L09-R02 — Finding time to study

- Cast references: `zhongming.webp`, `jiale.webp`, `teacher.webp`.
- Scene prompt: Zhongming and Jiale stop beside their teacher in a school corridor to ask for help arranging study time before midterms. Jiale holds a closed workbook against his chest, looking hopeful, while Zhongming gestures toward a spacious classroom across the corridor from shelves visible through a library entrance. The teacher listens with a reassuring open hand. Strong corridor perspective, a broad doorway framing the teacher, and geometric afternoon sunlight. Burnt orange and golden yellow against royal-blue architecture. No detailed calendars or timetable text; make the social act of asking for help the single focal moment.
- Facial acting: Jiale is hopeful but worried about the clash; Zhongming is practical and assured; the teacher is reassuring.

### B1L09-R03 — Language exchange

- Cast references: `youmei.webp`, `yiwen.webp`.
- Scene prompt: Use Yiwen as the illustrative language-exchange partner. Youmei and Yiwen sit across the corner of a library table, taking turns speaking and writing in open notebooks. One points to a line while the other practices aloud with a small confident smile. Pages contain minimal abstract ink strokes, no readable Japanese or Chinese. A strong overhead three-quarter view connects their faces through a shared notebook. Cobalt evening outside the window, golden desk lamp and coral stationery against teal surroundings. The mood is warm mutual learning before an exam, with no score charts or flags.
- Facial acting: Youmei concentrates on explaining; Yiwen has a small moment of recognition and understanding.

## Lesson 10 — Health and care

### B1L10-R01 — Looking after a classmate

- Cast references: `yuanzhen.webp`, `teacher.webp`.
- Scene prompt: At the classroom doorway, Yuanzhen tells the teacher that Guoan is sick and cannot attend. Yuanzhen holds her phone down at her side after receiving his message; the teacher responds attentively and gestures toward a small hygiene station with a mask packet and handwashing area nearby. Keep these contextual props understated; Guoan is absent and must not appear. Use a medium view framed by the open door, with one empty chair visible beyond. Coral scarf and warm sunlight contrast with royal-blue clothing and teal classroom surfaces. Compassionate and everyday, without medical infographics.
- Facial acting: Yuanzhen is concerned about her absent friend; the teacher listens with calm seriousness.

### B1L10-R02 — A reassuring clinic visit

- Cast references: `guoan.webp`, `doctor.webp`.
- Scene prompt: Guoan sits in a simple clinic consultation, holding a tissue near his nose as the doctor calmly explains a small medicine packet and a glass of water on the desk. Make Guoan tired and uncomfortable but attentive; keep his green hoodie visible beneath the navy jacket. The doctor wears the saved white coat and green shirt. View slightly over the doctor's shoulder toward Guoan, with the desktop curving into frame. Cool cyan clinic surfaces and deep teal shadows contrast with warm faces and restrained coral accents. No pill dosages, instructions, readable charts or exaggerated illness effects.
- Facial acting: Guoan is tired and uncomfortable; the doctor is composed and attentive.

### B1L10-R03 — A visit with fruit

- Cast references: `guoan.webp`, `yuanzhen.webp`.
- Scene prompt: Yuanzhen visits recovering Guoan at home, setting a small basket of apples and a closed homework notebook beside his sofa. Guoan sits under a blanket, smiling gratefully, with water on a side table. She remains at a natural conversational distance; the scene centers on care and companionship. Use a cozy low three-quarter viewpoint, with a large coral apple in the near foreground drawing the eye toward their faces. Deep teal room, golden window light and cobalt scarf shadows. No crowded sickroom, medicine display or miraculous recovery symbolism.
- Facial acting: Guoan is weary but grateful; Yuanzhen is relieved to see him recovering.

## Lesson 11 — New friendships

### B1L11-R01 — A card from a new friend

- Cast references: `youmei.webp`, `yiwen.webp`.
- Scene prompt: In the dormitory, Youmei pauses writing a reply card to show Yiwen the card she received from an online friend. Yiwen leans beside the desk with affectionate curiosity. An open laptop sits quietly behind them showing only abstract page blocks; the handwritten card in their hands is the focal object, with unlettered ink marks. Tight three-quarter composition, desk edge sweeping toward their faces, warm coral lamp against saturated indigo evening. Keep the mood intrigued and thoughtful, not romantic fantasy; no hearts, floating message bubbles, or invented portrait of the online friend.
- Facial acting: Youmei is absorbed and slightly shy; Yiwen is intrigued by the unexpected card.

### B1L11-R02 — I'll come with you

- Cast references: `yiwen.webp`, `youmei.webp`.
- Scene prompt: In the classroom after a lesson, Yiwen reassures nervous Youmei about meeting her online friend by offering to accompany her. Yiwen sits turned toward Youmei, one supportive hand resting lightly on her forearm; Youmei's shoulders relax into a relieved smile. The closed card peeks from Youmei's notebook, linking back to the previous scene. Use a quiet medium close view with a strong diagonal of desk corners and a sunlit doorway behind. Saturated teal, coral and golden light. Express trust through posture; no thought bubbles, imagined stranger or meetup already taking place.
- Facial acting: Youmei is hesitant but visibly relaxing; Yiwen is confidently supportive.

### B1L11-R03 — Meeting in person

- Cast references: `youmei.webp`, `yiwen.webp`.
- Scene prompt: At a lively but uncluttered restaurant table, Youmei and Yiwen laugh with the online friend during their first meeting. Show the unnamed young adult male friend from behind in the near foreground, using a simple dark-haired silhouette and neutral blue shirt; do not reuse any named cast member's distinctive hair or clothing. His raised phone is taking a group photograph, with its screen turned away. Youmei and Yiwen remain fully visible beyond a few shared dishes. Curved table and overlapping plates create depth; coral food and golden lights contrast with indigo restaurant walls. No written menus or phone UI.
- Facial acting: Youmei is bashfully pleased; Yiwen is amused and at ease; the unnamed friend is seen from behind taking the photo. No broad open-mouth laughter.

## Lesson 12 — Work and ambitions

### B1L12-R01 — What will we become?

- Cast references: `zhongming.webp`, `guoan.webp`.
- Scene prompt: On a school terrace, Zhongming and Guoan discuss future jobs after class. Zhongming looks animated and aspirational, while Guoan responds with dry, easygoing amusement and a shrug, holding a drawing folder from his competition. Through a large window, a modest career display shows simple unlettered photographs of a clinic, microphone and bank building as background context, not floating dream icons. A strong low-angle view emphasizes the friends against bold campus architecture. Yellow and green clothing against cobalt and coral surfaces. Keep them in current student outfits; no dressing the cast as careers they do not yet have.
- Facial acting: Zhongming is eager and ambitious; Guoan responds with dry, easygoing amusement.

### B1L12-R02 — After-school bakery work

- Cast references: `guoan.webp`, `zhongming.webp`.
- Scene prompt: At a neighborhood bakery after school, Guoan brings a tray of fresh bread toward the counter while chatting with Zhongming, who has stopped by with his school bag. Add a plain work apron over Guoan's recognizable hoodie, leaving the green color visible. An open homework notebook is neatly put aside near his bag to hint that studying came first. View at tray height, with large golden bread forms leading to the two faces. Deep teal display shelves and coral counter edges create warm/cool contrast. No brands, price cards or invented boss character.
- Facial acting: Guoan is quietly proud of the bread; Zhongming is tempted and newly interested in the job.

### B1L12-R03 — Different kinds of work

- Cast references: `zhongming.webp`.
- Scene prompt: Zhongming watches a television discussion about work from his living-room sofa, leaning forward thoughtfully rather than scrolling his phone. On the television, a simplified interview set contains two anonymous adult silhouettes; behind them, one coherent studio backdrop juxtaposes an office window and workshop machinery as broad abstract shapes. Keep the television content secondary and free of lettering or overlays. Frame from behind one sofa arm so Zhongming's thoughtful profile is clear. Indigo evening room, coral sofa and golden television light. Communicate reflection about job comfort and difficult work without caricaturing workers or making a moralizing poster.
- Facial acting: Zhongming is reflective and mildly troubled by the television discussion, without smiling.

## Lesson 13 — Phones and museum plans

### B1L13-R01 — The museum link arrived

- Cast references: `zhongming.webp`.
- Scene prompt: Zhongming sits at his home desk during a phone call with offscreen Guoan, relieved that his phone connection is working again. He studies a phone page showing a simple museum-building image and a tiny unlabeled street map while listening through one earbud. A finger hovers above the map as he checks the meeting location. Use a close over-the-shoulder angle that shows his delighted profile and the basic screen shapes without UI text. Yellow overshirt against indigo desk and cyan window light, with a coral accent. Do not show the museum visit already happening or add floating digital symbols.
- Facial acting: Zhongming shows relief and focused interest after his connection starts working.

### B1L13-R02 — Just in time at the museum

- Cast references: `teacher.webp`, `guoan.webp`, `jiale.webp`, `zhongming.webp`.
- Scene prompt: Outside a museum entrance, the teacher, Guoan and Jiale wait at the head of a short suggested queue as Zhongming arrives with a quick apologetic wave. Jiale holds his phone down, eager to go inside; Guoan turns to spot Zhongming. The teacher welcomes him with a calm gesture. Use a low wide view with broad entrance steps and tall geometric columns, a warm open doorway anchoring the composition. Cobalt and teal museum facade against golden doors and coral paving. Keep four identifiable faces; only a couple of distant queue silhouettes, no signs or ticket text.
- Facial acting: Zhongming is apologetic on arrival; Jiale is impatiently curious; Guoan is relieved; the teacher remains composed.

### B1L13-R03 — Finding the exhibition

- Cast references: `youmei.webp`.
- Scene prompt: Youmei steps out of an MRT station and checks her phone to find a science exhibition, then confidently turns right along a broad urban sidewalk. The phone shows only a simple route line; keep her gaze lifting toward the destination rather than fixed downward. A science hall with a large abstract planet sculpture is visible beyond the first crossing. Use a sweeping street-corner curve and the station canopy to frame her movement. Saturated cyan sky, cobalt station structure and coral pedestrian paving. One coherent navigation moment, without arrows floating in the air or a montage of phone functions.
- Facial acting: Youmei looks assured and alert after finding her route.

## Lesson 14 — New Year's Eve

### B1L14-R01 — Plans for a special evening

- Cast references: `teacher.webp`, `jiale.webp`, `yiwen.webp`, `guoan.webp`.
- Scene prompt: After class on December 30, Jiale excitedly discusses his first New Year's Eve in Taiwan with the teacher, Yiwen and Guoan. Yiwen gestures invitingly toward her home in the direction of the city; the teacher holds an extra folded jacket as a reminder to dress warmly. Through the classroom window, Taipei 101 sits in the distant skyline in daylight. Frame the group around a corner desk with lively staggered poses. Golden afternoon light against indigo windows and teal furniture. This is the planning scene: no fireworks, feast or concert already occurring.
- Facial acting: Jiale is expectant, Yiwen is inviting, Guoan is interested, and the teacher is knowingly cautious about the cold.

### B1L14-R02 — Everyone brings something

- Cast references: `yiwen.webp`, `guoan.webp`, `youmei.webp`, `jiale.webp`, `teacher.webp`.
- Scene prompt: At Yiwen's home, guests arrive carrying the shared New Year's Eve dinner. Yiwen holds the door open; Guoan and Youmei set down containers of dumplings, baozi and beef soup, the teacher brings a carrier of pearl milk teas, and Jiale admires the green park beyond the window. Capture the welcoming moment around a single curved table rather than five separate actions. Wide three-quarter view; keep the faces distinct, hands simple and dishes large. Coral interior, teal park and golden evening lighting. Include a few bottles unobtrusively, no labels, banners or fireworks yet.
- Facial acting: Yiwen is welcoming; Guoan is proud to contribute; Youmei is bashfully pleased; Jiale is absorbed by the view; the teacher is appreciative.

### B1L14-R03 — Taipei lights up

- Cast references: `youmei.webp`, `yiwen.webp`, `jiale.webp`, `guoan.webp`, `teacher.webp`.
- Scene prompt: From behind and slightly beside the friends, look across a lively New Year's Eve concert gathering toward Taipei 101 and brilliant fireworks. Put the five familiar characters in the near foreground with enough turned profiles and outfit cues to recognize them; add simple winter layers over their signature clothes. Yiwen and Youmei lift their arms with the music, while the others share the excitement. Use a broad curved crowd line and recognizable stepped tower silhouette. Electric cyan and magenta bursts against deep indigo, with warm golden stage light. Abstract distant crowd only; no year numerals or event text.
- Facial acting: Youmei is awestruck by the fireworks; Yiwen is exuberant through gesture; Jiale is fascinated; Guoan is relaxed; the teacher is quietly delighted. No identical grins or universally closed eyes.

## Lesson 15 — Zodiac and lanterns

### B1L15-R01 — A cat instead of a rabbit

- Cast references: `jiale.webp`, `youmei.webp`, `yuanzhen.webp`.
- Scene prompt: At a classroom table, Jiale and Youmei look through a book of simple zodiac animal illustrations as Yuanzhen points with a delighted smile to a small cat picture beside a rabbit picture. Present the cat and rabbit as plain illustrated cards on the table, without flags, labels or a full zodiac diagram. A friendly dragon illustration is visible on the open book page as a secondary hook. High three-quarter camera, curved arrangement of hands around the book, coral animal accents against cobalt tabletop and golden light. Express discovery about different zodiac traditions through faces and tangible objects.
- Facial acting: Yuanzhen is confidently amused about the cat zodiac; Youmei is surprised; Jiale is fascinated and analytical.

### B1L15-R02 — The little tiger lantern

- Cast references: `zhongming.webp`, `yiwen.webp`.
- Scene prompt: Zhongming holds up a handmade lantern decorated as a cute tiger while Yiwen leans closer in delight as they plan a Lantern Festival outing. Set the scene on a neighborhood walkway near dusk, with a few distant lanterns suggesting the coming festival rather than showing the full event. The tiger lantern is the clear hero: warm golden body, simple dark stripes, small rounded ears, securely attached handle. Use a close low view that frames both faces around it. Cobalt twilight and teal foliage against coral and amber. No zodiac labels or printed lantern text.
- Facial acting: Zhongming admires the lantern with quiet pride; Yiwen leans in with curious delight.

### B1L15-R03 — The zodiac river race

- Cast references: none; approved classroom image remains the rendering/style reference only.
- Scene prompt: Illustrate the legendary zodiac river race as one continuous panoramic scene with exactly twelve distinct animals. At the finish bank, rat first and ox second lead toward dry land; tiger, rabbit, dragon, snake, horse, goat, monkey, rooster and dog form a staggered procession across the river; pig is last, still approaching from far behind. Friendly rounded animals, all safely visible and identifiable, not human cast in costume. A sweeping S-shaped cyan river and coral banks organize the action. Give each animal a separate silhouette and simplified readable traits. Dynamic splashes as a few clean flat shapes; no finish numbers, text, panels or extra animals.
- Facial acting: Twelve distinct friendly animals with distinct attitudes: rat triumphant, ox patient, tiger determined, rabbit alert, dragon serene, snake sly, horse spirited, goat cautious, monkey playful, rooster proud, dog eager, pig unhurried. Exactly 12, no duplicates.

## Lesson 16 — Traveling in Taiwan

### B1L16-R01 — Choosing a holiday route

- Cast references: `jiale.webp`, `guoan.webp`.
- Scene prompt: At a campus picnic table, Jiale and Guoan enthusiastically consider a short Taiwan holiday using an unfolded map and a few unlettered travel photographs. One large photograph shows a deep marble gorge with a turquoise river; two smaller ones show Sun Moon Lake and a snowy mountain. Make these physical photographs, not giant imagined landscapes floating around the friends. High three-quarter view with the map cutting diagonally through the frame, faces above it and a bag anchoring the foreground. Coral table, cobalt map and golden afternoon light. They are planning, not already traveling or visiting all three places at once.
- Facial acting: Jiale is eager about seeing snow; Guoan is undecided and weighing the travel options.

### B1L16-R02 — Look at the snow!

- Cast references: `jiale.webp`, `guoan.webp`.
- Scene prompt: Back at school after their holidays, Jiale shows Guoan a large photograph of himself bundled against wind on a snowy mountain. Guoan leans in with delighted curiosity, holding a separate unlettered coastal photograph from Sizihwan. Keep the real foreground Jiale in his normal orange sweater, and the tiny photographed version in winter layers. A low table-level camera makes the snowy photograph the focal object while both faces remain prominent. Deep teal common-room setting, coral seating and crisp cyan-white photo shapes. One shared storytelling moment; no multi-panel travel collage, hotel bathroom scene or implication Guoan visited Taroko.
- Facial acting: Jiale is animated recalling the trip; Guoan is impressed by the snow photo. Tiny photographed Jiale looks exhilarated by the cold.

### B1L16-R03 — A Taiwan night-market evening

- Cast references: `youmei.webp`, `zhongming.webp`, `yiwen.webp`.
- Scene prompt: The three friends wander into a vibrant Taiwanese night market. Youmei carries pearl milk tea, Zhongming admires a steaming bowl of beef noodles at a stall, and Yiwen points toward a bamboo steamer of xiaolongbao. A broad curved market lane leads past simple game stalls and warm lanterns, with the city and a distant mountain silhouette beyond. Keep three friends as the focal group, with only a few abstract visitors and understated vendor silhouettes. Low wide view, bold coral and golden food stalls against cobalt night and teal distant landscape. No readable signs, decorative fake Chinese or travel-poster typography.
- Facial acting: Youmei is absorbed in tasting her drink; Zhongming anticipates the noodles; Yiwen is curious about the steaming dumplings.

## Acceptance before keeping an image

- The action, cast and key objects match its source reading and scene block. Planning scenes remain planning scenes; future events are not portrayed as already completed.
- Matches the approved illustration's flat geometric rendering, saturation, warm/cool contrast and character proportions. Reject anime drift, heavy shading, decorative texture and 3D rendering.
- Each named face, hairstyle and outfit remains recognizable. No duplicate/missing cast, swapped identities or accidental child proportions. Approved portraits take priority over older full-body sheets.
- One clear story moment, one coherent setting, clean composition. Distinct camera/action from neighboring slots; avoid repeating three figures standing at a table across every lesson.
- Key object and expressions remain legible at roughly 390 px image width; image is naturally 16:9 and will not require cropping. Faces, important gestures and props are not cut off.
- No readable or garbled text, captions, speech bubbles, watermarks, unwanted flags, floating UI/icons, duplicated limbs, broken hands or impossible props. L15-R03 additionally needs a deliberate count and identity check for all twelve animals.
- Save the exact full submitted prompt and actual image path. If an image fails, retry with one focused correction and the same identity/style references; do not loosen the master style to hide a failure.

## Application integration

All 48 reading IDs from `B1L01-R01` through `B1L16-R03` map to versioned WebP assets in `src/assets/images/readings/` through `src/data/readingIllustrations.ts`. The reader uses the selected reading part's own illustration. Keep generation PNGs and exact submitted prompts in the ignored `output/imagegen/book-1/` folder; the application imports only versioned assets under `src/`.
