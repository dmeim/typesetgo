import "./identity";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "@/context/ThemeContext";
import { IconProvider } from "@/components/ui/icon-provider";
import Race from "@/pages/Race";
import RaceLobby from "@/pages/RaceLobby";
import RaceActive from "@/pages/RaceActive";
import RaceResults from "@/pages/RaceResults";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <IconProvider>
      {/* Matches App: motion follows the reduced-motion preference. */}
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <Routes>
            <Route path="/race" element={<Race />} />
            <Route path="/race/lobby/:lobbyId" element={<RaceLobby />} />
            <Route path="/race/results/:raceId" element={<RaceResults />} />
            <Route path="/race/:raceId" element={<RaceActive />} />
          </Routes>
        </BrowserRouter>
      </MotionConfig>
    </IconProvider>
  </ThemeProvider>,
);
