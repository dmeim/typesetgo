import { ArrowFatLineUpIcon, BackspaceIcon, SkipForwardIcon, WarningCircleIcon, type Icon } from "@phosphor-icons/react";
import type { HintTone } from "@/lib/keyboard-model";

export const HINT_STYLE: Record<HintTone, { Icon: Icon; pill: string; text: string }> = {
  caps: { Icon: ArrowFatLineUpIcon, pill: "bg-warning/15 text-warning", text: "text-warning" },
  mistake: { Icon: BackspaceIcon, pill: "bg-destructive/15 text-destructive", text: "text-destructive" },
  ignored: { Icon: WarningCircleIcon, pill: "bg-destructive/15 text-destructive", text: "text-destructive" },
  skipped: { Icon: SkipForwardIcon, pill: "bg-muted text-muted-foreground", text: "text-muted-foreground" },
};

