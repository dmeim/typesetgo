import { useLocation } from "react-router-dom";
import { NotFound, RouteError, RouteLoading } from "@/components/layout/RouteRecovery";
import About from "@/pages/About";
import Home from "@/pages/Home";
import Privacy from "@/pages/Privacy";
import Temp from "@/pages/Temp";
import TempConnect from "@/pages/TempConnect";
import TempLeaderboard from "@/pages/TempLeaderboard";
import TempProfile from "@/pages/TempProfile";
import TempSettings from "@/pages/TempSettings";
import TermsOfService from "@/pages/TermsOfService";
import AreaFixture from "./AreaFixture";
import ToastFixture from "./ToastFixture";

/** Picks the page from the query (?temp-settings=1) or, for the UI Lab, the app path (/temp-profile/history). */
export function FixturePage() {
  const { pathname } = useLocation();
  const query = new URLSearchParams(location.search);
  if (query.has("toasts")) return <ToastFixture />;
  if (query.has("area")) return <AreaFixture />;
  if (query.has("about")) return <About />;
  if (query.has("privacy")) return <Privacy />;
  if (query.has("tos")) return <TermsOfService />;
  if (query.has("not-found")) return <NotFound />;
  if (query.has("route-error")) return <RouteError />;
  if (query.has("route-loading")) return <RouteLoading />;
  if (pathname.startsWith("/temp-profile")) return <TempProfile />;
  if (pathname.startsWith("/temp-connect")) return <TempConnect />;
  if (query.has("temp-settings") || pathname.startsWith("/temp-settings")) return <TempSettings />;
  if (query.has("temp-leaderboard") || pathname.startsWith("/temp-leaderboard")) return <TempLeaderboard />;
  if (query.has("temp") || pathname === "/temp") return <Temp />;
  return <Home />;
}
