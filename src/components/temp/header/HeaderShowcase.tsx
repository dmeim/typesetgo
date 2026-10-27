import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { DockHeader } from "./DockHeader";
import { IslandHeader } from "./IslandHeader";
import { RailHeader } from "./RailHeader";
import { SplitHeader } from "./SplitHeader";
import { TilesHeader } from "./TilesHeader";
import { GUEST_NOTIFICATIONS, NOTIFICATIONS, PAGES, type HeaderMockupProps, type PageId } from "./header-mock";

const MOCKUPS: [string, string, ComponentType<HeaderMockupProps>][] = [
  ["Dock", "A floating dock. The page you are on grows its name, icons lift as you point, and phones get the dock at the bottom.", DockHeader],
  ["Split", "Logo, centred tabs with a sliding underline, and an account pill that morphs into its own menu.", SplitHeader],
  ["Rail", "A side rail that opens to show labels on hover or Tab, freeing the top of the page. A bottom tab bar on phones.", RailHeader],
  ["Island", "One island names your page. Tap it to grow into pages, alerts or your account, all in one place.", IslandHeader],
  ["Tiles", "Big colourful app tiles that wiggle when you point, plus one capsule with a real light/dark switch.", TilesHeader],
];

const PATHS: Record<PageId, string> = { type: "/", race: "/race", lessons: "/lessons", connect: "/connect", leaderboard: "/leaderboard" };
const WORDS = "the quick brown fox jumps over the lazy dog while the class races to type every word".split(" ");

/** Every header mockup in a mini browser window, with the toggles the UI Lab section provides. */
export function HeaderShowcase({ signedIn, typing, phone }: { signedIn: boolean; typing: boolean; phone: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      {MOCKUPS.map(([name, summary, Mockup], index) => (
        <div key={name} className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5 px-1">
            <span className="text-sm font-semibold"><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {name}</span>
            <span className="text-xs text-muted-foreground">{summary}</span>
          </div>
          {/* Remount when signing in or out so each mockup starts fresh. */}
          <MockWindow key={String(signedIn)} Mockup={Mockup} signedIn={signedIn} typing={typing} phone={phone} />
        </div>
      ))}
    </div>
  );
}

function MockWindow({ Mockup, signedIn, typing, phone }: { Mockup: ComponentType<HeaderMockupProps>; signedIn: boolean; typing: boolean; phone: boolean }) {
  const [page, setPage] = useState<PageId>("type");
  const [dark, setDark] = useState(true);
  const [notifications, setNotifications] = useState(signedIn ? NOTIFICATIONS : GUEST_NOTIFICATIONS);
  const readAll = () => setNotifications((items) => items.map((item) => ({ ...item, unread: false })));

  return (
    <motion.div layout transition={LAB_SPRING} className={cn("mx-auto w-full overflow-hidden rounded-3xl border border-border bg-background shadow-sm", phone && "max-w-[375px]")}>
      <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-2 flex min-w-0 items-center gap-1 truncate rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground">
          <LockSimpleIcon className="size-3 shrink-0" />typesetgo.app{PATHS[page]}
        </span>
      </div>
      <div className="@container flex h-[30rem] flex-col">
        <Mockup
          signedIn={signedIn}
          typing={typing}
          page={page}
          go={setPage}
          dark={dark}
          toggleDark={() => setDark((value) => !value)}
          notifications={notifications}
          readAll={readAll}
        >
          <MockPage page={page} typing={typing} />
        </Mockup>
      </div>
    </motion.div>
  );
}

function MockPage({ page, typing }: { page: PageId; typing: boolean }) {
  const item = PAGES.find((entry) => entry.id === page) ?? PAGES[0];
  if (page !== "type") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-16 text-center">
        <span className={cn("flex size-14 items-center justify-center rounded-2xl", item.tile)}>
          <item.Icon className="size-7" weight="fill" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold">{item.label}</span>
        {page === "leaderboard"
          ? <Link to="/temp-leaderboard1" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">Open the leaderboard mockups<ArrowRightIcon className="size-4" aria-hidden="true" /></Link>
          : <span className="text-sm text-muted-foreground">Host a room or join one with a code.</span>}
      </div>
    );
  }
  const typed = typing ? 7 : 0;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-16">
      <motion.div animate={{ opacity: typing ? 0 : 1 }} aria-hidden="true" className="flex gap-1.5 rounded-full bg-muted/60 p-1">
        {["time", "words", "quote"].map((mode, index) => (
          <span key={mode} className={cn("rounded-full px-3 py-1 text-xs text-muted-foreground", index === 0 && "bg-card text-foreground shadow-sm")}>{mode}</span>
        ))}
      </motion.div>
      <p className="max-w-xl text-center text-xl leading-relaxed @2xl:text-2xl">
        {WORDS.map((word, index) => (
          <span key={index} className={index < typed ? "text-foreground" : "text-muted-foreground/60"}>
            {index === typed && typing && <span aria-hidden="true" className="mr-0.5 inline-block h-6 w-0.5 translate-y-1 animate-pulse bg-primary" />}
            {word}{" "}
          </span>
        ))}
      </p>
      <span className="text-xs text-muted-foreground">{typing ? "Mid-test: the header steps aside." : "Turn on Typing above to see the header step aside."}</span>
    </div>
  );
}
