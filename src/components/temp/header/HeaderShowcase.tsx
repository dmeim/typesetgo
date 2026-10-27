import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { DockHeader } from "./DockHeader";
import { SplitDockHeader } from "./SplitDockHeader";
import { TriDockHeader } from "./TriDockHeader";
import { ALL_PAGES, GUEST_NOTIFICATIONS, NOTIFICATIONS, type HeaderMockupProps, type PageId } from "./header-mock";

const PATHS: Record<PageId, string> = { type: "/", race: "/race", lessons: "/lessons", connect: "/connect", leaderboard: "/leaderboard", theme: "/profile/theme", settings: "/profile/text" };
const PAGE_LINKS: Partial<Record<PageId, [string, string]>> = {
  leaderboard: ["/temp-leaderboard1", "Open the leaderboard mockups"],
  theme: ["/temp-profile/theme", "Open Theme in the Profile mockup"],
  settings: ["/temp-profile/text", "Open Settings in the Profile mockup"],
};
const WORDS = "the quick brown fox jumps over the lazy dog while the class races to type every word".split(" ");

// The Dock is the chosen header; the other two stay as concepts to revisit.
const DESIGNS: [string, string, ComponentType<HeaderMockupProps>, boolean][] = [
  ["Dock", "Everything in one floating pill.", DockHeader, true],
  ["Split dock", "The same dock split in two: logo and pages on the left, leaderboard, theme, settings and your buttons on the right.", SplitDockHeader, false],
  ["Three pills", "A big logo on the left, the dock of pages, leaderboard, theme and settings in the centre, and light/dark, notifications and your profile on the right. The side pills match in width.", TriDockHeader, false],
];

/** Each header design in a mini browser window, with the toggles the UI Lab section provides. `shippedOnly` shows just the Dock. */
export function HeaderShowcase({ signedIn, typing, phone, shippedOnly = false }: { signedIn: boolean; typing: boolean; phone: boolean; shippedOnly?: boolean }) {
  if (shippedOnly) return <MockWindow key={String(signedIn)} Header={DockHeader} signedIn={signedIn} typing={typing} phone={phone} />;
  return (
    <div className="flex flex-col gap-6">
      {DESIGNS.map(([name, summary, Header, chosen], index) => (
        <div key={name} className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5 px-1">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span><span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {name}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", chosen ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{chosen ? "Locked in" : "Concept"}</span>
            </span>
            <span className="text-xs text-muted-foreground">{summary}</span>
          </div>
          {/* Remount when signing in or out so each design starts fresh. */}
          <MockWindow key={String(signedIn)} Header={Header} signedIn={signedIn} typing={typing} phone={phone} />
        </div>
      ))}
    </div>
  );
}

function MockWindow({ Header, signedIn, typing, phone }: { Header: ComponentType<HeaderMockupProps>; signedIn: boolean; typing: boolean; phone: boolean }) {
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
        <Header
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
        </Header>
      </div>
    </motion.div>
  );
}

function MockPage({ page, typing }: { page: PageId; typing: boolean }) {
  const item = ALL_PAGES.find((entry) => entry.id === page) ?? ALL_PAGES[0];
  if (page !== "type") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-16 text-center">
        <span className={cn("flex size-14 items-center justify-center rounded-2xl", item.tile)}>
          <item.Icon className="size-7" weight="fill" aria-hidden="true" />
        </span>
        <span className="text-lg font-semibold">{item.label}</span>
        {PAGE_LINKS[page]
          ? <Link to={PAGE_LINKS[page][0]} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">{PAGE_LINKS[page][1]}<ArrowRightIcon className="size-4" aria-hidden="true" /></Link>
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
