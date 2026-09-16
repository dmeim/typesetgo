// One surface and motion policy for portaled UI. Callers can still override
// dimensions through className without replacing the primitive's behavior.
export const overlaySurface =
  "border-border bg-popover text-popover-foreground rounded-md border shadow-none";

export const overlayMotion =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150";

export const overlayWidth = "max-w-[calc(100vw-2rem)]";
