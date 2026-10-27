import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { AccountMenu, Avatar, BellButton, Logo, ModeButton, NotificationList, PopoverCard } from "./HeaderParts";
import { NAV, TOOLS, type HeaderMockupProps, type NavItem, type PageId } from "./header-mock";
import { iconButton, navProps, useMenus } from "./header-utils";

/** A floating dock header. The active page grows its label; icons lift under the pointer like a dock. Hidden while typing. */
export function DockHeader({ children, ...demo }: HeaderMockupProps) {
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

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Like today's header, it is hidden and unreachable while you type. */}
      <motion.header
        initial={false}
        animate={{ opacity: typing ? 0 : 1, y: typing ? -24 : 0 }}
        transition={LAB_SPRING}
        inert={typing}
        className="flex flex-col items-center gap-2 px-3 pt-3"
      >
        {/* Wide: everything in one dock. */}
        <motion.div layout transition={LAB_SPRING} className="hidden items-center gap-1 rounded-full border border-border bg-card/80 p-2 shadow-lg backdrop-blur @min-[44rem]:flex">
          <Logo variant="banner" onHome={() => go("type")} className="px-2 [&_img]:w-24 @min-[49rem]:[&_img]:w-30" />
          <Divider />
          <nav aria-label="Pages" className="flex items-center gap-1 @min-[49rem]:gap-1.5">
            {NAV.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group="wide" />)}
            <Divider />
            {TOOLS.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group="wide" />)}
          </nav>
          <Divider />
          {utilities}
        </motion.div>

        {/* Phones: the logo and your buttons on top, the same dock just below with icons only. */}
        <div className="flex w-full items-center justify-between @min-[44rem]:hidden">
          <Logo variant="banner" onHome={() => go("type")} className="[&_img]:w-28" />
          {utilities}
        </div>
        <nav aria-label="Pages" className="flex items-center gap-0.5 rounded-full border border-border bg-card/80 p-1.5 shadow-lg backdrop-blur @min-[44rem]:hidden">
          {NAV.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group="narrow" compact />)}
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
          {TOOLS.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group="narrow" compact />)}
        </nav>
      </motion.header>

      {children}
    </div>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-border @min-[49rem]:mx-3" />;
}

export function DockItem({ item, page, go, group, compact = false }: { item: NavItem; page: PageId; go: (page: PageId) => void; group: string; compact?: boolean }) {
  const active = page === item.id;
  return (
    <motion.button
      layout
      transition={LAB_SPRING}
      {...navProps(item, page, go)}
      aria-label={item.label}
      className={cn("relative flex items-center gap-1.5 rounded-full text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring", compact ? "h-9 px-2" : "h-10 px-3", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground", item.soon && "opacity-50")}
    >
      {active && <motion.span layoutId={`dock-active-${group}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
      <motion.span whileHover={item.soon ? undefined : { y: -3, scale: 1.18 }} transition={LAB_SPRING} className="relative flex">
        <item.Icon className="size-5" weight={active ? "fill" : "bold"} aria-hidden="true" />
      </motion.span>
      <AnimatePresence initial={false}>
        {active && !compact && (
          <motion.span
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "auto", opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={LAB_SPRING}
            className="relative overflow-hidden whitespace-nowrap"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
      {item.soon && <span aria-hidden="true" className="absolute right-1 top-1 size-1.5 rounded-full bg-muted-foreground" />}
    </motion.button>
  );
}
