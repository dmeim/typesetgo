import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { AccountMenu, Avatar, BellButton, Logo, ModeButton, NotificationList, PopoverCard } from "./HeaderParts";
import { LEADERBOARD, NAV, PAGES, type HeaderMockupProps, type NavItem, type PageId } from "./header-mock";
import { iconButton, navProps, useMenus } from "./header-utils";

/** 01 · A floating dock. The active page grows its label; icons lift under the pointer like a dock. */
export function DockHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<"alerts" | "account">();

  const utilities = (
    <div {...menus.root} className="relative flex items-center gap-1.5">
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
      {/* Wide: everything in one dock. */}
      <div className="hidden justify-center px-3 pt-3 @3xl:flex">
        <motion.div layout transition={LAB_SPRING} className="flex items-center gap-1 rounded-full border border-border bg-card/80 p-2 shadow-lg backdrop-blur">
          <Logo variant="banner" onHome={() => go("type")} className="px-2 [&_img]:w-30" />
          <AnimatePresence mode="popLayout" initial={false}>
            {typing ? (
              <motion.span key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap px-2 text-xs text-muted-foreground">
                Esc to show
              </motion.span>
            ) : (
              <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1">
                <span aria-hidden="true" className="mx-3 h-6 w-px bg-border" />
                <nav aria-label="Pages" className="flex items-center gap-1.5">
                  {NAV.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group="wide" />)}
                  <span aria-hidden="true" className="mx-3 h-6 w-px bg-border" />
                  <DockItem item={LEADERBOARD} page={page} go={go} group="wide" />
                </nav>
                <span aria-hidden="true" className="mx-3 h-6 w-px bg-border" />
                {utilities}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Narrow: a slim top bar, with the pages in a dock at the bottom within thumb reach. */}
      <motion.div animate={{ opacity: typing ? 0 : 1, y: typing ? -16 : 0 }} transition={LAB_SPRING} className={cn("flex items-center justify-between px-3 pt-3 @3xl:hidden", typing && "pointer-events-none")}>
        <Logo variant="banner" onHome={() => go("type")} className="[&_img]:w-28" />
        {utilities}
      </motion.div>

      {children}

      <motion.nav
        aria-label="Pages"
        animate={{ y: typing ? 96 : 0 }}
        transition={LAB_SPRING}
        className="absolute inset-x-3 bottom-3 z-20 mx-auto flex w-fit items-center gap-1 rounded-full border border-border bg-card/90 p-1.5 shadow-lg backdrop-blur @3xl:hidden"
      >
        {PAGES.map((item) => <DockItem key={item.id} item={item} page={page} go={go} group="narrow" />)}
      </motion.nav>
    </div>
  );
}

function DockItem({ item, page, go, group }: { item: NavItem; page: PageId; go: (page: PageId) => void; group: string }) {
  const active = page === item.id;
  return (
    <motion.button
      layout
      transition={LAB_SPRING}
      {...navProps(item, page, go)}
      aria-label={item.label}
      className={cn("relative flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring", active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground", item.soon && "opacity-50")}
    >
      {active && <motion.span layoutId={`dock-active-${group}`} transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary shadow-sm" />}
      <motion.span whileHover={item.soon ? undefined : { y: -3, scale: 1.18 }} transition={LAB_SPRING} className="relative flex">
        <item.Icon className="size-5" weight={active ? "fill" : "bold"} aria-hidden="true" />
      </motion.span>
      <AnimatePresence initial={false}>
        {active && (
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
