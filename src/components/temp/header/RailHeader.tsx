import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { AccountMenu, Avatar, BellButton, Logo, ModeIcon, NotificationList, PopoverCard, SoonChip, UnreadDot } from "./HeaderParts";
import { LEADERBOARD, MOCK_ACCOUNT, NAV, PAGES, type HeaderMockupProps, type NavItem, type PageId } from "./header-mock";
import { navProps, unreadOf, useMenus } from "./header-utils";

const railRow = "relative flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring";

/** 03 · A side rail that opens to show labels on hover or focus, and becomes a tab bar on phones. */
export function RailHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<"alerts" | "account">();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = (hovered || focused || menus.open !== null) && !typing;

  return (
    <div className="relative flex flex-1">
      <motion.aside
        initial={false}
        animate={{ width: open ? 208 : 68, x: typing ? -84 : 0 }}
        transition={LAB_SPRING}
        inert={typing}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(event) => !event.currentTarget.contains(event.relatedTarget) && setFocused(false)}
        className="absolute inset-y-0 left-0 z-30 hidden flex-col gap-1 border-r border-border bg-card/95 p-2.5 shadow-lg backdrop-blur @2xl:flex"
      >
        <div className="flex h-12 items-center overflow-hidden pl-1">
          <Logo variant={open ? "banner" : "icon"} onHome={() => go("type")} className="[&_img]:max-w-none" />
        </div>
        <nav aria-label="Pages" className="flex flex-col gap-1">
          {NAV.map((item) => <RailRow key={item.id} item={item} page={page} go={go} open={open} />)}
          <span aria-hidden="true" className="mx-3 my-1 h-px bg-border" />
          <RailRow item={LEADERBOARD} page={page} go={go} open={open} />
        </nav>

        <div {...menus.root} className="relative mt-auto flex flex-col gap-1">
          <button type="button" onClick={toggleDark} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} className={cn(railRow, "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <span className="flex shrink-0"><ModeIcon dark={dark} /></span>
            <RailLabel open={open}>{dark ? "Light mode" : "Dark mode"}</RailLabel>
          </button>
          <button type="button" onClick={() => menus.toggle("alerts")} aria-expanded={menus.open === "alerts"} aria-label="Notifications" className={cn(railRow, "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <span className="relative flex shrink-0">
              <BellIcon className="size-5" aria-hidden="true" />
              <UnreadDot count={unreadOf(notifications)} className="-right-1.5 -top-1.5" />
            </span>
            <RailLabel open={open}>Notifications</RailLabel>
          </button>
          <button type="button" onClick={() => menus.toggle("account")} aria-expanded={menus.open === "account"} aria-label={signedIn ? "Your profile" : "Guest menu"} className={cn(railRow, "-ml-1 gap-2.5 px-2 hover:bg-accent")}>
            <Avatar signedIn={signedIn} />
            <RailLabel open={open}>
              <span className="flex flex-col items-start leading-tight">
                <span>{signedIn ? MOCK_ACCOUNT.username : "Guest"}</span>
                <span className="text-[11px] font-normal text-muted-foreground">{signedIn ? "View profile" : "Sign in"}</span>
              </span>
            </RailLabel>
          </button>
          <PopoverCard open={menus.open === "alerts"} align="left" className="bottom-0 left-full top-auto ml-3 mt-0"><NotificationList notifications={notifications} onReadAll={readAll} /></PopoverCard>
          <PopoverCard open={menus.open === "account"} align="left" className="bottom-0 left-full top-auto ml-3 mt-0"><AccountMenu signedIn={signedIn} onPick={menus.close} /></PopoverCard>
        </div>
      </motion.aside>

      <div className="flex min-w-0 flex-1 flex-col @2xl:pl-[68px]">
        {/* Phones: logo and account up top, pages in a tab bar along the bottom edge. */}
        <motion.div animate={{ opacity: typing ? 0 : 1 }} inert={typing} className="flex items-center justify-between px-3 pt-3 @2xl:hidden">
          <Logo variant="banner" onHome={() => go("type")} className="[&_img]:w-28" />
          <div {...menus.root} className="relative flex items-center gap-0.5">
            <BellButton notifications={notifications} expanded={menus.open === "alerts"} onClick={() => menus.toggle("alerts")} />
            <button type="button" onClick={toggleDark} aria-label={`Switch to ${dark ? "light" : "dark"} mode`} className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"><ModeIcon dark={dark} /></button>
            <button type="button" onClick={() => menus.toggle("account")} aria-label={signedIn ? "Your profile" : "Guest menu"} className="flex size-9 items-center justify-center rounded-full hover:bg-accent"><Avatar signedIn={signedIn} /></button>
            <PopoverCard open={menus.open === "alerts"}><NotificationList notifications={notifications} onReadAll={readAll} /></PopoverCard>
            <PopoverCard open={menus.open === "account"}><AccountMenu signedIn={signedIn} onPick={menus.close} /></PopoverCard>
          </div>
        </motion.div>
        {children}
        <motion.nav
          aria-label="Pages"
          animate={{ y: typing ? 80 : 0 }}
          transition={LAB_SPRING}
          className="z-20 grid grid-cols-5 border-t border-border bg-card/95 px-1 pb-2 pt-1.5 backdrop-blur @2xl:hidden"
        >
          {PAGES.map((item) => {
            const active = page === item.id;
            return (
              <button key={item.id} {...navProps(item, page, go)} className={cn("relative flex flex-col items-center gap-0.5 rounded-xl py-1 text-[11px] font-medium", active ? "text-foreground" : "text-muted-foreground", item.soon && "opacity-50")}>
                <span className="relative flex h-7 w-12 items-center justify-center">
                  {active && <motion.span layoutId="rail-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-primary/15" />}
                  <item.Icon className={cn("relative size-5", active && "text-primary")} weight={active ? "fill" : "bold"} aria-hidden="true" />
                </span>
                {item.id === "leaderboard" ? "Ranks" : item.label}
              </button>
            );
          })}
        </motion.nav>
      </div>
    </div>
  );
}

function RailLabel({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={LAB_SPRING} className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          {children}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function RailRow({ item, page, go, open }: { item: NavItem; page: PageId; go: (page: PageId) => void; open: boolean }) {
  const active = page === item.id;
  return (
    <button {...navProps(item, page, go)} aria-label={item.label} className={cn(railRow, active ? "text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground", item.soon && "opacity-60 hover:bg-transparent hover:text-muted-foreground")}>
      {active && <motion.span layoutId="rail-active" transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-primary shadow-sm" />}
      <item.Icon className="relative size-5 shrink-0" weight={active ? "fill" : "bold"} aria-hidden="true" />
      <RailLabel open={open}>
        <span className="relative">{item.label}</span>
        {item.soon && <SoonChip className="relative" />}
      </RailLabel>
    </button>
  );
}
