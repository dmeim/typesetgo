import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/clerk-react";
import { AppAuthProvider } from "@/components/layout/AppAuthProvider";
import { AccountProvider } from "@/components/layout/AccountProvider";
import { NotificationProvider } from "@/lib/notification-store";
import { ConvexClerkProvider } from "./ConvexClerkProvider.tsx";
import App from "./App.tsx";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Hide the static HTML footer once React loads (it exists for SEO/Google verification)
const staticFooter = document.getElementById("static-footer");
if (staticFooter) {
  staticFooter.style.display = "none";
}

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn("Missing VITE_CLERK_PUBLISHABLE_KEY. Auth features will be disabled.");
}

const appTree = (
  <AppAuthProvider enabled={Boolean(CLERK_PUBLISHABLE_KEY)}>
    <AccountProvider>
      <NotificationProvider><App /></NotificationProvider>
    </AccountProvider>
  </AppAuthProvider>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ConvexClerkProvider client={convex}>{appTree}</ConvexClerkProvider>
      </ClerkProvider>
    ) : (
      <ConvexProvider client={convex}>{appTree}</ConvexProvider>
    )}
  </StrictMode>
);
