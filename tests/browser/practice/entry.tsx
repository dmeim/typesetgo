import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/lib/notification-store";
import { AppAuthContext, unavailableAuth } from "@/components/layout/useAppAuth";
import type { AppAuth, AppAuthUser } from "@/components/layout/useAppAuth";
import Home from "@/pages/Home";
import AreaFixture from "./AreaFixture";
import ColorFixture from "./ColorFixture";
import ToastFixture from "./ToastFixture";
import "@/index.css";

const query = new URLSearchParams(location.search);
const auth: AppAuth = query.has("ranked") ? {
  ...unavailableAuth,
  status: "signed-in",
  available: true,
  isSignedIn: true,
  unavailableReason: null,
  // Components read these display fields only; all Clerk transport is mocked.
  user: {
    id: "fixture-user",
    username: "Fixture",
    firstName: "Fixture",
    imageUrl: "",
    primaryEmailAddress: { emailAddress: "fixture@example.invalid" },
  } as AppAuthUser,
} : unavailableAuth;

createRoot(document.getElementById("root")!).render(
  <AppAuthContext.Provider value={auth}>
    <NotificationProvider>
      <BrowserRouter>
        <ThemeProvider>
          {query.has("toasts") ? <ToastFixture /> : query.has("color") ? <ColorFixture /> : query.has("area") ? <AreaFixture /> : <Home />}
          <Toaster />
        </ThemeProvider>
      </BrowserRouter>
    </NotificationProvider>
  </AppAuthContext.Provider>,
);
