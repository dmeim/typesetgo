export const PRACTICE_LINE_HEIGHT = 1.6;

/** Put on the practice screen: very short windows (small phones) give the text a little less room next to the keyboard. */
export const PRACTICE_TEXT_SHARE_CLASS = "[@media(max-height:44rem)]:[--practice-keyboard-share:26dvh]";

/**
 * The practice text's CSS font size: the chosen size, shrunk on short screens so the visible lines take at most
 * 30% of the window height with the keyboard on (45% without), leaving room for the header, keyboard and footer.
 * Tall screens always get the chosen size.
 */
export function practiceFontSize(size: number, lines: number, keyboard: boolean) {
  const share = keyboard ? "var(--practice-keyboard-share, 30dvh)" : "45dvh";
  return `min(${size}rem, calc(${share} / ${Math.round(lines * PRACTICE_LINE_HEIGHT * 1000) / 1000}))`;
}
