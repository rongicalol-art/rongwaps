import type { ReadingIllustration } from '../types/models';

/**
 * Hero illustrations shown at the top of a reading narrative.
 *
 * Keyed by reading id so a reading can own a scene image without touching
 * the shared `ReadingRecord` type or its data file. Follows the same
 * import.meta.url bundle pattern as `lessonLandscapeArt` and the character
 * portraits. Keep artworks on the original RongWaps cast style, never UI
 * controls-as-images.
 */
const READING_ILLUSTRATIONS: Record<string, ReadingIllustration> = {
  'B1L01-R01': {
    url: new URL('../assets/images/readings/b1l01-r01-new-classmate-v8.webp', import.meta.url).href,
    alt: 'Youmei meets new classmates as Yiwen introduces her and Zhongming turns from his desk.',
  },
  'B1L01-R02': {
    url: new URL('../assets/images/readings/b1l01-r02-names-and-countries-v6.webp', import.meta.url).href,
    alt: 'Zhongming introduces himself to Youmei beside a broad classroom window.',
  },
  'B1L02-R01': {
    url: new URL('../assets/images/readings/b1l02-r01-monday-plans-v5.webp', import.meta.url).href,
    alt: 'Zhongming heads out for school as his mother looks on from the breakfast table.',
  },
  'B1L02-R02': {
    url: new URL('../assets/images/readings/b1l02-r02-birthday-invitation-v6.webp', import.meta.url).href,
    alt: 'Yiwen invites Zhongming and Youmei to her birthday gathering on the school steps.',
  },
  'B1L03-R01': {
    url: new URL('../assets/images/readings/b1l03-r01-choosing-birthday-gifts-v6.webp', import.meta.url).href,
    alt: 'Yiwen and Zhongming plan a birthday gift for Youmei using two study books.',
  },
  'B1L03-R02': {
    url: new URL('../assets/images/readings/b1l03-r02-picking-two-pencils-v6.webp', import.meta.url).href,
    alt: 'Yiwen chooses two white pencils while Zhongming compares a red pencil at the counter.',
  },
  'B1L04-R01': {
    url: new URL('../assets/images/readings/b1l04-r01-choosing-a-quieter-restaurant-v6.webp', import.meta.url).href,
    alt: 'Youmei and Zhongming choose a noodle shop on a bright Taiwanese street.',
  },
  'B1L04-R02': {
    url: new URL('../assets/images/readings/b1l04-r02-ordering-at-the-counter-v7.webp', import.meta.url).href,
    alt: 'A worker serves Zhongming and Youmei two bowls of beef noodles and tea.',
  },
  'B1L05-R01': {
    url: new URL('../assets/images/readings/b1l05-r01-planning-afternoon-tea-v6.webp', import.meta.url).href,
    alt: 'Zhongming shows Youmei an ice cream photo as she considers his afternoon-tea invitation.',
  },
  'B1L05-R02': {
    url: new URL('../assets/images/readings/b1l05-r02-wallet-under-the-book-v5.webp', import.meta.url).href,
    alt: 'Zhongming finds his wallet under a book while his mother watches from the doorway.',
  },
  'B1L06-R01': {
    url: new URL('../assets/images/readings/b1l06-r01-sport-everyone-v5.webp', import.meta.url).href,
    alt: 'Yiwen offers a tennis racket to Youmei while Guoan turns toward the seaside court.',
  },
  'B1L06-R02': {
    url: new URL('../assets/images/readings/b1l06-r02-picking-a-day-to-cycle-v4.webp', import.meta.url).href,
    alt: 'Guoan holds a bicycle as he invites Zhongming on a ride outside campus.',
  },
  'B1L07-R01': {
    url: new URL('../assets/images/readings/b1l07-r01-planning-hotel-route-v4.webp', import.meta.url).href,
    alt: 'Youmei and Yuanzhen check a phone map before turning toward an open classroom.',
  },
  'B1L07-R02': {
    url: new URL('../assets/images/readings/b1l07-r02-hotel-on-map-v4.webp', import.meta.url).href,
    alt: 'Youmei traces a route on a map as an elevated train passes outside the window.',
  },
  'B1L08-R01': {
    url: new URL('../assets/images/readings/b1l08-r01-talking-about-clothes-v5.webp', import.meta.url).href,
    alt: 'Yiwen admires Yuanzhen’s skirt on a campus walkway.',
  },
  'B1L08-R02': {
    url: new URL('../assets/images/readings/b1l08-r02-trying-pants-before-closing-v5.webp', import.meta.url).href,
    alt: 'Yiwen and Yuanzhen hurry toward an open elevator in a department store.',
  },
  'B1L01-R03': {
    url: new URL('../assets/images/readings/b1l01-r03-welcome-bubble-tea-v6.webp', import.meta.url).href,
    alt: 'Youmei enjoys bubble tea and a bowl of fresh tropical fruit at an open-air cafe.',
  },
  'B1L02-R03': {
    url: new URL('../assets/images/readings/b1l02-r03-clockwork-routine-v5.webp', import.meta.url).href,
    alt: 'Youmei opens a book at a library desk beside her backpack and lunch container.',
  },
  'B1L03-R03': {
    url: new URL('../assets/images/readings/b1l03-r03-birthday-celebration-v7.webp', import.meta.url).href,
    alt: 'Youmei celebrates at a cake table as friends bring books, flowers, and two white pencils.',
  },
  'B1L04-R03': {
    url: new URL('../assets/images/readings/b1l04-r03-buying-drinks-v8.webp', import.meta.url).href,
    alt: 'Youmei and Yiwen receive cold drinks at a street stall on a hot day.',
  },
  'B1L05-R03': {
    url: new URL('../assets/images/readings/b1l05-r03-my-room-cat-v4.webp', import.meta.url).href,
    alt: 'Youmei reads on a sofa while a cat stretches in a sunbeam nearby.',
  },
  'B1L06-R03': {
    url: new URL('../assets/images/readings/b1l06-r03-weekend-sports-v4.webp', import.meta.url).href,
    alt: 'Four friends walk through a recreation park carrying gear for different sports.',
  },
  'B1L07-R03': {
    url: new URL('../assets/images/readings/b1l07-r03-mrt-traveler-v4.webp', import.meta.url).href,
    alt: 'Youmei rides an MRT beside a window overlooking the city and distant airport.',
  },
  'B1L08-R03': {
    url: new URL('../assets/images/readings/b1l08-r03-fashion-showcase-v4.webp', import.meta.url).href,
    alt: 'Yiwen browses a mannequin display while Jiale reads a car magazine nearby.',
  },
  'B1L09-R01': {
    url: new URL('../assets/images/readings/b1l09-r01-tricky-sentences-v2.webp', import.meta.url).href,
    alt: 'Guoan points to a difficult passage in an open workbook as Youmei studies beside him.',
  },
  'B1L09-R02': {
    url: new URL('../assets/images/readings/b1l09-r02-finding-time-to-study-v2.webp', import.meta.url).href,
    alt: 'Jiale holds a workbook while Zhongming gestures toward a classroom and their teacher listens.',
  },
  'B1L09-R03': {
    url: new URL('../assets/images/readings/b1l09-r03-language-exchange-v2.webp', import.meta.url).href,
    alt: 'Youmei points to a line in her notebook as Yiwen listens and writes at a lamp-lit library table.',
  },
  'B1L10-R01': {
    url: new URL('../assets/images/readings/b1l10-r01-looking-after-classmate-v2.webp', import.meta.url).href,
    alt: 'Yuanzhen tells the teacher that Guoan is sick while the teacher gestures toward a classroom hygiene station.',
  },
  'B1L10-R02': {
    url: new URL('../assets/images/readings/b1l10-r02-reassuring-clinic-visit-v2.webp', import.meta.url).href,
    alt: 'At a clinic desk, Guoan holds a tissue while the doctor explains a small packet beside a glass of water.',
  },
  'B1L10-R03': {
    url: new URL('../assets/images/readings/b1l10-r03-sick-visit-v2.webp', import.meta.url).href,
    alt: 'Yuanzhen brings Guoan a basket of apples while he rests under a blanket at home, with a notebook nearby.',
  },
  'B1L11-R01': {
    url: new URL('../assets/images/readings/b1l11-r01-new-friend-card-v2.webp', import.meta.url).href,
    alt: 'At a dorm desk, Youmei shows Yiwen an unlettered card while an open laptop sits behind them.',
  },
  'B1L11-R02': {
    url: new URL('../assets/images/readings/b1l11-r02-come-with-you-v3.webp', import.meta.url).href,
    alt: 'Yiwen rests a hand gently on Youmei’s forearm as Youmei relaxes over a desk; a card peeks from her notebook.',
  },
  'B1L11-R03': {
    url: new URL('../assets/images/readings/b1l11-r03-meeting-in-person-v2.webp', import.meta.url).href,
    alt: 'Youmei and Yiwen meet an online friend at a restaurant as he takes their group photo.',
  },
  'B1L12-R01': {
    url: new URL('../assets/images/readings/b1l12-r01-what-will-we-become-v2.webp', import.meta.url).href,
    alt: 'Zhongming and Guoan discuss future jobs on a school terrace, with a small career display beyond them.',
  },
  'B1L12-R02': {
    url: new URL('../assets/images/readings/b1l12-r02-after-school-bakery-work-v2.webp', import.meta.url).href,
    alt: 'Guoan carries fresh bread toward a bakery counter while Zhongming stops by with his school bag.',
  },
  'B1L12-R03': {
    url: new URL('../assets/images/readings/b1l12-r03-different-kinds-of-work-v2.webp', import.meta.url).href,
    alt: 'Zhongming watches a television discussion about different kinds of work from his sofa.',
  },
  'B1L13-R01': {
    url: new URL('../assets/images/readings/b1l13-r01-the-museum-link-arrived-v2.webp', import.meta.url).href,
    alt: 'Zhongming checks a museum link and meeting map on his phone after his connection starts working.',
  },
  'B1L13-R02': {
    url: new URL('../assets/images/readings/b1l13-r02-just-in-time-at-the-museum-v2.webp', import.meta.url).href,
    alt: 'Zhongming arrives at the museum to meet the teacher, Guoan and Jiale, who wait near the entrance.',
  },
  'B1L13-R03': {
    url: new URL('../assets/images/readings/b1l13-r03-finding-the-exhibition-v3.webp', import.meta.url).href,
    alt: 'Youmei checks her phone route, then turns right toward a science hall beyond the MRT station.',
  },
  'B1L14-R01': {
    url: new URL('../assets/images/readings/b1l14-r01-plans-for-a-special-evening-v2.webp', import.meta.url).href,
    alt: 'Jiale, Yiwen and Guoan ask the teacher about New Year’s Eve plans after class.',
  },
  'B1L14-R02': {
    url: new URL('../assets/images/readings/b1l14-r02-new-years-eve-dinner-v2.webp', import.meta.url).href,
    alt: 'At Yiwen’s New Year’s Eve gathering, she welcomes friends bringing dinner as Jiale looks toward a green park.',
  },
  'B1L14-R03': {
    url: new URL('../assets/images/readings/b1l14-r03-taipei-101-new-year-v2.webp', import.meta.url).href,
    alt: 'Five friends watch New Year\'s Eve fireworks over Taipei 101, with Yiwen raising a hand and Youmei looking up in awe.',
  },
  'B1L15-R01': {
    url: new URL('../assets/images/readings/b1l15-r01-cat-instead-of-rabbit-v2.webp', import.meta.url).href,
    alt: 'Jiale and Youmei look at pictures of a cat and rabbit while Yuanzhen points them out; a dragon appears in the open book.',
  },
  'B1L15-R02': {
    url: new URL('../assets/images/readings/b1l15-r02-tiger-lantern-v2.webp', import.meta.url).href,
    alt: 'Zhongming holds a glowing tiger lantern on a dusk walkway as Yiwen leans in to admire it.',
  },
  'B1L15-R03': {
    url: new URL('../assets/images/readings/b1l15-r03-zodiac-river-race-v2.webp', import.meta.url).href,
    alt: 'Twelve zodiac animals race along a winding river: rat and ox lead, with pig trailing far behind.',
  },
  'B1L16-R01': {
    url: new URL('../assets/images/readings/b1l16-r01-taiwan-holiday-route-v2.webp', import.meta.url).href,
    alt: 'Jiale holds up a snowy mountain photo as he and Guoan compare three Taiwan destinations on an unfolded map.',
  },
  'B1L16-R02': {
    url: new URL('../assets/images/readings/b1l16-r02-look-at-snow-v3.webp', import.meta.url).href,
    alt: 'Jiale shows Guoan a snowy mountain photo of himself while Guoan holds a coastal photo.',
  },
  'B1L16-R03': {
    url: new URL('../assets/images/readings/b1l16-r03-night-market-evening-v2.webp', import.meta.url).href,
    alt: 'Youmei sips pearl milk tea, Zhongming looks at beef noodles, and Yiwen points to xiaolongbao at a Taiwan night market.',
  },
  'B3L01-R01': {
    url: new URL('../assets/images/readings/b3l01-r01-scene.webp', import.meta.url).href,
    alt: "Tomoko offers Dongxian an autograph notebook at a caf\u00e9.",
  },
  'B3L01-R02': {
    url: new URL('../assets/images/readings/b3l01-r02-scene.webp', import.meta.url).href,
    alt: "Dongxian practices directing behind a movie camera.",
  },
  'B3L02-R01': {
    url: new URL('../assets/images/readings/b3l02-r01-scene.webp', import.meta.url).href,
    alt: "Tomoko asks Shawn about his laundry bag outside a convenience store.",
  },
  'B3L02-R02': {
    url: new URL('../assets/images/readings/b3l02-r02-scene.webp', import.meta.url).href,
    alt: "A convenience-store worker hands a customer a takeaway coffee.",
  },
  'B3L03-R01': {
    url: new URL('../assets/images/readings/b3l03-r01-scene.webp', import.meta.url).href,
    alt: "Fangcao holds up a dress while Mary considers its fit.",
  },
  'B3L03-R02': {
    url: new URL('../assets/images/readings/b3l03-r02-scene.webp', import.meta.url).href,
    alt: "A shopper examines the quality of a fabric bag at a market stall.",
  },
  'B3L04-R01': {
    url: new URL('../assets/images/readings/b3l04-r01-scene.webp', import.meta.url).href,
    alt: "Mary brings Fangcao a wrapped bottle as a gift at her doorway.",
  },
  'B3L04-R02': {
    url: new URL('../assets/images/readings/b3l04-r02-scene.webp', import.meta.url).href,
    alt: "Jialin writes a letter beside her sleeping baby and a bowl of soup.",
  },
  'B3L05-R01': {
    url: new URL('../assets/images/readings/b3l05-r01-scene.webp', import.meta.url).href,
    alt: "Fangcao and Jiahao discuss storm damage beside a fallen tree.",
  },
  'B3L05-R02': {
    url: new URL('../assets/images/readings/b3l05-r02-scene.webp', import.meta.url).href,
    alt: "Two volunteers pass a carton of supplies during earthquake relief.",
  },
  'B3L06-R01': {
    url: new URL('../assets/images/readings/b3l06-r01-scene.webp', import.meta.url).href,
    alt: "Shawn invites Mingzhe to play volleyball outside campus.",
  },
  'B3L06-R02': {
    url: new URL('../assets/images/readings/b3l06-r02-scene.webp', import.meta.url).href,
    alt: "Zhang Wenhua waters flowers with his daughter in the garden.",
  },
  'B3L07-R01': {
    url: new URL('../assets/images/readings/b3l07-r01-scene.webp', import.meta.url).href,
    alt: "Mingzhe and Dongxian discuss a cycling route on a tablet.",
  },
  'B3L07-R02': {
    url: new URL('../assets/images/readings/b3l07-r02-scene.webp', import.meta.url).href,
    alt: "Martin cycles along a sunny coastal road in eastern Taiwan.",
  },
  'B3L08-R01': {
    url: new URL('../assets/images/readings/b3l08-r01-scene.webp', import.meta.url).href,
    alt: "Tomoko and Dongxian discuss personal style on a campus bench.",
  },
  'B3L08-R02': {
    url: new URL('../assets/images/readings/b3l08-r02-scene.webp', import.meta.url).href,
    alt: "Dongxian sorts clothing while considering what to keep.",
  },
  'B3L09-R01': {
    url: new URL('../assets/images/readings/b3l09-r01-scene.webp', import.meta.url).href,
    alt: "Shawn listens as Jiahao discusses his younger brother and tennis.",
  },
  'B3L09-R02': {
    url: new URL('../assets/images/readings/b3l09-r02-scene.webp', import.meta.url).href,
    alt: "Two students build and test a wooden bridge model together.",
  },
  'B3L10-R01': {
    url: new URL('../assets/images/readings/b3l10-r01-scene.webp', import.meta.url).href,
    alt: "Fangcao and Jiahao look through a health-check brochure.",
  },
  'B3L10-R02': {
    url: new URL('../assets/images/readings/b3l10-r02-scene.webp', import.meta.url).href,
    alt: "Uncle Lin walks with a family member as he improves his health.",
  },
  'B3L11-R01': {
    url: new URL('../assets/images/readings/b3l11-r01-scene.webp', import.meta.url).href,
    alt: "Tomoko and Shawn discuss a suspicious online message.",
  },
  'B3L11-R02': {
    url: new URL('../assets/images/readings/b3l11-r02-scene.webp', import.meta.url).href,
    alt: "Two friends put their phones aside to talk in person.",
  },
  'B3L12-R01': {
    url: new URL('../assets/images/readings/b3l12-r01-scene.webp', import.meta.url).href,
    alt: "Jiahao offers his work-experience documents during an interview.",
  },
  'B3L12-R02': {
    url: new URL('../assets/images/readings/b3l12-r02-scene.webp', import.meta.url).href,
    alt: "An applicant checks his clothes and documents before an interview.",
  },
  'B3L13-R01': {
    url: new URL('../assets/images/readings/b3l13-r01-scene.webp', import.meta.url).href,
    alt: "Mingzhe shows Tomoko a tablet with its screen facing them in a library.",
  },
  'B3L13-R02': {
    url: new URL('../assets/images/readings/b3l13-r02-scene.webp', import.meta.url).href,
    alt: "A woman joins a video meeting from home during rainy weather.",
  },
  'B3L14-R01': {
    url: new URL('../assets/images/readings/b3l14-r01-scene.webp', import.meta.url).href,
    alt: "Jiahao shows Shawn a handmade cloth wallet from his girlfriend.",
  },
  'B3L14-R02': {
    url: new URL('../assets/images/readings/b3l14-r02-scene.webp', import.meta.url).href,
    alt: "A couple exchange a small handmade gift beside the river.",
  },
  'B3L15-R01': {
    url: new URL('../assets/images/readings/b3l15-r01-scene.webp', import.meta.url).href,
    alt: "Mingzhe and Shawn plan a visit to historic sites using a notebook.",
  },
  'B3L15-R02': {
    url: new URL('../assets/images/readings/b3l15-r02-scene.webp', import.meta.url).href,
    alt: "Two conservation workers care for a carved relief on a historic wall.",
  },
  'B3L16-R01': {
    url: new URL('../assets/images/readings/b3l16-r01-scene.webp', import.meta.url).href,
    alt: "Mary and Dongxian choose corn and noodles at a supermarket.",
  },
  'B3L16-R02': {
    url: new URL('../assets/images/readings/b3l16-r02-scene.webp', import.meta.url).href,
    alt: "Chef Xie places a fresh meal in a community refrigerator.",
  },
};

/** Returns the hero illustration for a reading, or null when none is authored. */
export function getReadingIllustration(readingId: string): ReadingIllustration | null {
  return READING_ILLUSTRATIONS[readingId] ?? null;
}
