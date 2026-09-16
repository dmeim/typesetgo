import { MotionConfig } from "framer-motion";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "@/components/ui/sonner";
import { appRoutes } from "@/components/layout/app-routes";

const router = createBrowserRouter(appRoutes);

export default function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors />
      </MotionConfig>
    </ThemeProvider>
  );
}
