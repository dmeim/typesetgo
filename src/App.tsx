import { MotionConfig } from "framer-motion";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { IconProvider } from "@/components/ui/icon-provider";
import { Toaster } from "@/components/ui/toast";
import { appRoutes } from "@/components/layout/app-routes";

const router = createBrowserRouter(appRoutes);

export default function App() {
  return (
    <ThemeProvider>
      <IconProvider>
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
          <Toaster />
        </MotionConfig>
      </IconProvider>
    </ThemeProvider>
  );
}
