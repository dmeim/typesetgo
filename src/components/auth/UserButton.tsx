import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ChevronDown, LogIn, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export default function UserButton({ inactive = false }: { inactive?: boolean }) {
  const { status, isSignedIn, user, isLoaded, unavailableReason, openSignIn, openUserProfile, signOut } = useAppAuth();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);
  const lastSyncedKeyRef = useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  if (inactive && (menuOpen || unavailableOpen)) {
    setMenuOpen(false);
    setUnavailableOpen(false);
  }

  useEffect(() => {
    if (isSignedIn && user) {
      const email = user.primaryEmailAddress?.emailAddress ?? "";
      const username = user.username ?? user.firstName ?? "User";
      const avatarUrl = user.imageUrl;
      const syncKey = `${user.id}:${email}:${username}:${avatarUrl}`;
      if (lastSyncedKeyRef.current === syncKey) return;
      void getOrCreateUser({ clerkId: user.id, email, username, avatarUrl }).then(() => {
        lastSyncedKeyRef.current = syncKey;
      }).catch((error: unknown) => console.error("Failed to sync user to Convex:", error));
    } else {
      lastSyncedKeyRef.current = null;
    }
  }, [isSignedIn, user, getOrCreateUser]);

  const runAction = async (action: () => Promise<boolean>, message: string) => {
    if (!await action()) toast.error(message);
  };

  if (status === "unavailable") {
    return (
      <Popover open={!inactive && unavailableOpen} onOpenChange={setUnavailableOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Account unavailable">
            <UserRound className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Guest</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" aria-labelledby="account-unavailable-title" className="w-72 max-w-[calc(100vw-1.5rem)] space-y-3">
          <h2 id="account-unavailable-title" className="font-medium">Sign-in unavailable</h2>
          <p className="text-sm text-muted-foreground">
            {unavailableReason === "load-failed"
              ? "Sign-in couldn’t connect. You can keep practicing as a guest, or reload to try again."
              : "You can practice as a guest. Sign-in and saved account progress aren’t available in this session."}
          </p>
          {unavailableReason === "load-failed" && <Button variant="outline" onClick={() => window.location.reload()}>Reload sign-in</Button>}
        </PopoverContent>
      </Popover>
    );
  }

  if (!isLoaded) {
    return <span role="status" className="inline-flex h-10 items-center gap-2 px-2 text-sm text-muted-foreground"><UserRound className="size-5" aria-hidden="true" /><span className="sr-only sm:not-sr-only">Loading account…</span></span>;
  }

  if (!isSignedIn) {
    return (
      <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Sign in" onClick={() => void runAction(openSignIn, "Sign-in couldn’t open. Please try again.")}>
        <LogIn className="size-5" aria-hidden="true" /><span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  const name = user?.username ?? user?.firstName ?? "User";
  return (
    <DropdownMenu open={!inactive && menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 max-w-full gap-2 px-2" aria-label={`Account: ${name}`}>
          {user?.imageUrl ? <img src={user.imageUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" /> : <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">{name[0]?.toUpperCase() || "U"}</span>}
          <span className="hidden max-w-24 truncate text-sm sm:inline">{name}</span>
          <ChevronDown className="hidden size-4 shrink-0 sm:block" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="min-w-0 px-3 py-2"><p className="break-words text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p></div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void runAction(openUserProfile, "Account settings couldn’t open. Please try again.")}><UserRound className="size-4" aria-hidden="true" />Account settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void runAction(signOut, "Sign-out didn’t finish. Please try again.")}><LogOut className="size-4" aria-hidden="true" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
