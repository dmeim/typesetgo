import { MotionConfig } from "framer-motion";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { IconProvider } from "@/components/ui/icon-provider";
import { Toaster } from "@/components/ui/toast";
import { AchievementCelebration } from "@/components/achievements/AchievementCelebration";
import { appRoutes } from "@/components/layout/app-routes";
import { AccountThemeSync } from "@/components/layout/AccountThemeSync";

const router = createBrowserRouter(appRoutes);
const openAchievements = () => void router.navigate("/profile/achievements");

export default function App() {
  return (
    <ThemeProvider>
      <AccountThemeSync />
      <IconProvider>
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
          <AchievementCelebration onViewAll={openAchievements} />
          <Toaster />
        </MotionConfig>
      </IconProvider>
    </ThemeProvider>
  );
}
