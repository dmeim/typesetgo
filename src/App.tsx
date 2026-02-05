import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import Home from "./pages/Home";
import Connect from "./pages/Connect";
import Host from "./pages/Host";
import Join from "./pages/Join";
import About from "./pages/About";
import Privacy from "./pages/Privacy";
import TermsOfService from "./pages/TermsOfService";
import Leaderboard from "./pages/Leaderboard";
import UserStats from "./pages/UserStats";
import Race from "./pages/Race";
import RaceLobby from "./pages/RaceLobby";
import RaceActive from "./pages/RaceActive";
import RaceResults from "./pages/RaceResults";
import Lessons from "./pages/Lessons";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/user/:userId" element={<UserStats />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/connect/host" element={<Host />} />
        <Route path="/connect/join" element={<Join />} />
        <Route path="/race" element={<Race />} />
        <Route path="/race/lobby/:lobbyId" element={<RaceLobby />} />
        <Route path="/race/:raceId" element={<RaceActive />} />
        <Route path="/race/results/:raceId" element={<RaceResults />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/about" element={<About />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/tos" element={<TermsOfService />} />
      </Routes>
    </ThemeProvider>
  );
}
