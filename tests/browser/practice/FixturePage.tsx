import { useLocation } from "react-router-dom";
import Home from "@/pages/Home";
import Temp from "@/pages/Temp";
import TempLeaderboard from "@/pages/TempLeaderboard";
import TempProfile from "@/pages/TempProfile";
import TempSettings from "@/pages/TempSettings";
import AreaFixture from "./AreaFixture";
import ToastFixture from "./ToastFixture";

/** Picks the page from the query (?temp-settings=1) or, for the UI Lab, the app path (/temp-profile/history). */
export function FixturePage() {
  const { pathname } = useLocation();
  const query = new URLSearchParams(location.search);
  if (query.has("toasts")) return <ToastFixture />;
  if (query.has("area")) return <AreaFixture />;
  if (pathname.startsWith("/temp-profile")) return <TempProfile />;
  if (query.has("temp-settings") || pathname.startsWith("/temp-settings")) return <TempSettings />;
  if (query.has("temp-leaderboard") || pathname.startsWith("/temp-leaderboard")) return <TempLeaderboard />;
  if (query.has("temp") || pathname === "/temp") return <Temp />;
  return <Home />;
}
