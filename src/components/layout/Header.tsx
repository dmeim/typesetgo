import { Link, useLocation } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTheme } from "@/hooks/useTheme";
import type { LegacyTheme } from "@/types/theme";
import { UserButton } from "@/components/auth";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { Sun, Moon, Keyboard, Flag, GraduationCap, Palette } from "lucide-react";

interface HeaderProps {
  hidden?: boolean;
  onOpenThemeModal?: () => void;
}

const NAV_TABS = [
  { label: "Type", path: "/", icon: Keyboard },
  { label: "Race", path: "/race", icon: Flag },
  { label: "Lessons", path: "/lessons", icon: GraduationCap },
] as const;

export default function Header({
  hidden = false,
  onOpenThemeModal,
}: HeaderProps) {
  const { user: clerkUser, isSignedIn, isLoaded } = useUser();
  const { legacyTheme, mode, toggleMode, supportsLightMode } = useTheme();
  const location = useLocation();
  
  // Determine active tab based on current path
  const getActiveTab = () => {
    if (location.pathname === "/") return "/";
    if (location.pathname.startsWith("/race")) return "/race";
    if (location.pathname.startsWith("/lessons")) return "/lessons";
    return "/"; // Default to Type tab for other pages
  };
  
  const activeTab = getActiveTab();
  
  // Fallback theme for when context is loading
  const theme: LegacyTheme = legacyTheme ?? {
    cursor: "#3cb5ee",
    defaultText: "#4b5563",
    upcomingText: "#4b5563",
    correctText: "#d1d5db",
    incorrectText: "#ef4444",
    ghostCursor: "#a855f7",
    buttonUnselected: "#3cb5ee",
    buttonSelected: "#0097b2",
    accentColor: "#a855f7",
    accentMuted: "rgba(168, 85, 247, 0.3)",
    accentSubtle: "rgba(168, 85, 247, 0.1)",
    backgroundColor: "#323437",
    surfaceColor: "#2c2e31",
    elevatedColor: "#37383b",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    textPrimary: "#d1d5db",
    textSecondary: "#4b5563",
    textMuted: "rgba(75, 85, 99, 0.6)",
    textInverse: "#ffffff",
    borderDefault: "rgba(75, 85, 99, 0.3)",
    borderSubtle: "rgba(75, 85, 99, 0.15)",
    borderFocus: "#3cb5ee",
    statusSuccess: "#22c55e",
    statusSuccessMuted: "rgba(34, 197, 94, 0.3)",
    statusError: "#ef4444",
    statusErrorMuted: "rgba(239, 68, 68, 0.3)",
    statusWarning: "#f59e0b",
    statusWarningMuted: "rgba(245, 158, 11, 0.3)",
  };
  
  // Fetch current user's Convex ID for stats link
  const accountFeaturesEnabled = isLoaded && isSignedIn;
  const convexUser = useQuery(
    api.users.getUser,
    accountFeaturesEnabled && clerkUser ? { clerkId: clerkUser.id } : "skip"
  );

  const statsUrl = convexUser?._id ? `/user/${convexUser._id}` : null;
  const isStatsEnabled = accountFeaturesEnabled && Boolean(statsUrl);

  return (
    <header className="absolute top-0 inset-x-0 p-4 md:p-6 z-50 flex items-center justify-between transition-opacity duration-300 pointer-events-none" style={{ opacity: hidden ? 0 : 1 }}>
      {/* Logo */}
      <div className={`w-[200px] md:w-[450px] ${hidden ? "" : "pointer-events-auto"}`}>
        <Link to="/">
          <img
            src="/assets/Banner-Color.svg"
            alt="TypeSetGo"
            className="w-full h-auto"
          />
        </Link>
      </div>

      {/* Navigation Tabs - Centered on page */}
      <nav 
        className={`absolute left-1/2 -translate-x-1/2 ${hidden ? "" : "pointer-events-auto"}`}
      >
        <div 
          className="flex items-center gap-1 rounded-lg p-1"
          style={{ backgroundColor: theme.surfaceColor }}
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.path;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: isActive ? theme.elevatedColor : "transparent",
                  color: isActive ? theme.buttonSelected : theme.buttonUnselected,
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

      {/* Action Buttons */}
      <div className={`flex items-center gap-3 ${hidden ? "" : "pointer-events-auto"}`}>
        {/* Connect - temporarily hidden while feature is in development
        <Link
          to="/connect"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
          style={{ color: theme.buttonUnselected }}
          title="Multiplayer"
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
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </Link>
        */}

        {/* Light/Dark Mode Toggle */}
        <button
          onClick={supportsLightMode ? toggleMode : undefined}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
            supportsLightMode ? "hover:bg-gray-800/50 cursor-pointer" : "opacity-40 cursor-not-allowed"
          }`}
          style={{ color: supportsLightMode ? theme.buttonUnselected : theme.textMuted }}
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

        {/* Theme Picker */}
        {onOpenThemeModal && (
          <button
            onClick={onOpenThemeModal}
            className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
            style={{ color: theme.buttonUnselected }}
            title="Change Theme"
          >
            <Palette className="w-5 h-5" />
          </button>
        )}

        {/* Leaderboard */}
        <Link
          to="/leaderboard"
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
          style={{ color: theme.buttonUnselected }}
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
            style={{ color: theme.buttonUnselected }}
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
            style={{ color: theme.textMuted }}
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
