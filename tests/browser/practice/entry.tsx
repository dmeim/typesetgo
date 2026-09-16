import React, { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { NotificationProvider } from "@/lib/notification-store";
import Home from "@/pages/Home";
import "@/index.css";
import { AppAuthContext, unavailableAuth } from "@/components/layout/useAppAuth";
const auth = location.search.includes("ranked") ? { ...unavailableAuth, status: "signed-in", available: true, isSignedIn: true, unavailableReason: null, user: { id: "fixture-user", username: "Fixture", firstName: "Fixture", imageUrl: "", primaryEmailAddress: { emailAddress: "fixture@example.invalid" } } } : unavailableAuth;
import TypingArea from "@/components/typing/TypingArea";
function AreaFixture() {
  const query = new URLSearchParams(location.search);
  const [active, setActive] = useState(!query.has("paused"));
  const [revision, setRevision] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const target = query.has("long") ? "supercalifragilisticexpialidocious".repeat(3) + " dog" : "cat dog";
  (window as any).__areaReports ??= [];
  (window as any).__areaFinishes ??= [];
  return <main style={{ padding: 16, background: "var(--theme-bg-base)", color: "var(--theme-text-primary)" }}>
    <button onClick={() => setActive(!active)}>{active ? "Pause fixture" : "Resume fixture"}</button>
    <button onClick={() => setRevision(revision + 1)}>Rerender fixture</button>
    <TypingArea targetText={target} mode={query.has("race") ? "race" : "standard"} feedingTape={query.has("tape")} fontSize={query.has("long") ? 6 : 2}
      isActive={active} initialInput={query.has("resume") ? "ca" : ""} initialElapsedMs={query.has("resume") ? 1200 : 0}
      onProgress={(next) => { (window as any).__areaReports.push(next); setStats(next); }}
      onFinish={(next) => { (window as any).__areaFinishes.push(next); }} />
    <output data-area-stats style={{ display: "block", overflowWrap: "anywhere" }}>{JSON.stringify(stats)}</output><span>{revision}</span>
  </main>;
}
import ColorPicker from "@/components/typing/ColorPicker";
function ColorFixture() {
  const [color, setColor] = useState("#ff0000");
  return <main style={{ padding: 16, minHeight: 1600, background: "var(--theme-bg-base)", color: "var(--theme-text-primary)" }}><h1>Color fixture</h1><div style={{ paddingTop: 720, display: "flex", justifyContent: "flex-end" }}><ColorPicker value={color} onChange={setColor} /></div><output aria-label="Selected color">{color}</output><ColorPicker value="#00ff00" onChange={setColor} /></main>;
}
const Fixture = location.search.includes("color") ? ColorFixture : location.search.includes("area") ? AreaFixture : Home;
createRoot(document.getElementById("root")!).render(
  <AppAuthContext.Provider value={auth as any}><NotificationProvider><BrowserRouter><ThemeProvider><Fixture /><Toaster /></ThemeProvider></BrowserRouter></NotificationProvider></AppAuthContext.Provider>
);
