import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRightIcon, CaretRightIcon, MagnifyingGlassIcon, MegaphoneIcon, SidebarSimpleIcon, XIcon } from "@phosphor-icons/react";
import { AccountCard, SignInButton, type ProfileStreak, type ProfileUser } from "./AccountPanels";
import { ACCOUNT_SECTIONS, PROFILE_SPRING, SETTING_GROUPS, searchSettings, sectionById, type PaneId } from "./profile-sections";
import { IconTile } from "./SectionTiles";

const ACCOUNT_GROUP: PaneId[] = ACCOUNT_SECTIONS.map((section) => section.id);

export type AccountState =
  | { kind: "signed-in"; user: ProfileUser | undefined; streak: ProfileStreak | null | undefined }
  | { kind: "pending" }
  | { kind: "signed-out" };

interface ProfileSidebarProps {
  account: AccountState;
  /** The open tab, or null while someone else's profile is open (none of your tabs is current). */
  active: PaneId | null;
  summary: Partial<Record<PaneId, string>>;
  onOpen: (id: PaneId) => void;
  /** Phones show the list or the open tab, never both. */
  hiddenOnPhone: boolean;
  /** Pinned under the tabs, e.g. a future Changelog button. */
  footer?: ReactNode;
}

/** Fades the list's top or bottom edge only while rows are hidden past it, so a cut-off list reads as scrollable. */
function useEdgeFade(scroller: RefObject<HTMLElement | null>): CSSProperties | undefined {
  const [edges, setEdges] = useState({ top: false, bottom: false });
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const measure = () => {
      const top = element.scrollTop > 1;
      const bottom = element.scrollTop + element.clientHeight < element.scrollHeight - 1;
      setEdges((current) => (current.top === top && current.bottom === bottom ? current : { top, bottom }));
    };
    measure();
    element.addEventListener("scroll", measure, { passive: true });
    const resize = new ResizeObserver(measure);
    resize.observe(element);
    // Rows come and go with search, sign-in and the account card, which changes the content height.
    const mutations = new MutationObserver(measure);
    mutations.observe(element, { childList: true, subtree: true });
    return () => {
      element.removeEventListener("scroll", measure);
      resize.disconnect();
      mutations.disconnect();
    };
  }, [scroller]);
  if (!edges.top && !edges.bottom) return undefined;
  const mask = `linear-gradient(to bottom, ${edges.top ? "transparent 0, black 1.5rem" : "black 0"}, ${edges.bottom ? "black calc(100% - 2.5rem), transparent 100%" : "black 100%"})`;
  return { maskImage: mask, WebkitMaskImage: mask };
}

/** iPadOS-style sidebar: your account, then every setting, with search. Folds into an icon rail on desktop. */
export function ProfileSidebar({ account, active, summary, onOpen, hiddenOnPhone, footer }: ProfileSidebarProps) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const fade = collapsed ? "md:pointer-events-none md:opacity-0" : "";
  const matches = searchSettings(query);
  const searching = query.trim() !== "";
  const groups: PaneId[][] = account.kind === "signed-in" ? [ACCOUNT_GROUP, ...SETTING_GROUPS] : SETTING_GROUPS;
  const scroller = useRef<HTMLDivElement>(null);
  const edgeFade = useEdgeFade(scroller);

  return (
    <aside
      aria-label="Profile"
      className={`w-full shrink-0 flex-col gap-4 overflow-x-hidden border-border pb-4 pt-[calc(var(--profile-header,0px)+1.5rem)] transition-[width,padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:sticky md:top-0 md:z-40 md:flex md:h-dvh md:border-r md:bg-[color-mix(in_oklab,var(--card)_40%,var(--background))] ${collapsed ? "px-4 md:w-[4.75rem] md:px-3" : "px-4 md:w-72"} ${hiddenOnPhone ? "hidden" : "flex"}`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden size-12 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:flex"
        >
          <SidebarSimpleIcon className="size-5" aria-hidden="true" />
        </button>
        <h1 className={`whitespace-nowrap px-2 text-3xl font-bold transition-opacity duration-200 md:px-0 ${fade}`}>Profile</h1>
      </div>
      <label className={`flex items-center gap-2 rounded-xl bg-muted/60 py-2 text-sm text-muted-foreground transition-[padding] duration-300 focus-within:outline-2 focus-within:outline-ring ${collapsed ? "px-3 md:px-[1.0625rem]" : "px-3"}`}>
        <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden="true" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setCollapsed(false)} placeholder="Search settings" aria-label="Search settings" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
        {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><XIcon className="size-3.5" aria-hidden="true" /></button>}
      </label>

      <div ref={scroller} style={edgeFade} className="-mx-1 flex min-h-0 flex-1 flex-col px-1 md:overflow-y-auto">
        <AnimatePresence mode="popLayout" initial={false}>
          {searching ? (
            <motion.div key="results" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-1">
              {matches.length === 0 && <p role="status" className="px-2 text-sm text-muted-foreground">No settings match “{query.trim()}”.</p>}
              {matches.map((entry) => {
                const section = sectionById(entry.section);
                return (
                  <button key={entry.id} type="button" onClick={() => { onOpen(entry.section); setQuery(""); }} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
                    <IconTile section={section} small />
                    <span className="flex-1 text-sm">{entry.label}</span>
                    <span className="text-xs text-muted-foreground">{section.title}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.nav key="list" aria-label="Profile sections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-4 pb-2">
              <AnimatePresence mode="popLayout" initial={false}>
                {account.kind === "signed-in" && (
                  <AccountCard key="account" user={account.user} streak={account.streak} collapsed={collapsed} fade={fade} selected={active === "stats"} onOpen={() => onOpen("stats")} />
                )}
                {account.kind === "signed-out" && <SignInButton key="sign-in" collapsed={collapsed} fade={fade} />}
                {account.kind === "pending" && <motion.div key="pending" aria-hidden="true" className="h-[4.5rem] animate-pulse rounded-2xl bg-muted" />}
              </AnimatePresence>
              {groups.map((group) => (
                <motion.div layout transition={PROFILE_SPRING} key={group.join("-")} className="flex flex-col gap-0.5">
                  {group.map((id) => {
                    const section = sectionById(id);
                    const selected = active === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => onOpen(id)}
                        title={collapsed ? section.title : undefined}
                        className={`relative flex items-center gap-3 rounded-xl py-2 text-left transition-[padding] duration-300 focus-visible:outline-2 focus-visible:outline-ring ${collapsed ? "px-2 md:px-2.5" : "px-2"}`}
                      >
                        {selected && <motion.span layoutId="profile-active-tab" transition={PROFILE_SPRING} className="absolute inset-0 hidden rounded-xl bg-accent md:block" />}
                        <IconTile section={section} />
                        <span className={`relative flex min-w-0 flex-1 items-center gap-3 whitespace-nowrap transition-opacity duration-200 ${fade}`}>
                          <span className="flex-1 text-sm">{section.title}</span>
                          {summary[id] && <motion.span key={summary[id]} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="max-w-28 truncate text-xs text-muted-foreground">{summary[id]}</motion.span>}
                        </span>
                        <CaretRightIcon className="relative size-3.5 text-muted-foreground md:hidden" aria-hidden="true" />
                      </button>
                    );
                  })}
                </motion.div>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
      {footer && <div className={`shrink-0 transition-opacity duration-200 ${fade}`}>{footer}</div>}
      <ChangelogLink collapsed={collapsed} fade={fade} />
    </aside>
  );
}

/** Pinned under the tabs; opens the full /changelog page instead of a pane. */
function ChangelogLink({ collapsed, fade }: { collapsed: boolean; fade: string }) {
  return (
    <div className="shrink-0 border-t border-border pt-4">
      <Link
        to="/changelog"
        title={collapsed ? "Changelog" : undefined}
        className={`group relative flex items-center gap-3 rounded-xl py-2 text-left transition-[padding,background-color] duration-300 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring ${collapsed ? "px-2 md:px-2.5" : "px-2"}`}
      >
        <span className="relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--accent-emphasis) text-background">
          <MegaphoneIcon weight="fill" className="size-[18px]" aria-hidden="true" />
        </span>
        <span className={`relative flex min-w-0 flex-1 items-center gap-3 whitespace-nowrap transition-opacity duration-200 ${fade}`}>
          <span className="flex-1 text-sm">Changelog</span>
          <span className="text-xs text-muted-foreground">What's new</span>
        </span>
        <ArrowUpRightIcon className={`relative size-3.5 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${fade}`} aria-hidden="true" />
      </Link>
    </div>
  );
}
