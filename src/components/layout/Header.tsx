import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Theme } from "@/lib/typing-constants";
import { UserButton } from "@/components/auth";
import NotificationCenter from "@/components/layout/NotificationCenter";

interface HeaderProps {
  theme: Theme;
  hidden?: boolean;
}

export default function Header({
  theme,
  hidden = false,
}: HeaderProps) {
  const { user: clerkUser, isSignedIn } = useUser();
  
  // Fetch current user's Convex ID for stats link
  const convexUser = useQuery(
    api.users.getUser,
    isSignedIn && clerkUser ? { clerkId: clerkUser.id } : "skip"
  );

  const statsUrl = convexUser?._id ? `/user/${convexUser._id}` : null;

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

        {/* Stats - only show if signed in */}
        {statsUrl && (
          <Link
            to={statsUrl}
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
        )}

        {/* Notification Center */}
        <NotificationCenter theme={theme} />

        {/* User Button - Sign In / Avatar Dropdown */}
        <UserButton theme={theme} />
      </div>
    </header>
  );
}
