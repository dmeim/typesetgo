import { useCallback, useRef, useState, type ComponentProps, type MouseEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CaretDownIcon, CaretLeftIcon, CaretRightIcon, CaretUpIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
const FADE = "3rem";

interface ScrollRowProps extends Omit<ComponentProps<"div">, "children"> {
  children: ReactNode;
  /** Adds a pill that opens the row into a wrapped panel showing every item at once. */
  expandable?: boolean;
  /** Text for the closed pill, e.g. "All 24". */
  expandLabel?: string;
}

/**
 * A single sideways-scrolling row that works without a trackpad: the edges fade and show arrow buttons
 * while there is more to see. Swipes, Shift+wheel and keyboard focus still scroll it as usual.
 * Props such as `role` and `aria-label` go to the row that holds the items.
 */
export function ScrollRow({ children, expandable = false, expandLabel = "Show all", className, ...props }: ScrollRowProps) {
  const [edges, setEdges] = useState({ left: false, right: false });
  const [expanded, setExpanded] = useState(false);
  const reduceMotion = useReducedMotion();
  const scroller = useRef<HTMLDivElement | null>(null);

  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const left = node.scrollLeft > 1;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    setEdges((current) => current.left === left && current.right === right ? current : { left, right });
  }, []);

  // A callback ref keeps the observer tied to the node's lifetime without an effect.
  const attach = useCallback((node: HTMLDivElement | null) => {
    scroller.current = node;
    if (!node) return;
    const resizes = new ResizeObserver(measure);
    const watch = () => {
      resizes.disconnect();
      resizes.observe(node);
      for (const child of node.children) resizes.observe(child);
    };
    // Items often arrive after mount (e.g. categories once themes load).
    const additions = new MutationObserver(watch);
    additions.observe(node, { childList: true });
    watch();
    return () => {
      additions.disconnect();
      resizes.disconnect();
    };
  }, [measure]);

  const nudge = (direction: -1 | 1) => {
    const node = scroller.current;
    node?.scrollBy({ left: direction * node.clientWidth * 0.7, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const open = expandable && expanded;
  // Choosing an item from the open panel folds it back and centres that item in the row.
  const pickFromPanel = (event: MouseEvent<HTMLDivElement>) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>("button, a");
    const node = scroller.current;
    if (!open || !item || !node?.contains(item)) return;
    setExpanded(false);
    // Runs after React commits the folded row, so offsets are final.
    setTimeout(() => {
      node.scrollLeft = item.offsetLeft - (node.clientWidth - item.offsetWidth) / 2;
      measure();
    });
  };

  const fadeLeft = !open && edges.left ? FADE : "0px";
  const fadeRight = !open && edges.right ? FADE : "0px";
  const mask = `linear-gradient(to right, transparent, #000 ${fadeLeft}, #000 calc(100% - ${fadeRight}), transparent)`;
  const arrow = "absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-md transition-opacity duration-200 hover:bg-accent";

  return (
    <motion.div layout={expandable} transition={SPRING} className={cn("flex min-w-0 items-start gap-2", open && "rounded-3xl border border-border bg-card/60 p-3")}>
      <div className="relative min-w-0 flex-1">
        <div
          ref={attach}
          onScroll={measure}
          onClickCapture={expandable ? pickFromPanel : undefined}
          style={{ maskImage: mask, WebkitMaskImage: mask }}
          className={cn("flex gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", open ? "flex-wrap" : "overflow-x-auto", className)}
          {...props}
        >
          {children}
        </div>
        {/* Mouse helpers only: keyboard users reach every item by Tab, which scrolls it into view. */}
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => nudge(-1)} className={cn(arrow, "left-0", !open && edges.left ? "opacity-100" : "pointer-events-none opacity-0")}>
          <CaretLeftIcon className="size-4" />
        </button>
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => nudge(1)} className={cn(arrow, "right-0", !open && edges.right ? "opacity-100" : "pointer-events-none opacity-0")}>
          <CaretRightIcon className="size-4" />
        </button>
      </div>
      {expandable && (open || edges.left || edges.right) && (
        <motion.button
          layout="position"
          transition={SPRING}
          type="button"
          aria-expanded={open}
          onClick={() => setExpanded((value) => !value)}
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {open ? <CaretUpIcon className="size-4" aria-hidden="true" /> : <CaretDownIcon className="size-4" aria-hidden="true" />}
          {open ? "Less" : expandLabel}
        </motion.button>
      )}
    </motion.div>
  );
}
