// Helpers shared by the notification center concepts. Level helpers come from the shipped achievement parts.
import type { MockNotice } from "./notifications-mock";

export { levelLabel, nextLabel, useStepStyle } from "@/components/achievements/achievement-levels";

/** Moves focus into a panel when it appears; stable so it runs once per mount. */
export const focusOnMount = (node: HTMLElement | null) => node?.focus({ preventScroll: true });

/** Spoken name for a notice button: title, then whether it is unread. */
export const noticeLabel = (notice: MockNotice, verb = "Open") => `${verb} ${notice.title}${notice.unread ? ", unread" : ""}`;
