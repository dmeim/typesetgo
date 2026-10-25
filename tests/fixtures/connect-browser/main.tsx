import "./identity";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppAuthProvider } from "@/components/layout/AppAuthProvider";
import { AccountProvider } from "@/components/layout/AccountProvider";
import { NotificationProvider } from "@/lib/notification-store";
import App from "@/App";
import "@/index.css";

// The real App: production routes, header, theme provider and toaster, with
// `convex/react` and Clerk replaced by local modules (see vite.config.ts).
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppAuthProvider enabled={false}>
      <AccountProvider>
        <NotificationProvider><App /></NotificationProvider>
      </AccountProvider>
    </AppAuthProvider>
  </StrictMode>,
);
