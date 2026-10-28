/** Card size range for Fit: it can grow past the slider's top when only a few players are in the room. */
export const FIT_SIZE = { min: 0.6, max: 3 };

export interface FitInput {
  /** Cards on the board. */
  count: number;
  /** Room the cards may use, in px. */
  width: number;
  height: number;
  /** Tallest card's height in px at size 1 (1rem). */
  cardHeight: number;
  /** Narrowest a card may be, in em (the grid's column minimum). */
  minCardWidth: number;
  /** Gap between cards, in em. */
  gap: number;
  /** One column of rows instead of a grid. */
  list?: boolean;
  /** Pixels in 1rem. */
  remPx?: number;
  min?: number;
  max?: number;
}

/** Height every card takes at size `scale`, laid out the way the board's auto-fill grid lays them out. */
export function boardHeightAt(scale: number, { count, width, cardHeight, minCardWidth, gap, list = false, remPx = 16 }: FitInput) {
  const gapPx = gap * remPx * scale;
  const columns = list ? 1 : Math.max(1, Math.floor((width + gapPx) / (minCardWidth * remPx * scale + gapPx)));
  const rows = Math.ceil(count / columns);
  return rows * cardHeight * scale + Math.max(0, rows - 1) * gapPx;
}

/** The largest card size, to the hundredth, at which every card fits in the given room without scrolling. */
export function fitCardScale(input: FitInput) {
  const { min = FIT_SIZE.min, max = FIT_SIZE.max, count, width, height, cardHeight } = input;
  if (count <= 0 || width <= 0 || height <= 0 || cardHeight <= 0) return max;
  if (boardHeightAt(min, input) > height) return min;
  if (boardHeightAt(max, input) <= height) return max;
  // More size never means fewer rows or shorter cards, so the height only grows with it.
  let low = min;
  let high = max;
  for (let step = 0; step < 24; step += 1) {
    const middle = (low + high) / 2;
    if (boardHeightAt(middle, input) <= height) low = middle;
    else high = middle;
  }
  return Math.floor(low * 100) / 100;
}
