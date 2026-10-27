import { CheckCircleIcon, SparkleIcon, WrenchIcon, type Icon } from "@phosphor-icons/react";
import type { ChangeKind } from "@/lib/changelog";

export const CHANGELOG_SPRING = { type: "spring", stiffness: 420, damping: 34 } as const;

// Theme tokens only, so every theme stays legible.
export const KIND_STYLE: Record<ChangeKind, { Icon: Icon; tile: string; badge: string }> = {
  new: { Icon: SparkleIcon, tile: "bg-primary text-primary-foreground", badge: "bg-primary/15 text-primary" },
  improved: { Icon: CheckCircleIcon, tile: "bg-success text-background", badge: "bg-success/15 text-success" },
  fixed: { Icon: WrenchIcon, tile: "bg-warning text-background", badge: "bg-warning/15 text-warning" },
};
