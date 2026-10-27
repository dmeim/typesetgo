import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import { DesktopIcon, DeviceMobileIcon, FileTextIcon, HouseIcon, KeyboardIcon, LockSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { LAB_SPRING } from "@/components/temp/settings/lab-settings";
import { DockHeader } from "@/components/temp/header/DockHeader";
import { NOTIFICATIONS, type PageId } from "@/components/temp/header/header-mock";
import { BigFooter } from "./BigFooter";
import { FooterDock } from "./FooterDock";
import { InfoButton } from "./InfoButton";
import { InfoTabs } from "./InfoTabs";
import { QuietLine } from "./QuietLine";
import { linkById, type StageRoute } from "./footer-mock";
import { StageContext, type StageValue } from "./footer-stage";

interface Concept {
  name: string;
  summary: string;
  home: string;
  info: string;
  Component: ComponentType;
}

const CONCEPTS: Concept[] = [
  {
    name: "Quiet line",
    summary: "One small centred line of links with dots between them, and the version and GitHub under it on other pages.",
    home: "Fades back while you type and lights up again when you point at it. On phones the dots go away and the links simply wrap.",
    info: "A centred hero like What's new, then the sections as a row of chips that sticks to the top while you scroll.",
    Component: QuietLine,
  },
  {
    name: "Footer dock",
    summary: "A small pill at the bottom that matches the Dock at the top, with an icon and name for each link.",
    home: "Loses its card and sinks a little while you type. On phones each link stacks its name under its icon.",
    info: "A sidebar like Profile's: About, Privacy and Terms as coloured tiles with the open page's sections under it, and What's new pinned at the bottom. On phones the sections fold into one button.",
    Component: FooterDock,
  },
  {
    name: "Info button",
    summary: "Privacy and Terms sit in the bottom corner beside an \"i\" button that opens About, What's new, the theme, the version and GitHub.",
    home: "The corner fades while you type but Privacy and Terms always stay readable. Only two links, so it never wraps.",
    info: "Reads like an article: one column, a reading bar across the top, and a Contents button in the other corner.",
    Component: InfoButton,
  },
  {
    name: "Big footer",
    summary: "A full footer with columns (Practice, Info, Project) on every page except Home, which gets one small line.",
    home: "One line: copyright and version on the left, links on the right. While typing it dims and the copyright steps out.",
    info: "A banner card with the three pages as chips, then a numbered contents rail with a bar that follows you down the page.",
    Component: BigFooter,
  },
  {
    name: "Info tabs",
    summary: "A thin status bar along the bottom edge, like a code editor: version and theme on the left, links on the right.",
    home: "While typing the version and theme step out and the links dim; the bar keeps its place.",
    info: "About, Privacy and Terms become tabs under one header that swap in place, with a contents list on the right (a jump menu on phones).",
    Component: InfoTabs,
  },
];

const DOCK_PATHS: Record<PageId, string> = { type: "/", race: "/race", lessons: "/lessons", connect: "/connect", leaderboard: "/leaderboard", theme: "/profile/theme", settings: "/profile/text" };

// The Dock highlights nothing on info pages or the changelog; this id matches no dock item.
const NO_DOCK_PAGE = "none" as PageId;

function pathOf(route: StageRoute) {
  if (route.kind === "home") return "/";
  if (route.kind === "page") return DOCK_PATHS[route.id];
  return linkById(route.kind === "changelog" ? "changelog" : route.id).path;
}

/** Five footer and info page concepts in a pretend browser, with Desktop/Phone frames and Home/Info page views. */
export function FooterShowcase() {
  const [index, setIndex] = useState(0);
  const [phone, setPhone] = useState(false);
  const [route, setRoute] = useState<StageRoute>({ kind: "home" });
  const [typing, setTyping] = useState(false);
  const [dark, setDark] = useState(true);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const scroller = useRef<HTMLDivElement | null>(null);
  const concept = CONCEPTS[index];
  const path = pathOf(route);
  const home = route.kind === "home";
  const typingNow = home && typing;

  // Every new page starts at the top of the pretend browser.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [path, index, phone]);

  const stage = useMemo<StageValue>(() => ({ route, go: setRoute, typing: typingNow, phone, scroller }), [route, typingNow, phone]);
  const goDock = (id: PageId) => setRoute(id === "type" ? { kind: "home" } : { kind: "page", id });
  const dockPage = home ? "type" : route.kind === "page" ? route.id : NO_DOCK_PAGE;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Toggle label="Concept">
          {CONCEPTS.map((item, position) => (
            <Choice key={item.name} group="concept" pressed={index === position} onClick={() => setIndex(position)}>
              <span className="text-muted-foreground">{String(position + 1).padStart(2, "0")}</span> {item.name}
            </Choice>
          ))}
        </Toggle>
        <div className="flex flex-wrap items-center gap-2">
          <Toggle label="Frame">
            <Choice group="frame" pressed={!phone} onClick={() => setPhone(false)}><DesktopIcon className="size-3.5" aria-hidden="true" />Desktop</Choice>
            <Choice group="frame" pressed={phone} onClick={() => setPhone(true)}><DeviceMobileIcon className="size-3.5" aria-hidden="true" />Phone</Choice>
          </Toggle>
          <Toggle label="View">
            <Choice group="view" pressed={home} onClick={() => setRoute({ kind: "home" })}><HouseIcon className="size-3.5" aria-hidden="true" />Home</Choice>
            <Choice group="view" pressed={route.kind === "info"} onClick={() => setRoute({ kind: "info", id: route.kind === "info" ? route.id : "privacy" })}><FileTextIcon className="size-3.5" aria-hidden="true" />Info page</Choice>
          </Toggle>
          <button
            type="button"
            aria-pressed={typingNow}
            disabled={!home}
            onClick={() => setTyping((value) => !value)}
            title={home ? undefined : "Typing only applies on Home"}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            <KeyboardIcon className="size-3.5" aria-hidden="true" />Typing
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1 px-1 text-sm text-muted-foreground">
        <p><span className="font-semibold text-foreground">{concept.name}.</span> {concept.summary}</p>
        <p><span className="font-medium text-foreground">On Home:</span> {concept.home}</p>
        <p><span className="font-medium text-foreground">Info pages:</span> {concept.info}</p>
        <p className="text-xs">Footer links open the page right inside the frame. Off-site links (GitHub) do nothing here.</p>
      </div>

      <motion.div layout transition={LAB_SPRING} className={cn("mx-auto w-full min-w-0 overflow-hidden rounded-3xl border border-border bg-background shadow-sm", phone && "max-w-[375px]")}>
        <div aria-hidden="true" className="flex items-center gap-1.5 border-b border-border/60 bg-muted/40 px-3 py-2">
          <span className="size-2.5 shrink-0 rounded-full bg-destructive/60" />
          <span className="size-2.5 shrink-0 rounded-full bg-warning/60" />
          <span className="size-2.5 shrink-0 rounded-full bg-success/60" />
          <span className="ml-2 flex min-w-0 items-center gap-1 truncate rounded-full bg-background px-3 py-0.5 text-[11px] text-muted-foreground">
            <LockSimpleIcon className="size-3 shrink-0" />typesetgo.app{path}
          </span>
        </div>
        <div ref={scroller} className="@container relative h-[36rem] overflow-y-auto overflow-x-hidden overscroll-contain">
          <StageContext.Provider value={stage}>
            <div className="flex min-h-full flex-col">
              <DockHeader
                signedIn
                typing={typingNow}
                page={dockPage}
                go={goDock}
                dark={dark}
                toggleDark={() => setDark((value) => !value)}
                notifications={notifications}
                readAll={() => setNotifications((items) => items.map((item) => ({ ...item, unread: false })))}
              >
                <concept.Component key={index} />
              </DockHeader>
            </div>
          </StageContext.Provider>
        </div>
      </motion.div>
    </div>
  );
}

function Toggle({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">{children}</div>;
}

function Choice({ group, pressed, onClick, children }: { group: string; pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:text-foreground"
    >
      {pressed && <motion.span layoutId={`footer-lab-${group}`} transition={LAB_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
      <span className="relative flex items-center gap-1.5">{children}</span>
    </button>
  );
}
