import { AnimatePresence, motion } from "framer-motion";
import { BellIcon, CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { AccountMenu, Avatar, Logo, ModeButton, NotificationList, SoonChip } from "./HeaderParts";
import { PAGES, type HeaderMockupProps } from "./header-mock";
import { iconButton, navProps, unreadOf, useMenus } from "./header-utils";

type IslandView = "pages" | "alerts" | "account";

/** 04 · One island in the middle names the page you are on, then grows into pages, alerts or your account. */
export function IslandHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<IslandView>();
  const current = PAGES.find((item) => item.id === page) ?? PAGES[0];
  const unread = unreadOf(notifications);
  const view = typing ? null : menus.open;

  return (
    <div className="relative flex flex-1 flex-col">
      <motion.header animate={{ opacity: typing ? 0 : 1 }} transition={LAB_SPRING} inert={typing} className="flex h-16 items-center justify-between px-3">
        <Logo variant="icon" onHome={() => go("type")} className="@2xl:hidden" />
        <Logo variant="banner" onHome={() => go("type")} className="hidden @2xl:block" />
        <div {...menus.root} className="flex items-center gap-0.5">
          <ModeButton dark={dark} onToggle={toggleDark} />
          <button type="button" onClick={() => menus.toggle("account")} aria-expanded={view === "account"} aria-label={signedIn ? "Your profile" : "Guest menu"} className={iconButton}>
            <Avatar signedIn={signedIn} />
          </button>
        </div>
      </motion.header>

      {/* Centred over the header so the island can grow past its neighbours. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-3">
        <motion.div
          {...menus.root}
          layout
          transition={LAB_SPRING}
          style={{ borderRadius: view ? 28 : 999 }}
          className={cn("pointer-events-auto overflow-hidden border border-border bg-foreground text-background shadow-xl", view && "w-full max-w-sm")}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {typing ? (
              <motion.div key="typing" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-8 items-center gap-2 px-3 text-xs">
                <span className="size-2 animate-pulse rounded-full bg-success" aria-hidden="true" />
                Typing · Esc
              </motion.div>
            ) : view === null ? (
              <motion.div key="idle" layout="position" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-10 items-center">
                <button type="button" onClick={() => menus.toggle("pages")} aria-expanded={false} aria-label={`${current.label}. Show pages`} className="flex h-full items-center gap-2 pl-3 pr-2 text-sm font-semibold">
                  <current.Icon className="size-5" weight="fill" aria-hidden="true" />
                  {current.label}
                  <CaretDownIcon className="size-3.5 opacity-60" aria-hidden="true" />
                </button>
                <span aria-hidden="true" className="h-5 w-px bg-background/25" />
                <button type="button" onClick={() => menus.toggle("alerts")} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className="flex h-full items-center gap-1.5 pl-2 pr-3 text-xs">
                  <BellIcon className="size-4" aria-hidden="true" />
                  {unread > 0 && <span className="rounded-full bg-destructive px-1.5 py-px font-bold text-background">{unread}</span>}
                </button>
              </motion.div>
            ) : (
              <motion.div key={view} layout="position" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={LAB_SPRING} className="bg-popover p-2 text-popover-foreground">
                <IslandTabs view={view} unread={unread} onPick={menus.toggle} />
                {view === "pages" && (
                  <nav aria-label="Pages" className="grid grid-cols-3 gap-1.5 pt-2 @md:grid-cols-5">
                    {PAGES.map((item) => (
                      <button key={item.id} {...navProps(item, page, go)} onClick={() => { if (!item.soon) { go(item.id); menus.close(); } }} className={cn("flex flex-col items-center gap-1.5 rounded-2xl p-2 text-xs font-medium hover:bg-accent", page === item.id && "bg-accent", item.soon && "opacity-60")}>
                        <span className={cn("flex size-11 items-center justify-center rounded-2xl", item.tile)}>
                          <item.Icon className="size-6" weight="fill" aria-hidden="true" />
                        </span>
                        {item.label}
                        {item.soon && <SoonChip />}
                      </button>
                    ))}
                  </nav>
                )}
                {view === "alerts" && <div className="pt-2"><NotificationList notifications={notifications} onReadAll={readAll} /></div>}
                {view === "account" && <div className="pt-2"><AccountMenu signedIn={signedIn} onPick={menus.close} /></div>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      {children}
    </div>
  );
}

function IslandTabs({ view, unread, onPick }: { view: IslandView; unread: number; onPick: (view: IslandView) => void }) {
  const tabs: [IslandView, string][] = [["pages", "Pages"], ["alerts", unread ? `Alerts · ${unread}` : "Alerts"], ["account", "You"]];
  return (
    <div role="tablist" aria-label="Island" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
      {tabs.map(([id, label]) => (
        <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => view !== id && onPick(id)} className={cn("relative rounded-full py-1.5 text-xs font-medium", view === id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
          {view === id && <motion.span layoutId="island-tab" transition={LAB_SPRING} className="absolute inset-0 rounded-full bg-card shadow-sm" />}
          <span className="relative">{label}</span>
        </button>
      ))}
    </div>
  );
}
