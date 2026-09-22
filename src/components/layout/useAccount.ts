import { createContext, useContext } from "react";
import type { Id } from "../../../convex/_generated/dataModel";

export interface AccountState {
  status: "unavailable" | "loading" | "ready" | "error";
  userId: Id<"users"> | null;
  error: string | null;
  ensureAccount: () => Promise<Id<"users">>;
}

export const unavailableAccount: AccountState = {
  status: "unavailable",
  userId: null,
  error: null,
  ensureAccount: async () => { throw new Error("Sign in to save account progress."); },
};

export const AccountContext = createContext<AccountState>(unavailableAccount);

export function useAccount() {
  return useContext(AccountContext);
}
