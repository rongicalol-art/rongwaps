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
