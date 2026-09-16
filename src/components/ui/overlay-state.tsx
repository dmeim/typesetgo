import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";

type OpenProps = { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void };
type OverlayState = { open: boolean; onOpenChange: (open: boolean) => void; depth: number };
const OverlayContext = createContext<OverlayState | null>(null);
const escapeOwners = new Set<{ depth: number; handle: (event: KeyboardEvent) => void }>();

function handleEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.isComposing || event.defaultPrevented) return;
  // Registration happens in layout effects, before Radix's passive layer update.
  // The deepest open overlay owns this key even during its entrance animation.
  const owner = [...escapeOwners].sort((a, b) => a.depth - b.depth).at(-1);
  owner?.handle(event);
}

export function useOverlayState({ open, defaultOpen = false, onOpenChange }: OpenProps): OverlayState {
  const parent = useContext(OverlayContext);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const changeOpen = useCallback((next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [open, onOpenChange]);
  const depth = (parent?.depth ?? 0) + 1;
  return useMemo(() => ({ open: open ?? uncontrolledOpen, onOpenChange: changeOpen, depth }), [open, uncontrolledOpen, changeOpen, depth]);
}

export function OverlayScope({ value, children }: { value: OverlayState; children: ReactNode }) {
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useOverlayEscape(onEscapeKeyDown?: (event: KeyboardEvent) => void) {
  const state = useContext(OverlayContext);
  const current = useRef({ state, onEscapeKeyDown });
  useLayoutEffect(() => { current.current = { state, onEscapeKeyDown }; });
  useLayoutEffect(() => {
    if (!state?.open) return;
    const owner = {
      depth: state.depth,
      handle: (event: KeyboardEvent) => {
        current.current.onEscapeKeyDown?.(event);
        if (!event.defaultPrevented) current.current.state?.onOpenChange(false);
        event.preventDefault();
        event.stopImmediatePropagation();
      },
    };
    if (!escapeOwners.size) window.addEventListener("keydown", handleEscape, true);
    escapeOwners.add(owner);
    return () => {
      escapeOwners.delete(owner);
      if (!escapeOwners.size) window.removeEventListener("keydown", handleEscape, true);
    };
  }, [state?.open, state?.depth]);
}
