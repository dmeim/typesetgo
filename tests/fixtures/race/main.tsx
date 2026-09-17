import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { IconProvider } from "@/components/ui/icon-provider";
import Race from "@/pages/Race";
import RaceLobby from "@/pages/RaceLobby";
import RaceActive from "@/pages/RaceActive";
import RaceResults from "@/pages/RaceResults";
import "@/index.css";

localStorage.setItem("typesetgo_session_id", "self");
localStorage.setItem(
  "typesetgo-theme-mode",
  new URLSearchParams(window.location.search).get("theme") || "dark",
);
createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <IconProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/race" element={<Race />} />
          <Route path="/race/lobby/:lobbyId" element={<RaceLobby />} />
          <Route path="/race/results/:raceId" element={<RaceResults />} />
          <Route path="/race/:raceId" element={<RaceActive />} />
        </Routes>
      </BrowserRouter>
    </IconProvider>
  </ThemeProvider>,
);
