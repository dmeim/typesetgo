import { createContext, useContext } from "react";
import type { useUser } from "@clerk/clerk-react";

export type AppAuthUser = NonNullable<ReturnType<typeof useUser>["user"]>;

export interface AppAuth {
  status: "unavailable" | "loading" | "signed-out" | "signed-in";
  available: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AppAuthUser | null;
  unavailableReason: "not-configured" | "load-failed" | null;
  openSignIn: () => Promise<boolean>;
  openUserProfile: () => Promise<boolean>;
  signOut: () => Promise<boolean>;
}

const unavailableAction = async () => false;

export const unavailableAuth: AppAuth = {
  status: "unavailable",
  available: false,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  unavailableReason: "not-configured",
  openSignIn: unavailableAction,
  openUserProfile: unavailableAction,
  signOut: unavailableAction,
};

export const AppAuthContext = createContext<AppAuth>(unavailableAuth);

/** Safe inside anonymous routes as well as the enabled Clerk bridge. */
export function useAppAuth(): AppAuth {
  return useContext(AppAuthContext);
}
