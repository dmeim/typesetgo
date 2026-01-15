import { useUser, useClerk, SignInButton } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/typing-constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserButtonProps {
  theme: Theme;
  onShowStats: () => void;
}

export default function UserButton({ theme, onShowStats }: UserButtonProps) {
  const { isSignedIn, user, isLoaded } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const syncedUserIdRef = useRef<string | null>(null);

  // Sync user to Convex when they sign in
  useEffect(() => {
    if (isSignedIn && user && syncedUserIdRef.current !== user.id) {
      const syncUser = async () => {
        try {
          await getOrCreateUser({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress ?? "",
            username: user.username ?? user.firstName ?? "User",
            avatarUrl: user.imageUrl,
          });
          syncedUserIdRef.current = user.id;
        } catch (error) {
          console.error("Failed to sync user to Convex:", error);
        }
      };
      syncUser();
    } else if (!isSignedIn) {
      syncedUserIdRef.current = null;
    }
  }, [isSignedIn, user, getOrCreateUser]);

  // Loading state
  if (!isLoaded) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${theme.surfaceColor}80` }}
      >
        <div
          className="h-5 w-5 rounded-full animate-pulse"
          style={{ backgroundColor: theme.buttonUnselected }}
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
          style={{ color: theme.buttonUnselected }}
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
              style={{ backgroundColor: theme.buttonSelected, color: theme.backgroundColor }}
            >
              {(user?.username ?? user?.firstName ?? "U")[0].toUpperCase()}
            </div>
          )}
          <span
            className="text-sm font-medium hidden sm:inline max-w-[100px] truncate"
            style={{ color: theme.correctText }}
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
            style={{ color: theme.defaultText }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48"
        style={{ backgroundColor: theme.surfaceColor, borderColor: `${theme.defaultText}30` }}
      >
        <div className="px-3 py-2">
          <p className="text-sm font-medium" style={{ color: theme.correctText }}>
            {user?.username ?? user?.firstName ?? "User"}
          </p>
          <p className="text-xs truncate" style={{ color: theme.defaultText }}>
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <DropdownMenuSeparator style={{ backgroundColor: `${theme.defaultText}30` }} />
        <DropdownMenuItem
          onClick={onShowStats}
          className="cursor-pointer"
          style={{ color: theme.correctText }}
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
            <line x1="18" x2="18" y1="20" y2="10" />
            <line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
          </svg>
          View Stats
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => openUserProfile()}
          className="cursor-pointer"
          style={{ color: theme.correctText }}
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
        <DropdownMenuSeparator style={{ backgroundColor: `${theme.defaultText}30` }} />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="cursor-pointer"
          style={{ color: theme.incorrectText }}
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
