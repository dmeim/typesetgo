import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAppAuth } from "./useAppAuth";
import { AccountContext, unavailableAccount, type AccountState } from "./useAccount";

/** Owns account initialization without remounting the active typing attempt on sign-in. */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isSignedIn } = useAppAuth();
  const { isAuthenticated } = useConvexAuth();
  const synchronize = useMutation(api.users.getOrCreateUser);
  const clerkId = isSignedIn ? user?.id : undefined;
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const username = user?.username ?? user?.firstName ?? "User";
  const avatarUrl = user?.imageUrl;
  const profileKey = JSON.stringify([clerkId, email, username, avatarUrl]);
  const request = useRef<{ key: string; promise: Promise<Id<"users">> } | null>(null);
  const mounted = useRef(false);
  const [state, setState] = useState<Omit<AccountState, "ensureAccount"> & { key: string }>({
    key: "", status: "loading", userId: null, error: null,
  });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const ensureAccount = useCallback(() => {
    if (!clerkId) return Promise.reject(new Error("Sign in to save account progress."));
    if (!isAuthenticated) return Promise.reject(new Error("Your account is still connecting. Please try again."));
    if (request.current?.key === profileKey) return request.current.promise;
    setState({ key: profileKey, status: "loading", userId: null, error: null });
    const promise = synchronize({ clerkId, email, username, avatarUrl }).then((userId) => {
      if (mounted.current && request.current?.promise === promise) {
        setState({ key: profileKey, status: "ready", userId, error: null });
      }
      return userId;
    }).catch((error: unknown) => {
      if (request.current?.promise === promise) {
        request.current = null;
        if (mounted.current) setState({ key: profileKey, status: "error", userId: null,
          error: "Your account could not connect. Try again." });
      }
      throw error;
    });
    request.current = { key: profileKey, promise };
    return promise;
  }, [synchronize, clerkId, email, username, avatarUrl, profileKey, isAuthenticated]);

  useEffect(() => {
    if (clerkId && isAuthenticated) void ensureAccount().catch(() => {});
    else request.current = null;
  }, [clerkId, isAuthenticated, ensureAccount]);
  const value = useMemo<AccountState>(() => {
    if (!clerkId) return unavailableAccount;
    if (!isAuthenticated || state.key !== profileKey) {
      return { status: "loading", userId: null, error: null, ensureAccount };
    }
    return { status: state.status, userId: state.userId, error: state.error, ensureAccount };
  }, [clerkId, isAuthenticated, state, profileKey, ensureAccount]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
