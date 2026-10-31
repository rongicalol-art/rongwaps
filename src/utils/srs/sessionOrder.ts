/**
 * Random order that never repeats the original one, as judged by `same`
 * (identity by default). Pass a "looks the same" test when items can repeat
 * visibly, e.g. two 又 tiles: swapping them alone would show the answer order.
 */
export function shuffleItems<T>(items: T[], same: (a: T, b: T) => boolean = Object.is): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  // Rotating by one changes the order unless every item looks the same.
  if (shuffled.length > 1 && shuffled.every((item, index) => same(item, items[index]))) {
    return [...shuffled.slice(1), shuffled[0]];
  }
  return shuffled;
}
