import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatLeaderboardDate, leaderboardEntryKey, type LeaderboardEntry } from "@/lib/leaderboard-entries";
import { ARENA_SPRING } from "./arena-motion";
import { PlayerAvatar, PlayerName, YouTag } from "./LeaderboardParts";

interface RankListProps {
  entries: readonly LeaderboardEntry[];
  title: string;
  youId: Id<"users"> | null;
  entrance: boolean;
  reducedMotion: boolean;
}

interface ScrollEdges {
  scrollable: boolean;
  top: boolean;
  bottom: boolean;
}

/**
 * Whether the panel is height-limited (only where the page fits the screen) and which ends have rows hidden
 * past them. Overflow is clipped only then, so on stacked layouts avatars can still fly between podium and list.
 */
function useScrollEdges(scroller: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>) {
  const [edges, setEdges] = useState<ScrollEdges>({ scrollable: false, top: false, bottom: false });
  // Measured before paint, so a constrained list never shows a frame of rows spilling past its panel.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => {
      const scrollable = element.scrollHeight > element.clientHeight + 1;
      const next = {
        scrollable,
        top: scrollable && element.scrollTop > 1,
        bottom: scrollable && element.scrollTop + element.clientHeight < element.scrollHeight - 1,
      };
      setEdges((current) => (current.scrollable === next.scrollable && current.top === next.top && current.bottom === next.bottom ? current : next));
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    if (content.current) observer?.observe(content.current);
    return () => {
      element.removeEventListener("scroll", measure);
      observer?.disconnect();
    };
  }, [scroller, content]);
  return edges;
}

/**
 * Ranks 4 and below. Rows slide to their new place when the period changes. Where the page fits the
 * screen the list scrolls on its own (focusable for keyboard scrolling) and brings your row into view.
 */
export function ArenaRankList({ entries, title, youId, entrance, reducedMotion }: RankListProps) {
  const animate = entrance && !reducedMotion;
  const scroller = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const edges = useScrollEdges(scroller, list);
  const youOnList = !!youId && entries.some((entry) => entry.userId === youId);

  // Follows your row until the viewer scrolls the list themselves; reset on each period switch.
  const following = useRef(true);
  const stopFollowing = () => { following.current = false; };

  // On load and on each period switch: centre your row, or start from the top. Scrolls only the panel, never focus or the page.
  // Row heights settle after fonts load and names wrap, so it re-centres on resize until the viewer takes over.
  useEffect(() => {
    const element = scroller.current;
    const content = list.current;
    if (!element || !content || !edges.scrollable) return;
    following.current = true;
    const place = (behavior: ScrollBehavior) => {
      if (!following.current) return;
      const row = youOnList ? element.querySelector<HTMLElement>("[data-leaderboard-you]") : null;
      const top = row ? row.offsetTop - (element.clientHeight - row.offsetHeight) / 2 : 0;
      element.scrollTo({ top: Math.max(0, top), behavior });
    };
    place(entrance && !reducedMotion ? "smooth" : "auto");
    // The observer's first report is the current size; skip it so a smooth switch is not cut short.
    let measured = false;
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
      if (measured) place("auto");
      measured = true;
    });
    observer?.observe(content);
    observer?.observe(element);
    return () => observer?.disconnect();
    // Live score updates must not yank the list while someone is reading it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, youId, youOnList, edges.scrollable]);

  return (
    <div data-leaderboard-ranks className="relative flex min-h-0 flex-1 flex-col">
      <motion.div
        ref={scroller}
        layoutScroll
        data-leaderboard-scroller
        role={edges.scrollable ? "region" : undefined}
        aria-label={edges.scrollable ? `${title} ranks 4 and below, scrollable` : undefined}
        tabIndex={edges.scrollable ? 0 : undefined}
        onWheel={stopFollowing}
        onTouchStart={stopFollowing}
        onPointerDown={stopFollowing}
        onKeyDown={stopFollowing}
        className={cn(
          "relative min-h-0 flex-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          edges.scrollable && "overflow-y-auto overscroll-contain pr-1",
        )}
      >
        <ol ref={list} aria-label={`${title} ranks 4 and below`} start={4} className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {entries.map((entry) => {
              const key = leaderboardEntryKey(entry);
              const isYou = !!youId && entry.userId === youId;
              return (
                <motion.li
                  key={key}
                  layout={!reducedMotion}
                  initial={animate ? { opacity: 0, x: -16 } : false}
                  animate={{ opacity: 1, x: 0 }}
                  exit={animate ? { opacity: 0, x: 16 } : undefined}
                  transition={ARENA_SPRING}
                  data-leaderboard-row={entry.rank}
                  data-leaderboard-you={isYou || undefined}
                  className={cn("flex items-center gap-3 rounded-2xl border px-3 py-2.5 sm:px-4", isYou ? "border-primary/50 bg-primary/10" : "border-transparent bg-card")}
                >
                  <span className="w-7 shrink-0 text-right text-lg font-bold tabular-nums text-muted-foreground">
                    <span className="sr-only">Rank </span>{entry.rank}
                  </span>
                  <PlayerAvatar entry={entry} size="sm" layoutId={reducedMotion ? undefined : `arena-${key}`} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 font-semibold">
                      <PlayerName entry={entry} />
                      {isYou && <YouTag />}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatLeaderboardDate(entry.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-xl font-bold tabular-nums">
                    {entry.wpm}<span className="ml-1 text-xs font-normal text-muted-foreground">WPM</span>
                  </span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      </motion.div>
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 top-0 h-6 rounded-t-2xl bg-linear-to-b from-background to-transparent transition-opacity", edges.top ? "opacity-100" : "opacity-0")} />
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 bottom-0 h-8 rounded-b-2xl bg-linear-to-t from-background to-transparent transition-opacity", edges.bottom ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
