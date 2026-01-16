import { Link } from "react-router-dom";
import type { Theme } from "@/lib/typing-constants";
import { UserButton } from "@/components/auth";

interface HeaderProps {
  theme: Theme;
  onShowSettings: () => void;
  onShowTheme: () => void;
  onShowStats: () => void;
  onShowLeaderboard: () => void;
  hidden?: boolean;
}

export default function Header({
  theme,
  onShowSettings,
  onShowTheme,
  onShowStats,
  onShowLeaderboard,
  hidden = false,
}: HeaderProps) {
  return (
    <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-50 flex items-center justify-between transition-opacity duration-300" style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? "none" : "auto" }}>
      {/* Logo */}
      <div className="w-[200px] md:w-[400px]">
        <Link to="/">
          <img
            src="/assets/Banner-Color.svg"
            alt="TypeSetGo"
            className="w-full h-auto"
          />
        </Link>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
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

        {/* Leaderboard */}
        <button
          type="button"
          onClick={onShowLeaderboard}
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
        </button>

        {/* Theme */}
        <button
          type="button"
          onClick={onShowTheme}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
          style={{ color: theme.buttonUnselected }}
          title="Theme"
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
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" stroke="none" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" stroke="none" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
          </svg>
        </button>

        {/* Settings */}
        <button
          type="button"
          onClick={onShowSettings}
          className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-gray-800/50"
          style={{ color: theme.buttonUnselected }}
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

        {/* User Button - Sign In / Avatar Dropdown */}
        <UserButton theme={theme} onShowStats={onShowStats} />
      </div>
    </header>
  );
}
