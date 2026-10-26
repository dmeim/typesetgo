import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CaretLeftIcon, CaretRightIcon, MagnifyingGlassIcon, SidebarSimpleIcon, XIcon } from "@phosphor-icons/react";
import ThemeSitePreview from "@/components/typing/ThemeSitePreview";
import { getTypingFontOption } from "@/lib/typing-fonts";
import { AccountCard, SignInButton, StatsPanel } from "./AccountPanels";
import { AchievementsPanel } from "./AchievementMockups";
import { FontGallery } from "./FontGallery";
import { HistoryPanel } from "./HistoryMockups";
import { KeyboardPanel, LabSwitch, SoundPanel, TypingPanel } from "./LabControls";
import { RealTextPreview } from "./RealTextPreview";
import { ThemeGallery } from "./ThemeGallery";
import { ACCOUNT_SECTIONS, LAB_SPRING, SECTIONS, SETTING_INDEX, type PaneId, type SectionId, type SectionMeta } from "./lab-settings";
import { MOCK_ACHIEVEMENT_TOTALS, MOCK_STATS } from "./mock-profile";
import { useThemeCatalog, useThemeColors, type LabState } from "./useLabSettings";

const SETTING_GROUPS: SectionId[][] = [["theme"], ["text", "typing"], ["sound", "keyboard"]];
const ACCOUNT_GROUP: PaneId[] = ACCOUNT_SECTIONS.map((section) => section.id);
const sectionById = (id: PaneId) => [...SECTIONS, ...ACCOUNT_SECTIONS].find((section) => section.id === id) as SectionMeta;
const isSettingsPane = (id: PaneId): id is SectionId => SECTIONS.some((section) => section.id === id);

/** Mockup 1: iPadOS-style split view. Your account pages and every setting on the left, the chosen one on the right. */
export function SplitViewSettings({ lab }: { lab: LabState }) {
  const [active, setActive] = useState<PaneId>("theme");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [query, setQuery] = useState("");
  // Desktop only: the sidebar folds into an icon rail; phones keep the list/detail flow.
  const [collapsed, setCollapsed] = useState(false);
  // Mockup only: the fixture cannot sign in, so the account tabs use mock data behind this switch.
  const [signedIn, setSignedIn] = useState(true);
  const fade = collapsed ? "md:pointer-events-none md:opacity-0" : "";
  const themes = useThemeCatalog();
  const themeEntry = themes?.find((theme) => theme.id === lab.theme.themeId);
  const { settings } = lab;

  const summary: Record<PaneId, string> = {
    stats: `${MOCK_STATS.bestWpm} best`,
    history: `${MOCK_STATS.totalTests} tests`,
    achievements: `${MOCK_ACHIEVEMENT_TOTALS.earned} / ${MOCK_ACHIEVEMENT_TOTALS.total}`,
    theme: themeEntry?.name ?? "…",
    text: `${getTypingFontOption(settings.typingFontFamily).label} · ${settings.typingFontSize}rem`,
    typing: settings.ghostWriterEnabled ? "Ghost on" : `${settings.linePreview} lines`,
    sound: settings.soundEnabled ? "On" : "Off",
    keyboard: settings.showOnScreenKeyboard ? settings.keyboardLayout.toUpperCase() : "Off",
  };
  const groups: PaneId[][] = signedIn ? [ACCOUNT_GROUP, ...SETTING_GROUPS] : SETTING_GROUPS;
  const needle = query.trim().toLowerCase();
  const matches = needle ? SETTING_INDEX.filter((entry) => `${entry.label} ${entry.keywords}`.toLowerCase().includes(needle)) : [];
  const open = (id: PaneId) => { setActive(id); setMobileDetail(true); };
  const setSignedInPreview = (next: boolean) => {
    setSignedIn(next);
    if (!next && !isSettingsPane(active)) setActive("theme");
  };

  return (
    <div className="flex min-h-[100dvh]">
      <aside className={`w-full shrink-0 flex-col gap-5 overflow-x-hidden border-r border-border bg-card/40 pb-28 pt-6 transition-[width,padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] md:sticky md:top-0 md:flex md:h-[100dvh] md:overflow-y-auto ${collapsed ? "px-4 md:w-[4.75rem] md:px-3" : "px-4 md:w-72"} ${mobileDetail ? "hidden" : "flex"}`}>
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
          <h1 className={`whitespace-nowrap px-2 text-3xl font-bold transition-opacity duration-200 md:px-0 ${fade}`}>Settings</h1>
        </div>
        <label className={`flex items-center gap-2 rounded-xl bg-muted/60 py-2 text-sm text-muted-foreground transition-[padding] duration-300 focus-within:outline-2 focus-within:outline-ring ${collapsed ? "px-3 md:px-[1.0625rem]" : "px-3"}`}>
          <MagnifyingGlassIcon className="size-4 shrink-0" aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setCollapsed(false)} placeholder="Search" aria-label="Search settings" className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground" />
          {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><XIcon className="size-3.5" aria-hidden="true" /></button>}
        </label>

        <AnimatePresence mode="popLayout" initial={false}>
          {needle ? (
            <motion.div key="results" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="flex flex-col gap-1">
              {matches.length === 0 && <p className="px-2 text-sm text-muted-foreground">No settings match "{query}".</p>}
              {matches.map((entry) => {
                const section = sectionById(entry.section);
                return (
                  <button key={entry.id} type="button" onClick={() => { open(entry.section); setQuery(""); }} className="flex items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-accent">
                    <IconTile section={section} small />
                    <span className="flex-1 text-sm">{entry.label}</span>
                    <span className="text-xs text-muted-foreground">{section.title}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-5">
              <AnimatePresence mode="popLayout" initial={false}>
                {signedIn
                  ? <AccountCard key="account" collapsed={collapsed} fade={fade} selected={active === "stats"} onOpen={() => open("stats")} />
                  : <SignInButton key="sign-in" collapsed={collapsed} fade={fade} />}
              </AnimatePresence>
              {groups.map((group) => (
                <motion.div layout transition={LAB_SPRING} key={group.join("-")} className="flex flex-col gap-0.5">
                  {group.map((id) => {
                    const section = sectionById(id);
                    const selected = active === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        onClick={() => open(id)}
                        title={collapsed ? section.title : undefined}
                        className={`relative flex items-center gap-3 rounded-xl py-2 text-left transition-[padding] duration-300 focus-visible:outline-2 focus-visible:outline-ring ${collapsed ? "px-2 md:px-2.5" : "px-2"}`}
                      >
                        {selected && <motion.span layoutId="split-active" transition={LAB_SPRING} className="absolute inset-0 hidden rounded-xl bg-accent md:block" />}
                        <IconTile section={section} />
                        <span className={`relative flex flex-1 items-center gap-3 whitespace-nowrap transition-opacity duration-200 ${fade}`}>
                          <span className="flex-1 text-sm">{section.title}</span>
                          <motion.span key={summary[id]} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="max-w-28 truncate text-xs text-muted-foreground">{summary[id]}</motion.span>
                        </span>
                        <CaretRightIcon className="relative size-3.5 text-muted-foreground md:hidden" aria-hidden="true" />
                      </button>
                    );
                  })}
                </motion.div>
              ))}
              <div className={`flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-3 py-2.5 transition-opacity duration-200 ${fade}`}>
                <span className="flex flex-col whitespace-nowrap">
                  <span className="text-xs font-semibold">Preview signed in</span>
                  <span className="text-[0.7rem] text-muted-foreground">Mockup only · mock data</span>
                </span>
                <LabSwitch label="Preview signed in" checked={signedIn} onChange={setSignedInPreview} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      <main className={`min-w-0 flex-1 px-4 pb-28 pt-6 md:px-6 xl:px-8 ${mobileDetail ? "block" : "hidden md:block"}`}>
        <button type="button" onClick={() => setMobileDetail(false)} className="mb-4 flex items-center gap-1 text-sm text-primary md:hidden">
          <CaretLeftIcon className="size-4" aria-hidden="true" />Settings
        </button>
        <div className="mx-auto flex max-w-[110rem] flex-col gap-6 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-col gap-6"
              >
                {active === "stats" && <StatsPanel />}
                {active === "history" && <HistoryPanel />}
                {active === "achievements" && <AchievementsPanel />}
                {active === "theme" && <ThemeGallery lab={lab} />}
                {active === "text" && <FontGallery settings={settings} update={lab.update} />}
                {(active === "typing" || active === "sound" || active === "keyboard") && (
                  <div className="flex max-w-3xl flex-col gap-6">
                    <Hero section={sectionById(active)} />
                    {active === "typing" && <TypingPanel settings={settings} update={lab.update} />}
                    {active === "sound" && <SoundPanel settings={settings} update={lab.update} />}
                    {active === "keyboard" && <KeyboardPanel settings={settings} update={lab.update} />}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          {isSettingsPane(active) && <PreviewColumn lab={lab} active={active} themeName={themeEntry?.name ?? "Theme"} />}
        </div>
      </main>
    </div>
  );
}

function IconTile({ section, small = false }: { section: SectionMeta; small?: boolean }) {
  const { Icon } = section;
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-lg ${section.tile} ${small ? "size-6" : "size-8"}`}>
      <Icon weight="fill" className={small ? "size-3.5" : "size-[18px]"} aria-hidden="true" />
    </span>
  );
}

function Hero({ section, children }: { section: SectionMeta; children?: ReactNode }) {
  const { Icon } = section;
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6">
      <span className={`flex size-14 items-center justify-center rounded-2xl ${section.tile}`}><Icon weight="fill" className="size-8" aria-hidden="true" /></span>
      <h2 className="text-2xl font-bold">{section.title}</h2>
      <p className="text-sm text-muted-foreground">{section.description}</p>
      {children}
    </div>
  );
}

/**
 * Stays put while tabs change, like the Studio preview. The preview that matters for the open tab moves to
 * the top; under xl only that one shows, above the content.
 */
function PreviewColumn({ lab, active, themeName }: { lab: LabState; active: SectionId; themeName: string }) {
  const colors = useThemeColors(lab.theme);
  const themeFirst = active === "theme";
  const site = (
    <motion.section layout key="site" transition={LAB_SPRING} aria-label="Theme preview" className={`flex flex-col gap-2 rounded-3xl border border-border bg-card p-3 ${themeFirst ? "" : "hidden xl:flex"}`}>
      <span className="px-1 text-xs text-muted-foreground">Theme preview · {themeName}{lab.theme.mode === "light" ? " · light" : ""}</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={`${lab.theme.themeId}-${lab.theme.variantId}-${lab.theme.mode}`} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {colors ? <ThemeSitePreview colors={colors} label={themeName} /> : <div className="aspect-[4/3] w-full animate-pulse rounded-md bg-muted" />}
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
  const text = (
    <motion.section layout key="text" transition={LAB_SPRING} aria-label="Text preview" className={`rounded-3xl border border-border bg-card p-3 ${themeFirst ? "hidden xl:block" : ""}`}>
      <RealTextPreview colors={colors} settings={lab.settings} />
    </motion.section>
  );
  return (
    <aside className="order-first flex w-full flex-col gap-4 xl:sticky xl:top-6 xl:order-none xl:w-[24rem] xl:shrink-0 2xl:w-[28rem]">
      {themeFirst ? <>{site}{text}</> : <>{text}{site}</>}
    </aside>
  );
}
