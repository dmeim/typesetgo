export const useUser = () => ({ isLoaded: true, isSignedIn: false, user: null });
export const useClerk = () => ({ openSignIn() {}, openUserProfile() {}, signOut: async () => {} });
export const useAuth = () => ({ isLoaded: true, isSignedIn: false, getToken: async () => null });
export const SignInButton = ({ children }: any) => children;
export const ClerkProvider = ({ children }: any) => children;
export const SignedIn = () => null;
export const SignedOut = ({ children }: any) => children;
