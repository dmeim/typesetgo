import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/context/ThemeContext";
import UserStats from "@/pages/UserStats";
import Leaderboard from "@/pages/Leaderboard";
import "@/index.css";

localStorage.setItem("typesetgo-theme-mode", new URLSearchParams(location.search).get("theme") ?? "dark");
localStorage.setItem("typesetgo-theme-id", "typesetgo");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Routes>
            <Route path="/user/:userId" element={<UserStats />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </BrowserRouter>
      </MotionConfig>
    </ThemeProvider>
  </StrictMode>,
);
