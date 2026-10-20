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
    url: new URL('../assets/images/readings/b1l05-r01-planning-afternoon-tea-v5.webp', import.meta.url).href,
    alt: 'Zhongming shows Youmei an ice cream photo and invites her for afternoon tea.',
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
  'B1L09-R03': {
    url: new URL('../assets/images/readings/b1l09-r03-language-exchange.webp', import.meta.url).href,
    alt: 'Youmei and Yuanzhen collaborating on language exchange over open notebooks beneath a desk lamp.',
  },
  'B1L10-R03': {
    url: new URL('../assets/images/readings/b1l10-r03-sick-visit.webp', import.meta.url).href,
    alt: 'A student brings a bowl of fruit and notebooks to a classmate resting sick in bed.',
  },
  'B1L11-R03': {
    url: new URL('../assets/images/readings/b1l11-r03-restaurant-selfie.webp', import.meta.url).href,
    alt: 'Two friends taking a selfie together at a restaurant table filled with delicious dishes.',
  },
  'B1L12-R03': {
    url: new URL('../assets/images/readings/b1l12-r03-work-perspectives.webp', import.meta.url).href,
    alt: 'An analyst working in a modern office with coffee overlooking an industrial shipyard and cranes.',
  },
  'B1L13-R03': {
    url: new URL('../assets/images/readings/b1l13-r03-smartphone-navigation.webp', import.meta.url).href,
    alt: 'A pedestrian using a glowing smartphone navigation map at a bustling city intersection.',
  },
  'B1L14-R03': {
    url: new URL('../assets/images/readings/b1l14-r03-taipei-101-new-year.webp', import.meta.url).href,
    alt: 'Friends waving glowing light sticks in a crowd celebrating New Year’s Eve before Taipei 101 fireworks.',
  },
  'B1L15-R03': {
    url: new URL('../assets/images/readings/b1l15-r03-zodiac-river-race.webp', import.meta.url).href,
    alt: 'A swimming ox carrying a triumphant rat across a wide river toward the shore under a full moon.',
  },
  'B1L16-R03': {
    url: new URL('../assets/images/readings/b1l16-r03-taiwan-market-panorama.webp', import.meta.url).href,
    alt: 'A night market vendor serving soup dumplings and bubble tea against a scenic island landscape.',
  },
};

/** Returns the hero illustration for a reading, or null when none is authored. */
export function getReadingIllustration(readingId: string): ReadingIllustration | null {
  return READING_ILLUSTRATIONS[readingId] ?? null;
}
