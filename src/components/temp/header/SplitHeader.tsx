import { motion } from "framer-motion";
import { CaretDownIcon, FireIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { AccountMenu, Avatar, BellButton, Logo, ModeButton, NotificationList, PopoverCard, SoonChip } from "./HeaderParts";
import { LEADERBOARD, MOCK_ACCOUNT, NAV, type HeaderMockupProps, type NavItem, type PageId } from "./header-mock";
import { iconButton, navProps, useMenus } from "./header-utils";

/** 02 · Logo, centred tabs with a sliding underline, and an account pill that grows into its own menu. */
export function SplitHeader({ children, ...demo }: HeaderMockupProps) {
  const { signedIn, typing, page, go, dark, toggleDark, notifications, readAll } = demo;
  const menus = useMenus<"alerts" | "account">();
  const accountOpen = menus.open === "account";

  const pill = (
    <span className="flex items-center gap-2 py-1 pl-1 pr-3">
      <Avatar signedIn={signedIn} />
      <span className="hidden flex-col items-start leading-tight @4xl:flex">
        <span className="text-sm font-semibold">{signedIn ? MOCK_ACCOUNT.username : "Guest"}</span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {signedIn ? <><FireIcon className="size-3 text-warning" weight="fill" aria-hidden="true" />{MOCK_ACCOUNT.streak} days</> : "Sign in"}
        </span>
      </span>
      <CaretDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </span>
  );

  return (
    <div className="flex flex-1 flex-col">
      <motion.header
        initial={false}
        animate={typing ? { opacity: 0, y: -24, height: 0 } : { opacity: 1, y: 0, height: "auto" }}
        transition={LAB_SPRING}
        inert={typing}
        className="relative z-30 flex flex-col gap-2 border-b border-border/60 px-3 pt-3 @2xl:grid @2xl:grid-cols-[auto_1fr_auto] @2xl:gap-3 @2xl:items-center @2xl:pb-0"
      >
        <div className="flex items-center justify-between gap-2 @2xl:contents">
          <Logo variant="banner" onHome={() => go("type")} className="[&_img]:w-28 @2xl:justify-self-start @2xl:[&_img]:w-36" />

          <div {...menus.root} className="relative flex items-center gap-0.5 @2xl:col-start-3 @2xl:justify-self-end">
            <button {...navProps(LEADERBOARD, page, go)} aria-label="Leaderboard" className={cn(iconButton, page === "leaderboard" && "bg-accent text-foreground")}>
              <LEADERBOARD.Icon className="size-5" weight={page === "leaderboard" ? "fill" : "bold"} aria-hidden="true" />
            </button>
            <BellButton notifications={notifications} expanded={menus.open === "alerts"} onClick={() => menus.toggle("alerts")} />
            <ModeButton dark={dark} onToggle={toggleDark} />
            <div className="relative ml-1">
              {/* The pill keeps its space while it is busy being the menu. */}
              <button
                type="button"
                onClick={() => menus.toggle("account")}
                aria-expanded={accountOpen}
                aria-label={signedIn ? "Your profile" : "Guest menu"}
                className={cn("group block rounded-full focus-visible:outline-2 focus-visible:outline-ring", accountOpen && "invisible")}
              >
                {accountOpen ? <span className="block border border-transparent">{pill}</span> : (
                  <motion.span layoutId="split-account" transition={LAB_SPRING} style={{ borderRadius: 999 }} className="block border border-border bg-card group-hover:bg-accent">
                    {pill}
                  </motion.span>
                )}
              </button>
              {accountOpen && (
                <motion.div
                  layoutId="split-account"
                  transition={LAB_SPRING}
                  style={{ borderRadius: 24 }}
                  className="absolute right-0 top-0 z-50 w-72 max-w-[calc(100cqw-1.5rem)] overflow-hidden border border-border bg-popover p-2 text-popover-foreground shadow-xl"
                >
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
                    <AccountMenu signedIn={signedIn} onPick={menus.close} />
                  </motion.div>
                </motion.div>
              )}
            </div>
            <PopoverCard open={menus.open === "alerts"}><NotificationList notifications={notifications} onReadAll={readAll} /></PopoverCard>
          </div>
        </div>

        <nav aria-label="Pages" className="grid grid-cols-4 @2xl:col-start-2 @2xl:row-start-1 @2xl:flex @2xl:justify-self-center @2xl:gap-1">
          {NAV.map((item) => <SplitTab key={item.id} item={item} page={page} go={go} />)}
        </nav>
      </motion.header>
      {children}
    </div>
  );
}

function SplitTab({ item, page, go }: { item: NavItem; page: PageId; go: (page: PageId) => void }) {
  const active = page === item.id;
  return (
    <button
      {...navProps(item, page, go)}
      className={cn(
        "relative flex flex-col items-center gap-1 px-3 pb-2.5 pt-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring @2xl:flex-row @2xl:gap-2 @2xl:py-4 @2xl:text-sm",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        item.soon && "cursor-default opacity-60 hover:text-muted-foreground",
      )}
    >
      <item.Icon className="size-5 @2xl:size-4" weight={active ? "fill" : "bold"} aria-hidden="true" />
      <span className="flex items-center gap-1.5">{item.label}{item.soon && <SoonChip className="hidden @4xl:inline" />}</span>
      {active && <motion.span layoutId="split-underline" transition={LAB_SPRING} className="absolute inset-x-3 -bottom-px h-[3px] rounded-full bg-primary" />}
    </button>
  );
}
