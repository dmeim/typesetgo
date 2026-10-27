// Shared look and motion for the Dock header and its UI Lab mockups.

/** A round icon-only button in the dock. `aria-disabled` keeps it focusable so its tooltip can explain why. */
export const iconButton = "relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:hover:text-muted-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground";

export const DOCK_SPRING = { type: "spring", stiffness: 460, damping: 38, mass: 0.85 } as const;
