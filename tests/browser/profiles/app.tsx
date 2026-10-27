import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider, type RouteObject } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/context/ThemeContext";
import { IconProvider } from "@/components/ui/icon-provider";
import Profile from "@/pages/Profile";
import { appRoutes } from "@/components/layout/app-routes";
import Leaderboard from "@/pages/Leaderboard";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { NotificationProvider } from "@/lib/notification-store";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";
import "@/index.css";

const query = new URLSearchParams(location.search);
localStorage.setItem("typesetgo-theme-mode", query.get("theme") ?? "dark");
localStorage.setItem("typesetgo-theme-id", query.get("palette") ?? "typesetgo");
localStorage.setItem("typesetgo_notifications:" + (query.get("scenario") === "anonymous" ? "guest" : "user:clerk-owner"), JSON.stringify([{
  id: "fixture-achievement",
  type: "achievement",
  title: "Fixture achievement unlocked",
  description: "Open this achievement from a notification.",
  timestamp: Date.now(),
  read: false,
  metadata: { achievementId: getAchievementsByCategory("speed")[0].id, achievementTier: "copper" },
}]));

// The app's own redirect: old /user/:userId links open the same player on the Profile page.
const userRedirect = (appRoutes[0].children as RouteObject[]).find((route) => route.path === "/user/:userId")!;

const router = createBrowserRouter([{
  element: <NotificationProvider><Outlet /></NotificationProvider>,
  children: [
    userRedirect,
    { path: "/profile/*", element: <Profile /> },
    { path: "/leaderboard", element: <Leaderboard /> },
    { path: "/notifications", element: <main className="min-h-dvh bg-background p-4 text-foreground"><h1>Notification fixture</h1><NotificationCenter /></main> },
  ],
}]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <IconProvider>
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
        </MotionConfig>
      </IconProvider>
    </ThemeProvider>
  </StrictMode>,
);
