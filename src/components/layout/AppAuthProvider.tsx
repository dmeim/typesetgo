import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { AppAuthContext, unavailableAuth, type AppAuth } from "./useAppAuth";

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  useEffect(() => {
    if (isLoaded) return;
    const timeout = window.setTimeout(() => setLoadTimedOut(true), 10000);
    return () => window.clearTimeout(timeout);
  }, [isLoaded]);

  const value = useMemo<AppAuth>(() => {
    const available = Boolean(isLoaded || !loadTimedOut);
    const run = async (allowed: boolean, action: () => unknown) => {
      if (!available || !isLoaded || !allowed) return false;
      try {
        await action();
        return true;
      } catch {
        return false;
      }
    };
    return {
      status: !available ? "unavailable" : !isLoaded ? "loading" : isSignedIn ? "signed-in" : "signed-out",
      available,
      isLoaded: Boolean(isLoaded),
      isSignedIn: Boolean(isLoaded && isSignedIn),
      user: isLoaded ? user ?? null : null,
      unavailableReason: available ? null : "load-failed",
      openSignIn: () => run(!isSignedIn, () => clerk.openSignIn()),
      openUserProfile: () => run(Boolean(isSignedIn), () => clerk.openUserProfile()),
      signOut: () => run(Boolean(isSignedIn), () => clerk.signOut()),
    };
  }, [clerk, isLoaded, isSignedIn, loadTimedOut, user]);

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

/** Enable only beneath a real ClerkProvider; anonymous mode never invokes Clerk hooks. */
export function AppAuthProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return enabled ? (
    <ClerkAuthBridge>{children}</ClerkAuthBridge>
  ) : (
    <AppAuthContext.Provider value={unavailableAuth}>{children}</AppAuthContext.Provider>
  );
}
