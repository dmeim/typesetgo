import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowsClockwiseIcon, ChartLineUpIcon, CircleNotchIcon, SignInIcon, SignOutIcon, UserCircleIcon, UserGearIcon } from "@phosphor-icons/react";
import { toast } from "@/lib/toast-manager";
import { cn } from "@/lib/utils";
import { useAccount } from "@/components/layout/useAccount";
import { useAppAuth } from "@/components/layout/useAppAuth";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { accountStatsPath } from "./header-nav";
import { iconButton } from "./header-utils";

const runAction = async (action: () => Promise<boolean>, message: string) => {
  if (!await action()) toast.add({ type: "error", title: message });
};

function Avatar({ name, imageUrl, className = "size-8 text-sm" }: { name?: string; imageUrl?: string; className?: string }) {
  if (imageUrl) return <img src={imageUrl} alt="" className={cn("shrink-0 rounded-full object-cover", className)} />;
  if (!name) {
    return (
      <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground", className)}>
        <UserCircleIcon className="size-[70%]" weight="regular" />
      </span>
    );
  }
  return (
    <span aria-hidden="true" className={cn("flex shrink-0 items-center justify-center rounded-full bg-[conic-gradient(from_200deg,var(--primary),var(--accent-emphasis),var(--primary))] font-bold text-primary-foreground", className)}>
      {name[0]?.toUpperCase() || "U"}
    </span>
  );
}

/**
 * The one account button in the dock. Signed in, it opens your stats (with history and achievements),
 * Clerk account settings and sign-out; signed out, it signs you in; without Clerk, it explains why.
 */
export function AccountButton({ inactive = false }: { inactive?: boolean }) {
  const { status, isSignedIn, user, isLoaded, unavailableReason, openSignIn, openUserProfile, signOut } = useAppAuth();
  const account = useAccount();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unavailableOpen, setUnavailableOpen] = useState(false);

  // Hidden chrome must not leave portaled menus open behind the typing surface.
  if (inactive && (menuOpen || unavailableOpen)) {
    setMenuOpen(false);
    setUnavailableOpen(false);
  }

  if (status === "unavailable") {
    return (
      <Popover open={!inactive && unavailableOpen} onOpenChange={setUnavailableOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={iconButton} aria-label="Account unavailable">
            <Avatar />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" aria-labelledby="account-unavailable-title" className="w-72 max-w-[calc(100vw-1.5rem)] space-y-3">
          <h2 id="account-unavailable-title" className="font-medium">Sign-in unavailable</h2>
          <p className="text-sm text-muted-foreground">
            {unavailableReason === "load-failed"
              ? "Sign-in couldn’t connect. You can keep practicing as a guest, or reload to try again."
              : "You can practice as a guest. Sign-in and saved account progress aren’t available in this session."}
          </p>
          {unavailableReason === "load-failed" && <Button variant="outline" onClick={() => window.location.reload()}>
            <ArrowsClockwiseIcon className="size-4 shrink-0" aria-hidden="true" />
            Reload sign-in
          </Button>}
        </PopoverContent>
      </Popover>
    );
  }

  if (!isLoaded) {
    return (
      <span role="status" className={iconButton}>
        <CircleNotchIcon className="size-5 motion-safe:animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading account…</span>
      </span>
    );
  }

  if (!isSignedIn) {
    return (
      <button
        type="button"
        aria-label="Sign in"
        onClick={() => void runAction(openSignIn, "Sign-in couldn’t open. Please try again.")}
        className={cn(iconButton, "@min-[48rem]:w-auto @min-[48rem]:gap-2 @min-[48rem]:bg-primary @min-[48rem]:px-3 @min-[48rem]:text-sm @min-[48rem]:font-medium @min-[48rem]:text-primary-foreground @min-[48rem]:hover:bg-primary/90 @min-[48rem]:hover:text-primary-foreground")}
      >
        <SignInIcon className="size-5 shrink-0" aria-hidden="true" />
        <span className="hidden @min-[48rem]:inline">Sign in</span>
      </button>
    );
  }

  const name = user?.username ?? user?.firstName ?? "User";
  const statsPath = account.userId ? accountStatsPath(account.userId) : null;
  return (
    <DropdownMenu open={!inactive && menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={iconButton} aria-label={`Account: ${name}`}>
          <Avatar name={name} imageUrl={user?.imageUrl} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex min-w-0 items-center gap-3 px-2 py-2">
          <Avatar name={name} imageUrl={user?.imageUrl} className="size-10 text-base" />
          <span className="flex min-w-0 flex-col">
            <span className="break-words text-sm font-medium">{name}</span>
            <span className="truncate text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span>
          </span>
        </div>
        <DropdownMenuSeparator />
        {statsPath ? (
          <DropdownMenuItem asChild>
            <Link to={statsPath} aria-current={pathname === statsPath ? "page" : undefined}>
              <ChartLineUpIcon className="size-4" aria-hidden="true" />
              <span className="flex flex-col">
                Your stats
                <span className="text-xs text-muted-foreground">History and achievements too</span>
              </span>
            </Link>
          </DropdownMenuItem>
        ) : account.status === "error" ? (
          <DropdownMenuItem onSelect={() => void account.ensureAccount().catch(() => toast.add({ type: "error", title: "Your account could not connect. Try again." }))}>
            <ArrowsClockwiseIcon className="size-4" aria-hidden="true" />
            <span className="flex flex-col">
              Retry account connection
              <span className="text-xs text-muted-foreground">{account.error ?? "Try connecting again"}</span>
            </span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <CircleNotchIcon className="size-4 motion-safe:animate-spin" aria-hidden="true" />Loading your stats
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void runAction(openUserProfile, "Account settings couldn’t open. Please try again.")}><UserGearIcon className="size-4" aria-hidden="true" />Account settings</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void runAction(signOut, "Sign-out didn’t finish. Please try again.")}><SignOutIcon className="size-4" aria-hidden="true" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
