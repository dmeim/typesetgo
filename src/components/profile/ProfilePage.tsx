import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMutation } from "convex/react";
import { ArrowLeftIcon, CaretLeftIcon, EyeIcon, UserCircleDashedIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { api } from "../../../convex/_generated/api";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { ALL_ACHIEVEMENTS, getAchievementById } from "@/lib/achievement-definitions";
import { KEYBOARD_STYLES } from "@/lib/keyboard-model";
import { toast } from "@/lib/toast-manager";
import { getTypingFontOption } from "@/lib/typing-fonts";
import { PanelLoading, SignInPrompt, StatsPanel } from "./AccountPanels";
import { AchievementsPanel } from "./AchievementsPanel";
import { FontGallery } from "./FontGallery";
import { HistoryPanel } from "./HistoryPanel";
import { ProfileSidebar, type AccountState } from "./ProfileSidebar";
import { PROFILE_BASE, paneForRoute, parseProfilePath, profilePath } from "./profile-routes";
import { isSettingsPane, sectionById, type PaneId } from "./profile-sections";
import { SectionHero } from "./SectionTiles";
import { KeyboardPanel, SoundPanel, TypingPanel } from "./settings-panels";
import { SettingsPreview } from "./SettingsPreview";
import { ThemeGallery } from "./ThemeGallery";
import { useThemeCatalog } from "./theme-catalog";
import { useProfileData } from "./useProfileData";
import { useProfileSettings } from "./useProfileSettings";

/**
 * The Profile page: your account tabs and every practice setting on the left, the open one on the right.
 * The URL picks the tab (see profile-routes.ts). Settings work signed out; account tabs ask you to sign in.
 */
export function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = parseProfilePath(location.pathname, PROFILE_BASE);
  const auth = useAppAuth();
  const account = useAccount();
  const clerkId = auth.isSignedIn && account.status === "ready" ? auth.user?.id ?? null : null;
  const ownId = clerkId ? account.userId : null;
  const authPending = auth.status === "loading" || (auth.isSignedIn && account.status === "loading");
  const accountFailed = auth.isSignedIn && account.status === "error";

  const own = useProfileData(ownId, { clerkId, achievements: true });
  const viewingPlayer = route.kind === "player" && route.userId !== ownId && !authPending ? route.userId : null;
  const player = useProfileData(viewingPlayer);
  const prefs = useProfileSettings();
  const themes = useThemeCatalog();
  const recheckAchievements = useMutation(api.achievements.recheckAllAchievements);
  const [mobileDetail, setMobileDetail] = useState(true);

  const pane = paneForRoute(route);
  const { settings } = prefs;
  const themeName = themes?.find((theme) => theme.id === prefs.theme.themeId)?.name ?? prefs.themeName;
  const earnedTotal = own.earned ? Object.keys(own.earned).filter((id) => getAchievementById(id)).length : undefined;

  const summary: Partial<Record<PaneId, string>> = {
    stats: own.stats ? (own.stats.totalTests > 0 ? `${own.stats.bestWpm} best` : "No tests yet") : undefined,
    history: own.stats ? `${own.stats.totalTests.toLocaleString()} tests` : undefined,
    achievements: earnedTotal === undefined ? undefined : `${earnedTotal} / ${ALL_ACHIEVEMENTS.length}`,
    theme: themeName,
    text: `${getTypingFontOption(settings.typingFontFamily).label} · ${settings.typingFontSize}rem`,
    typing: settings.ghostWriterEnabled ? "Ghost on" : `${settings.linePreview} ${settings.linePreview === 1 ? "line" : "lines"}`,
    sound: settings.soundEnabled ? "On" : "Off",
    keyboard: settings.showOnScreenKeyboard ? KEYBOARD_STYLES.find((style) => style.value === settings.keyboardStyle)?.name : "Off",
  };

  // A signed-in player whose account row failed to load still sees their tabs; each explains the problem.
  const accountState: AccountState = ownId || accountFailed
    ? { kind: "signed-in", user: own.user ?? undefined, streak: own.streak }
    : authPending ? { kind: "pending" } : { kind: "signed-out" };

  const open = (id: PaneId) => {
    setMobileDetail(true);
    if (id !== "stats") return navigate(profilePath(PROFILE_BASE, { kind: "tab", tab: id }));
    navigate(profilePath(PROFILE_BASE, ownId ? { kind: "player", userId: ownId } : { kind: "own" }));
  };

  const refreshAchievements = useCallback(async () => {
    if (!clerkId) return;
    const result = await recheckAchievements({ clerkId });
    if (result?.pending) toast.add({ type: "info", title: "Achievement refresh started", description: "Your history is being checked. Awards update automatically." });
  }, [clerkId, recheckAchievements]);

  const progress = useMemo(() => ({
    bestWpm: own.stats?.bestWpm,
    totalWordsTyped: own.stats?.totalWordsTyped,
    totalTimeTypedMs: own.stats?.totalTimeTyped,
    totalTests: own.stats?.totalTests,
    longestStreak: own.streak?.longestStreak,
  }), [own.stats, own.streak]);

  // Signed in, /profile becomes /profile/:yourId so the address bar always holds a shareable link.
  if (route.kind === "own" && ownId) {
    return <Navigate replace to={`${profilePath(PROFILE_BASE, { kind: "player", userId: ownId })}${location.search}`} />;
  }

  const yourPane = (content: () => ReactNode) => {
    if (authPending) return <PanelLoading label="Loading your profile" />;
    if (accountFailed) return <AccountProblem message={account.error} />;
    if (!ownId) return <SignInPrompt pane={pane as "stats" | "history" | "achievements"} />;
    if (own.user === null) return <MissingPlayer />;
    return content();
  };

  let content: ReactNode;
  if (viewingPlayer) {
    content = player.user === null ? <MissingPlayer /> : !player.user || !player.stats || !player.results ? <PanelLoading label="Loading profile" /> : (
      <>
        <ViewingBanner username={player.user.username} signedIn={!!ownId} onBack={() => open("stats")} />
        <StatsPanel user={player.user} stats={player.stats} results={player.results} />
      </>
    );
  } else if (pane === "stats") {
    content = yourPane(() => !own.user || !own.stats || !own.results ? <PanelLoading label="Loading your stats" />
      : <StatsPanel user={own.user} stats={own.stats} results={own.results} streak={own.streak} />);
  } else if (pane === "history") {
    content = yourPane(() => !own.stats || !own.results ? <PanelLoading label="Loading your history" />
      : <HistoryPanel results={own.results} averageWpm={own.stats.averageWpm} bestWpm={own.stats.bestWpm} clerkId={clerkId} />);
  } else if (pane === "achievements") {
    content = yourPane(() => !own.earned ? <PanelLoading label="Loading your achievements" />
      : <AchievementsPanel earned={own.earned} progress={progress} onRefresh={refreshAchievements} />);
  } else if (pane === "theme") {
    content = <ThemeGallery selection={prefs.theme} onSelect={prefs.selectTheme} />;
  } else if (pane === "text") {
    content = (
      <>
        <SectionHero section={sectionById("text")} />
        <FontGallery settings={settings} update={prefs.update} />
      </>
    );
  } else {
    content = (
      <div className="flex max-w-3xl flex-col gap-6">
        <SectionHero section={sectionById(pane)} />
        {pane === "typing" && <TypingPanel settings={settings} update={prefs.update} />}
        {pane === "sound" && <SoundPanel settings={settings} update={prefs.update} />}
        {pane === "keyboard" && <KeyboardPanel settings={settings} update={prefs.update} />}
      </div>
    );
  }

  const settingsPane = isSettingsPane(pane) && !viewingPlayer ? pane : null;

  return (
    // Phones stack the list over the open tab; from md up the sidebar sits beside a column that ends in the site footer.
    <div className="flex min-w-0 flex-1 flex-col md:flex-row">
      <ProfileSidebar
        account={accountState}
        active={viewingPlayer ? null : pane}
        summary={summary}
        onOpen={open}
        hiddenOnPhone={mobileDetail}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main id="profile-content" tabIndex={-1} className={`min-w-0 flex-1 px-4 pb-16 pt-[calc(var(--profile-header,0px)+1.5rem)] outline-none md:px-6 xl:px-8 ${mobileDetail ? "block" : "hidden md:block"}`}>
          <button type="button" onClick={() => setMobileDetail(false)} className="mb-4 flex items-center gap-1 text-sm text-primary md:hidden">
            <CaretLeftIcon className="size-4" aria-hidden="true" />All profile sections
          </button>
          {settingsPane === "theme" && prefs.themeError && (
            <p role="alert" className="mb-4 flex items-center gap-2 rounded-2xl border border-destructive/40 px-4 py-3 text-sm text-destructive">
              <WarningCircleIcon className="size-5 shrink-0" aria-hidden="true" />{prefs.themeError}
            </p>
          )}
          <div className="mx-auto flex max-w-[110rem] flex-col gap-6 xl:flex-row xl:items-start">
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={viewingPlayer ?? pane}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  className="flex flex-col gap-6"
                >
                  {content}
                </motion.div>
              </AnimatePresence>
            </div>
            {settingsPane && (
              <SettingsPreview settings={settings} theme={prefs.theme} themeName={themeName} fallbackColors={prefs.colors} active={settingsPane} />
            )}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

function ViewingBanner({ username, signedIn, onBack }: { username: string; signedIn: boolean; onBack: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      <EyeIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <span className="min-w-48 flex-1">You’re viewing <strong className="[overflow-wrap:anywhere]">{username}</strong>’s public profile. Only these stats are public.</span>
      {signedIn && (
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
          <ArrowLeftIcon className="size-4" aria-hidden="true" />Your profile
        </button>
      )}
    </div>
  );
}

function MissingPlayer() {
  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-14 text-center">
      <UserCircleDashedIcon className="size-14 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-2xl font-bold">We couldn’t find that player</h2>
      <p className="max-w-sm text-sm text-muted-foreground">The link may be old, or the account was deleted.</p>
      <Link to="/leaderboard" className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
        <ArrowLeftIcon className="size-4" aria-hidden="true" />Back to the leaderboard
      </Link>
    </section>
  );
}

function AccountProblem({ message }: { message: string | null }) {
  return (
    <section role="alert" className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-14 text-center">
      <WarningCircleIcon className="size-12 text-destructive" aria-hidden="true" />
      <h2 className="text-2xl font-bold">Your account didn’t load</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{message ?? "Reload the page to try again."} Your settings still work and save on this device.</p>
    </section>
  );
}
