import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { DockItem } from "./DockHeader";
import { AccountMenu, Avatar, BellButton, Logo, ModeButton, NotificationList, PopoverCard } from "./HeaderParts";
import { NAV, TOOLS, type HeaderMockupProps } from "./header-mock";
import { iconButton, useMenus } from "./header-utils";

const pill = "flex items-center gap-1 rounded-full border border-border bg-card/80 shadow-lg backdrop-blur";

/** The Dock split in two: logo and pages on the left, everything else on the right. Hidden while typing. */
export function SplitDockHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<"alerts" | "account">();

  const utilities = (
    <div {...menus.root} className="relative flex items-center gap-1 @min-[49rem]:gap-1.5">
      <ModeButton dark={dark} onToggle={toggleDark} />
      <BellButton notifications={notifications} expanded={menus.open === "alerts"} onClick={() => menus.toggle("alerts")} />
      <button type="button" onClick={() => menus.toggle("account")} aria-expanded={menus.open === "account"} aria-label={signedIn ? "Your profile" : "Guest menu"} className={iconButton}>
        <Avatar signedIn={signedIn} />
      </button>
      <PopoverCard open={menus.open === "alerts"}><NotificationList notifications={notifications} onReadAll={readAll} /></PopoverCard>
      <PopoverCard open={menus.open === "account"}><AccountMenu signedIn={signedIn} onPick={menus.close} /></PopoverCard>
    </div>
  );

  // Phones get icon-only pages so each pill fits on its own row.
  const pills = (compact: boolean) => (
    <>
      <motion.div layout transition={LAB_SPRING} className={cn(pill, compact ? "p-1.5" : "p-2")}>
        <Logo variant="banner" onHome={() => go("type")} className={cn("px-2", compact ? "[&_img]:w-24" : "[&_img]:w-24 @min-[49rem]:[&_img]:w-30")} />
        <Divider />
        <nav aria-label="Pages" className={cn("flex items-center", compact ? "gap-0.5" : "gap-1 @min-[49rem]:gap-1.5")}>
          {NAV.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group={compact ? "split-narrow" : "split-wide"} compact={compact} />)}
        </nav>
      </motion.div>
      <motion.div layout transition={LAB_SPRING} className={cn(pill, "ml-auto", compact ? "p-1.5" : "p-2")}>
        <nav aria-label="More" className={cn("flex items-center", compact ? "gap-0.5" : "gap-1 @min-[49rem]:gap-1.5")}>
          {TOOLS.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group={compact ? "split-narrow" : "split-wide"} compact={compact} />)}
        </nav>
        <Divider />
        {utilities}
      </motion.div>
    </>
  );

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Like today's header, it is hidden and unreachable while you type. */}
      <motion.header
        initial={false}
        animate={{ opacity: typing ? 0 : 1, y: typing ? -24 : 0 }}
        transition={LAB_SPRING}
        inert={typing}
        className="px-3 pt-3"
      >
        <div className="hidden items-center justify-between gap-3 @min-[44rem]:flex">{pills(false)}</div>
        <div className="flex flex-wrap items-center justify-between gap-2 @min-[44rem]:hidden">{pills(true)}</div>
      </motion.header>

      {children}
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-border @min-[49rem]:mx-3" />;
}
