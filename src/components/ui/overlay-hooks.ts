import { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { OverlayContext, type OverlayState } from "./overlay-context";

type OpenProps = { open?: boolean; defaultOpen?: boolean; onOpenChange?: (open: boolean) => void };
const escapeOwners = new Set<{ depth: number; handle: (event: KeyboardEvent) => void }>();

function handleEscape(event: KeyboardEvent) {
  if (event.key !== "Escape" || event.defaultPrevented) return;
  if (event.isComposing && escapeOwners.size) {
    // Let the browser cancel IME composition without Radix dismissing a layer.
    event.stopImmediatePropagation();
    return;
  }
  // Registration happens in layout effects, before Radix's passive layer update.
  // The deepest open overlay owns this key even during its entrance animation.
  const owner = [...escapeOwners].sort((a, b) => a.depth - b.depth).at(-1);
  owner?.handle(event);
}

export function useOverlayState({ open, defaultOpen = false, onOpenChange }: OpenProps, options?: { escapeClosesParent?: boolean }): OverlayState {
  const parent = useContext(OverlayContext);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const changeOpen = useCallback((next: boolean) => {
    if (open === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [open, onOpenChange]);
  const depth = (parent?.depth ?? 0) + 1;
  const closeSelf = useCallback(() => changeOpen(false), [changeOpen]);
  const closeOnEscape = options?.escapeClosesParent && parent ? parent.closeOnEscape : closeSelf;
  return useMemo(() => ({ open: open ?? uncontrolledOpen, onOpenChange: changeOpen, closeOnEscape, depth }), [open, uncontrolledOpen, changeOpen, closeOnEscape, depth]);
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
        // A veto may reserve Escape for a descendant's keyboard controller.
        // Keep propagating unless the consumer explicitly stops the event.
        if (event.defaultPrevented) return;
        current.current.state?.closeOnEscape();
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
