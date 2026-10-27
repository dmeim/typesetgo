import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { DockItem } from "./DockHeader";
import { AccountMenu, Avatar, BellButton, ModeButton, NotificationList, PopoverCard } from "./HeaderParts";
import { NAV, TOOLS, type HeaderMockupProps } from "./header-mock";
import { iconButton, useMenus } from "./header-utils";

const pill = "flex items-center rounded-full border border-border bg-card/80 p-2 shadow-lg backdrop-blur";
// The side pills share one width so the header balances around the centre dock.
const side = "w-36 @min-[52rem]:w-40 @min-[56rem]:w-48";

/** Three pills: a big logo, the dock of pages in the middle, and your buttons. The side pills match in width. Hidden while typing. */
export function TriDockHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<"alerts" | "account">();

  const logo = (
    <div className={cn(pill, side, "justify-center px-4")}>
      <LogoArtwork onHome={() => go("type")} />
    </div>
  );

  const utilities = (
    <div {...menus.root} className={cn(pill, side, "relative justify-evenly")}>
      <ModeButton dark={dark} onToggle={toggleDark} />
      <BellButton notifications={notifications} expanded={menus.open === "alerts"} onClick={() => menus.toggle("alerts")} />
      <button type="button" onClick={() => menus.toggle("account")} aria-expanded={menus.open === "account"} aria-label={signedIn ? "Your profile" : "Guest menu"} className={iconButton}>
        <Avatar signedIn={signedIn} />
      </button>
      <PopoverCard open={menus.open === "alerts"}><NotificationList notifications={notifications} onReadAll={readAll} /></PopoverCard>
      <PopoverCard open={menus.open === "account"}><AccountMenu signedIn={signedIn} onPick={menus.close} /></PopoverCard>
    </div>
  );

  const dock = (compact: boolean) => (
    <motion.nav layout transition={LAB_SPRING} aria-label="Pages" className={cn(pill, compact ? "gap-0.5 p-1.5" : "gap-1 @min-[56rem]:gap-1.5")}>
      {NAV.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group={compact ? "tri-narrow" : "tri-wide"} compact={compact} />)}
      <span aria-hidden="true" className={cn("h-6 w-px bg-border", compact ? "mx-1" : "mx-1.5 @min-[56rem]:mx-3")} />
      {TOOLS.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group={compact ? "tri-narrow" : "tri-wide"} compact={compact} />)}
    </motion.nav>
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
        {/* Wide: one row, with the dock held in the true centre. */}
        <div className="hidden grid-cols-[1fr_auto_1fr] items-stretch gap-3 @min-[47rem]:grid [&>*]:h-full [&>*>*]:h-full">
          <div className="justify-self-start">{logo}</div>
          {dock(false)}
          <div className="justify-self-end">{utilities}</div>
        </div>
        {/* Phones: the two matching pills on top, the dock below with icons only. */}
        <div className="flex flex-col items-center gap-2 @min-[47rem]:hidden">
          <div className="flex w-full items-stretch justify-between gap-2">
            {logo}
            {utilities}
          </div>
          {dock(true)}
        </div>
      </motion.header>

      {children}
    </div>
  );
}

/**
 * The banner SVG has wide empty margins, so it is cropped to the artwork (about 17–88% across and 24–82% down)
 * and the logo can fill its pill.
 */
function LogoArtwork({ onHome }: { onHome: () => void }) {
  return (
    <button type="button" onClick={onHome} aria-label="TypeSetGo home" className="relative aspect-[2045/470] w-full overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
      <img src="/assets/Banner-Color.svg" alt="" className="absolute left-[-23.5%] top-[-41.5%] w-[140.8%] max-w-none" />
    </button>
  );
}
