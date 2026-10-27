import { motion } from "framer-motion";
import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { AccountMenu, Avatar, BellButton, Logo, NotificationList, PopoverCard, SoonChip } from "./HeaderParts";
import { PAGES, type HeaderMockupProps, type NavItem, type PageId } from "./header-mock";
import { iconButton, navProps, useMenus } from "./header-utils";

/** 05 · Big friendly app tiles for each page, and one capsule for light/dark, alerts and you. Shrinks to a strip while typing. */
export function TilesHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<"alerts" | "account">();

  return (
    <div className="flex flex-1 flex-col">
      <motion.header layout transition={LAB_SPRING} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-3 px-3 pt-3">
        <motion.div animate={{ opacity: typing ? 0 : 1 }} inert={typing}>
          <Logo variant="banner" onHome={() => go("type")} className="[&_img]:w-28 @2xl:[&_img]:w-36" />
        </motion.div>

        <motion.nav layout transition={LAB_SPRING} aria-label="Pages" className="order-last grid w-full grid-cols-5 gap-1 @2xl:order-none @2xl:flex @2xl:w-auto">
          {PAGES.map((item) => <Tile key={item.id} item={item} page={page} go={go} small={typing} />)}
        </motion.nav>

        <motion.div {...menus.root} animate={{ opacity: typing ? 0 : 1 }} inert={typing} className="relative flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm">
          <button type="button" role="switch" aria-checked={dark} onClick={toggleDark} aria-label="Dark mode" className="relative flex h-9 w-16 items-center rounded-full bg-muted p-1 focus-visible:outline-2 focus-visible:outline-ring">
            <SunIcon className="absolute left-2 size-4 text-muted-foreground" aria-hidden="true" />
            <MoonIcon className="absolute right-2 size-4 text-muted-foreground" aria-hidden="true" />
            <motion.span layout transition={LAB_SPRING} className={cn("relative flex size-7 items-center justify-center rounded-full bg-card shadow", dark && "ml-auto")}>
              {dark ? <MoonIcon className="size-4 text-primary" weight="fill" aria-hidden="true" /> : <SunIcon className="size-4 text-warning" weight="fill" aria-hidden="true" />}
            </motion.span>
          </button>
          <BellButton notifications={notifications} expanded={menus.open === "alerts"} onClick={() => menus.toggle("alerts")} />
          <button type="button" onClick={() => menus.toggle("account")} aria-expanded={menus.open === "account"} aria-label={signedIn ? "Your profile" : "Guest menu"} className={iconButton}>
            <Avatar signedIn={signedIn} />
          </button>
          <PopoverCard open={menus.open === "alerts"}><NotificationList notifications={notifications} onReadAll={readAll} /></PopoverCard>
          <PopoverCard open={menus.open === "account"}><AccountMenu signedIn={signedIn} onPick={menus.close} /></PopoverCard>
        </motion.div>
      </motion.header>
      {children}
    </div>
  );
}

function Tile({ item, page, go, small }: { item: NavItem; page: PageId; go: (page: PageId) => void; small: boolean }) {
  const active = page === item.id;
  return (
    <motion.button
      layout
      transition={LAB_SPRING}
      {...navProps(item, page, go)}
      whileHover={item.soon ? undefined : "lift"}
      whileTap={item.soon ? undefined : { scale: 0.94 }}
      className={cn("relative flex flex-col items-center gap-1.5 rounded-2xl px-2 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-ring @2xl:px-3", active ? "text-foreground" : "text-muted-foreground", small && "py-1 opacity-60 hover:opacity-100")}
    >
      {active && <motion.span layoutId="tile-active" transition={LAB_SPRING} className="absolute inset-0 rounded-2xl bg-card shadow-md ring-1 ring-border" />}
      <motion.span
        layout
        variants={{ lift: { y: -4, rotate: -6 } }}
        transition={LAB_SPRING}
        className={cn("relative flex items-center justify-center rounded-xl shadow-sm", item.tile, small ? "size-7" : "size-10", item.soon && "grayscale")}
      >
        <item.Icon className={small ? "size-4" : "size-5"} weight="fill" aria-hidden="true" />
      </motion.span>
      {!small && (
        <motion.span layout="position" className="relative flex items-center gap-1 whitespace-nowrap">
          {item.id === "leaderboard" ? "Ranks" : item.label}
        </motion.span>
      )}
      {item.soon && !small && <SoonChip className="absolute -right-1 -top-1 bg-card ring-1 ring-border" />}
    </motion.button>
  );
}
