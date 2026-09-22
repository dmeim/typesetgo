import { Route, Routes } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import Host from "@/pages/Host";
import Join from "@/pages/Join";
import Connect from "@/pages/Connect";

export default function Fixture() {
  const { setMode } = useTheme();
  return (
    <>
      <nav aria-label="Fixture controls" className="flex gap-4 p-2">
        <button onClick={() => setMode("light")}>Fixture light</button>
        <button onClick={() => setMode("dark")}>Fixture dark</button>
      </nav>
      <Routes>
        <Route path="/connect/host" element={<Host />} />
        <Route path="/connect/host/:roomId" element={<Host />} />
        <Route path="/connect/join" element={<Join />} />
        <Route path="*" element={<Connect />} />
      </Routes>
    </>
  );
}
