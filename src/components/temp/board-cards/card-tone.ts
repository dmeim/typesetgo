import type { BoardStatus } from "@/components/connect/board/board-model";
import type { CardView, SimTest } from "./board-cards-mock";

/** The real card's crown gold. */
export const GOLD = "#d6a738";

export interface BoardCardProps {
  player: CardView;
  tests: SimTest[];
}

export const STATUS_TONE: Partial<Record<BoardStatus, string>> = {
  typing: "text-primary",
  finished: "text-success",
  done: "text-success",
  late: "text-warning",
  paused: "text-warning",
};

/** Frame tone shared by every concept: dashed and dim when away, dashed amber when late, green when finished, gold for the leader. */
export function frameTone(player: CardView) {
  if (player.away) return "border-dashed border-border bg-muted text-muted-foreground";
  if (player.status === "late") return "border-dashed border-warning/60 bg-card";
  if (player.finished) return "border-success/60 bg-card";
  if (player.leader) return "border-[#d6a738]/60 bg-card";
  return "border-border bg-card";
}

export function barTone(player: CardView) {
  if (player.finished) return "bg-success";
  if (player.status === "break") return "bg-muted-foreground/50";
  return "bg-primary";
}
