import { useLayoutEffect, useState, type RefObject } from "react";
import { fitCardScale } from "@/components/connect/board/board-fit";

/** Each look's grid: how narrow a card may get and the gap between cards, in em (see ParticipantBoard). */
export const BOARD_GRID = {
  ribbon: { minCardWidth: 17, gap: 0.5 },
  big: { minCardWidth: 12, gap: 0.6 },
  list: { minCardWidth: 15, gap: 0.75 },
} satisfies Record<string, { minCardWidth: number; gap: number }>;

export type BoardGrid = (typeof BOARD_GRID)[keyof typeof BOARD_GRID];

/** Room below the list inside the board: what follows it, plus the padding and borders around it. */
function spaceBelow(list: HTMLElement, root: HTMLElement) {
  let space = 0;
  for (let child: HTMLElement = list, parent = list.parentElement; parent; child = parent, parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const gap = parseFloat(style.rowGap) || 0;
    for (let next = child.nextElementSibling; next; next = next.nextElementSibling) {
      if (next instanceof HTMLElement && next.offsetHeight > 0) space += next.offsetHeight + gap;
    }
    space += (parseFloat(style.paddingBottom) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    if (parent === root) break;
  }
  return space;
}

/**
 * Fit: the largest card size at which every card shows at once, with the board (`[data-board]`) at the top of the
 * window: fullscreen, popped out, or scrolled to on the host page. Each window works out its own size.
 */
export function useBoardFit(enabled: boolean, listRef: RefObject<HTMLElement | null>, count: number, list: boolean, grid: BoardGrid) {
  const { minCardWidth, gap } = grid;
  const [fitted, setFitted] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = listRef.current;
    if (!enabled || !element) return;
    const root = element.closest<HTMLElement>("[data-board]") ?? document.body;
    const update = () => {
      const cards = Array.from(element.children) as HTMLElement[];
      const tallest = Math.max(0, ...cards.map((card) => card.offsetHeight));
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      // The size the cards are drawn at now, fitted or not.
      const scale = (parseFloat(getComputedStyle(element).fontSize) || remPx) / remPx;
      const top = element.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
      const next = fitCardScale({
        count,
        width: element.clientWidth,
        height: document.documentElement.clientHeight - top - spaceBelow(element, root),
        cardHeight: tallest / scale,
        minCardWidth,
        gap,
        list,
        remPx,
      });
      setFitted((current) => (current === next ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    observer.observe(root);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [enabled, listRef, count, list, minCardWidth, gap]);

  return enabled ? fitted : null;
}
