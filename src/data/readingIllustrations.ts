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
    url: new URL('../assets/images/readings/b1l01-r01-new-classmate.webp', import.meta.url).href,
    alt: 'Yiwen welcomes Youmei at a shared classroom desk beside an open notebook and sunlit window.',
  },
  'B1L01-R02': {
    url: new URL('../assets/images/readings/b1l01-r02-names-and-countries.webp', import.meta.url).href,
    alt: 'Zhongming waves to Youmei beside a globe showing East and Southeast Asia in a bright classroom.',
  },
  'B1L02-R01': {
    url: new URL('../assets/images/readings/b1l02-r01-monday-plans.webp', import.meta.url).href,
    alt: 'Zhongming packs his school bag at home as his mother waves from the open doorway.',
  },
  'B1L02-R02': {
    url: new URL('../assets/images/readings/b1l02-r02-birthday-invitation.webp', import.meta.url).href,
    alt: 'Yiwen offers Youmei a small birthday gift and invitation card across a courtyard bench.',
  },
  'B1L03-R01': {
    url: new URL('../assets/images/readings/b1l03-r01-choosing-birthday-gifts.webp', import.meta.url).href,
    alt: 'Yiwen and Zhongming consider books, flowers, and a cake as birthday gifts at a school table.',
  },
  'B1L03-R02': {
    url: new URL('../assets/images/readings/b1l03-r02-picking-two-pencils.webp', import.meta.url).href,
    alt: 'Yiwen and Zhongming compare a red pencil and a white pencil at a stationery counter.',
  },
  'B1L04-R01': {
    url: new URL('../assets/images/readings/b1l04-r01-choosing-a-quieter-restaurant.webp', import.meta.url).href,
    alt: 'Youmei and Zhongming choose a calm noodle shop beside a busy restaurant on a sunny street.',
  },
  'B1L04-R02': {
    url: new URL('../assets/images/readings/b1l04-r02-ordering-at-the-counter.webp', import.meta.url).href,
    alt: 'Zhongming orders beef noodles and tea from a cafe worker across a restaurant counter.',
  },
  'B1L05-R01': {
    url: new URL('../assets/images/readings/b1l05-r01-planning-afternoon-tea.webp', import.meta.url).href,
    alt: 'Zhongming invites Youmei to afternoon tea beside cups, ice cream, a book, and a music player.',
  },
  'B1L05-R02': {
    url: new URL('../assets/images/readings/b1l05-r02-wallet-under-the-book.webp', import.meta.url).href,
    alt: 'Zhongming lifts a book to find his wallet while his mother points toward it.',
  },
  'B1L06-R01': {
    url: new URL('../assets/images/readings/b1l06-r01-sport-everyone.webp', import.meta.url).href,
    alt: 'Guoan and Youmei settle on tennis together beside a seaside promenade.',
  },
  'B1L06-R02': {
    url: new URL('../assets/images/readings/b1l06-r02-picking-a-day-to-cycle.webp', import.meta.url).href,
    alt: 'Guoan invites Zhongming on a bicycle ride while Zhongming relaxes at home with headphones.',
  },
  'B1L07-R01': {
    url: new URL('../assets/images/readings/b1l07-r01-planning-hotel-route.webp', import.meta.url).href,
    alt: 'Youmei and Yuanzhen plan a route together using an unfolded map near a classroom doorway.',
  },
  'B1L07-R02': {
    url: new URL('../assets/images/readings/b1l07-r02-hotel-on-map.webp', import.meta.url).href,
    alt: 'Youmei and Yuanzhen trace a route across a city map as an elevated train passes outside.',
  },
  'B1L08-R01': {
    url: new URL('../assets/images/readings/b1l08-r01-talking-about-clothes.webp', import.meta.url).href,
    alt: 'Yiwen gestures toward Yuanzhen’s outfit among colorful clothing displays in a department store.',
  },
  'B1L08-R02': {
    url: new URL('../assets/images/readings/b1l08-r02-trying-pants-before-closing.webp', import.meta.url).href,
    alt: 'Yiwen and Yuanzhen head toward an open elevator with trousers as the store nears closing time.',
  },
  'B1L01-R03': {
    url: new URL('../assets/images/readings/b1l01-r03-welcome-bubble-tea.webp', import.meta.url).href,
    alt: 'Youmei holding an iced bubble tea cup beside a fresh bowl of sliced fruits.',
  },
  'B1L02-R03': {
    url: new URL('../assets/images/readings/b1l02-r03-clockwork-routine.webp', import.meta.url).href,
    alt: 'Youmei studying attentively at her desk flanked by an alarm clock, books, and an arched window.',
  },
  'B1L03-R03': {
    url: new URL('../assets/images/readings/b1l03-r03-birthday-celebration.webp', import.meta.url).href,
    alt: 'Zhongming presenting gifts to Youmei across a table crowned with a glowing birthday cake.',
  },
  'B1L04-R03': {
    url: new URL('../assets/images/readings/b1l04-r03-buying-drinks.webp', import.meta.url).href,
    alt: 'A customer receiving a cold iced beverage across the counter of a colorful summer drink kiosk.',
  },
  'B1L05-R03': {
    url: new URL('../assets/images/readings/b1l05-r03-my-room-cat.webp', import.meta.url).href,
    alt: 'A student reclined on a sofa reading a book while a cat sleeps peacefully in a sunbeam.',
  },
  'B1L06-R03': {
    url: new URL('../assets/images/readings/b1l06-r03-weekend-sports.webp', import.meta.url).href,
    alt: 'Yiwen playing tennis and Guo’an practicing basketball on adjacent outdoor sports courts.',
  },
  'B1L07-R03': {
    url: new URL('../assets/images/readings/b1l07-r03-mrt-traveler.webp', import.meta.url).href,
    alt: 'A traveler on an elevated metro platform overlooking the train tracks and an ascending airplane.',
  },
  'B1L08-R03': {
    url: new URL('../assets/images/readings/b1l08-r03-fashion-showcase.webp', import.meta.url).href,
    alt: 'Yuanzhen admiring a sleek fashion display window in a department store beside an automotive bookstand.',
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
