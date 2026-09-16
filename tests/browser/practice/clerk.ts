import type { ReactNode } from "react";

export const useUser = () => ({ isLoaded: true, isSignedIn: false, user: null });
export const useClerk = () => ({
  openSignIn() {},
  openUserProfile() {},
  signOut: async () => {},
});
export const useAuth = () => ({
  isLoaded: true,
  isSignedIn: false,
  getToken: async () => null,
});
export const SignInButton = ({ children }: { children: ReactNode }) => children;
export const ClerkProvider = ({ children }: { children: ReactNode }) => children;
export const SignedIn = () => null;
export const SignedOut = ({ children }: { children: ReactNode }) => children;
