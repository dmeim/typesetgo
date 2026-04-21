import { useUser, useClerk, SignInButton } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function UserButton() {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const lastSyncedKeyRef = useRef<string | null>(null);
  const { colors } = useTheme();

  // Sync user to Convex when they sign in
  useEffect(() => {
    if (isSignedIn && user) {
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const username = user.username ?? user.firstName ?? "User";
      const avatarUrl = user.imageUrl;
      const syncKey = `${user.id}:${email}:${username}:${avatarUrl}`;

      if (lastSyncedKeyRef.current === syncKey) {
        return;
      }

      const syncUser = async () => {
        try {
          await getOrCreateUser({
            clerkId: user.id,
            email,
            username,
            avatarUrl,
          });
          lastSyncedKeyRef.current = syncKey;
        } catch (error) {
          console.error("Failed to sync user to Convex:", error);
        }
      };
      syncUser();
    } else if (!isSignedIn) {
      lastSyncedKeyRef.current = null;
    }
  }, [isSignedIn, user, getOrCreateUser]);

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${colors.bg.surface}80` }}
      >
        <div
          className="h-5 w-5 rounded-full animate-pulse"
          style={{ backgroundColor: tv.interactive.primary.DEFAULT }}
        />
      </div>
    );
  }

  // Signed out state
  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50 transition hover:bg-gray-700/50"
          style={{ color: tv.interactive.primary.DEFAULT }}
          title="Sign In"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span className="text-sm font-medium hidden sm:inline">Sign In</span>
        </button>
      </SignInButton>
    );
  }

  // Signed in state - show avatar dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition hover:bg-gray-800/50 focus:outline-none"
          title={user?.username ?? user?.firstName ?? "Account"}
        >
          {user?.imageUrl ? (
            <img
              src={user.imageUrl}
              alt="Avatar"
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: tv.interactive.secondary.DEFAULT, color: tv.bg.base }}
            >
              {(user?.username ?? user?.firstName ?? "U")[0].toUpperCase()}
            </div>
          )}
          <span
            className="text-sm font-medium hidden sm:inline max-w-[100px] truncate"
            style={{ color: tv.text.primary }}
          >
            {user?.username ?? user?.firstName ?? "User"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: tv.interactive.primary.DEFAULT }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        style={{ backgroundColor: tv.bg.surface, borderColor: tv.border.subtle }}
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium" style={{ color: tv.text.primary }}>
            {user?.username ?? user?.firstName ?? "User"}
          </p>
          <p className="text-xs truncate" style={{ color: tv.text.secondary }}>
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator style={{ backgroundColor: tv.border.subtle }} />
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          className="cursor-pointer"
          style={{ color: tv.text.primary }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Account
        </DropdownMenuItem>
        <DropdownMenuSeparator style={{ backgroundColor: tv.border.subtle }} />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer"
          style={{ color: tv.status.error.DEFAULT }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
