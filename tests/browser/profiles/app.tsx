import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/context/ThemeContext";
import { IconProvider } from "@/components/ui/icon-provider";
import UserStats from "@/pages/UserStats";
import Leaderboard from "@/pages/Leaderboard";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { NotificationProvider } from "@/lib/notification-store";
import { getAchievementsByCategory } from "@/lib/achievement-definitions";
import "@/index.css";

const query = new URLSearchParams(location.search);
localStorage.setItem("typesetgo-theme-mode", query.get("theme") ?? "dark");
localStorage.setItem("typesetgo-theme-id", query.get("palette") ?? "typesetgo");
localStorage.setItem("typesetgo_notifications", JSON.stringify([{
  id: "fixture-achievement",
  type: "achievement",
  title: "Fixture achievement unlocked",
  description: "Open this achievement from a notification.",
  timestamp: Date.now(),
  read: false,
  metadata: { achievementId: getAchievementsByCategory("speed")[0].id, achievementTier: "copper" },
}]));

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <IconProvider>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <NotificationProvider>
            <Routes>
              <Route path="/user/:userId" element={<UserStats />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/notifications" element={<main className="min-h-dvh bg-background p-4 text-foreground"><h1>Notification fixture</h1><NotificationCenter /></main>} />
            </Routes>
            </NotificationProvider>
          </BrowserRouter>
        </MotionConfig>
      </IconProvider>
    </ThemeProvider>
  </StrictMode>,
);
