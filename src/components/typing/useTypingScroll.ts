import { useLayoutEffect, useState, type RefObject } from "react";

interface TypingScrollOptions {
  viewportRef: RefObject<HTMLDivElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  caretRef: RefObject<HTMLSpanElement | null>;
  layoutKey: string;
  visibleLines: number;
  feedingTape?: boolean;
}

/** Measure the caret and content in the same transformed layer, so animation cancels out. */
export function useTypingScroll({ viewportRef, contentRef, caretRef, layoutKey, visibleLines,
  feedingTape = false }: TypingScrollOptions) {
  const [offset, setOffset] = useState(0);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const caret = caretRef.current;
      if (!caret) { setOffset(0); return; }
      const caretRect = caret.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(content).lineHeight) || 0;
      const desired = feedingTape
        ? caretRect.left - contentRect.left - viewport.clientWidth / 2
        : caretRect.top - contentRect.top - (visibleLines === 1 ? 0 : lineHeight);
      setOffset(Math.max(0, desired));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(content);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [viewportRef, contentRef, caretRef, layoutKey, visibleLines, feedingTape]);
  return offset;
}
