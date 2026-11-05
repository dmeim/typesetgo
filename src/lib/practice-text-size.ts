export const PRACTICE_LINE_HEIGHT = 1.6;

/** Put on the practice screen: very short windows (small phones) give the text a little less room next to the keyboard. */
export const PRACTICE_TEXT_SHARE_CLASS = "[@media(max-height:44rem)]:[--practice-keyboard-share:0.26]";

/**
 * Put on a practice screen with other things above it, such as a Connect room's bars: the text and keyboard then size
 * against this box instead of the window, which would promise them height they don't have.
 */
export const PRACTICE_OWN_BOX_CLASS = "[container-type:size] [--practice-height:100cqh]";

/** With PRACTICE_OWN_BOX_CLASS: the Finger guide's hands are tall, so the text gives up some of its share to keep them. */
export const PRACTICE_OWN_BOX_FINGER_CLASS = "[--practice-keyboard-share:0.26]";

/**
 * The practice text's CSS font size: the chosen size, shrunk on short screens so the visible lines take at most
 * 30% of the screen's height with the keyboard on (45% without), leaving room for the header, keyboard and footer.
 * Tall screens always get the chosen size.
 */
export function practiceFontSize(size: number, lines: number, keyboard: boolean) {
  const share = keyboard ? "var(--practice-keyboard-share, 0.3)" : "0.45";
  return `min(${size}rem, calc(var(--practice-height, 100dvh) * ${share} / ${Math.round(lines * PRACTICE_LINE_HEIGHT * 1000) / 1000}))`;
}
