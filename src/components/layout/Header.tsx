import { Link, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { UserButton } from "@/components/auth";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { Sun, Moon, Keyboard, Flag, GraduationCap, Palette } from "lucide-react";

interface HeaderProps {
  hidden?: boolean;
  onOpenThemeModal?: () => void;
  onOpenSettings?: () => void;
}

const NAV_TABS = [
  { label: "Type", path: "/", icon: Keyboard, enabled: true },
  { label: "Race", path: "/race", icon: Flag, enabled: false },
  { label: "Lessons", path: "/lessons", icon: GraduationCap, enabled: false },
] as const;

export default function Header({
  hidden = false,
  onOpenThemeModal,
  onOpenSettings,
}: HeaderProps) {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { mode, toggleMode, supportsLightMode } = useTheme();
  const location = useLocation();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (location.pathname === "/") return "/";
    if (location.pathname.startsWith("/race")) return "/race";
    if (location.pathname.startsWith("/lessons")) return "/lessons";
    return "/"; // Default to Type tab for other pages
  };

  const activeTab = getActiveTab();

  // Fetch current user's Convex ID for stats link
  const accountFeaturesEnabled = isLoaded && isSignedIn;
  const convexUser = useQuery(
    api.users.getUser,
    accountFeaturesEnabled && clerkUser ? { clerkId: clerkUser.id } : "skip"
  );

  const statsUrl = convexUser?._id ? `/user/${convexUser._id}` : null;
  const isStatsEnabled = accountFeaturesEnabled && Boolean(statsUrl);

  return (
    <header className="absolute top-0 inset-x-0 p-4 md:p-6 z-50 flex items-center justify-between transition-opacity duration-300 pointer-events-none gap-2" style={{ opacity: hidden ? 0 : 1 }}>
      {/* Left Section: Logo + Settings + Theme + Light/Dark */}
      <div className={`flex items-center gap-4 shrink-0 ${hidden ? "" : "pointer-events-auto"}`}>
        {/* Logo */}
        <Link to="/" className="w-[170px] md:w-[280px] shrink-0 md:-mr-9">
          <img
            src="/assets/Banner-Color.svg"
            alt="TypeSetGo"
            className="w-full h-auto"
          />
        </Link>

        <div className="flex items-center gap-2">
          {/* Settings */}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
              style={{ color: tv.interactive.primary.DEFAULT }}
              title="Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          {/* Theme Picker */}
          {onOpenThemeModal && (
            <button
              onClick={onOpenThemeModal}
              className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
              style={{ color: tv.interactive.primary.DEFAULT }}
              title="Change Theme"
            >
              <Palette className="w-5 h-5" />
            </button>
          )}

          {/* Light/Dark Mode Toggle */}
          <button
            onClick={supportsLightMode ? toggleMode : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
              supportsLightMode ? "hover:bg-gray-800/50 cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
            style={{ color: supportsLightMode ? tv.interactive.primary.DEFAULT : tv.text.muted }}
            title={
              supportsLightMode
                ? `Switch to ${mode === "dark" ? "light" : "dark"} mode`
                : "This theme doesn't support light mode"
            }
            disabled={!supportsLightMode}
          >
            {mode === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Center Section: Navigation Tabs (page-centered) */}
      <nav
        className={`absolute left-1/2 -translate-x-1/2 ${hidden ? "" : "pointer-events-auto"}`}
      >
        <div
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ backgroundColor: tv.bg.surface }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.path;
            const Icon = tab.icon;
            const isDisabled = !tab.enabled;

            if (isDisabled) {
              return (
                <span
                  key={tab.path}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed select-none"
                  style={{
                    backgroundColor: "transparent",
                    color: tv.text.muted,
                    opacity: 0.5,
                  }}
                  title="Coming Soon"
                  aria-disabled="true"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{tab.label}</span>
                </span>
              );
            }

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: isActive ? tv.bg.elevated : "transparent",
                  color: isActive ? tv.interactive.secondary.DEFAULT : tv.interactive.primary.DEFAULT,
                  boxShadow: isActive ? "0 1px 3px rgba(0, 0, 0, 0.2)" : "none",
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right Section: Leaderboard + Stats + Notifications + User */}
      <div className={`flex items-center gap-2 shrink-0 ${hidden ? "" : "pointer-events-auto"}`}>
        {/* Leaderboard */}
        <Link
          to="/leaderboard"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
          style={{ color: tv.interactive.primary.DEFAULT }}
          title="Leaderboard"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>
        </Link>

        {/* Stats */}
        {isStatsEnabled ? (
          <Link
            to={statsUrl as string}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
            style={{ color: tv.interactive.primary.DEFAULT }}
            title="Your Stats"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="M7 16h8" />
              <path d="M7 11h12" />
              <path d="M7 6h3" />
            </svg>
          </Link>
        ) : (
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg opacity-40 cursor-not-allowed"
            style={{ color: tv.text.muted }}
            title={accountFeaturesEnabled ? "Loading your stats" : "Sign in to view your stats"}
            disabled
            aria-disabled="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v16a2 2 0 0 0 2 2h16" />
              <path d="M7 16h8" />
              <path d="M7 11h12" />
              <path d="M7 6h3" />
            </svg>
          </button>
        )}

        {/* Notification Center */}
        <NotificationCenter disabled={!accountFeaturesEnabled} />

        {/* User Button - Sign In / Avatar Dropdown */}
        <UserButton />
      </div>
    </header>
  );
}
