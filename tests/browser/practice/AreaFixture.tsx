import { useState } from "react";
import TypingArea from "@/components/typing/TypingArea";
import type { TypingStats } from "@/components/typing/TypingArea";
import { fixture } from "./fixture-state";

export default function AreaFixture() {
  const query = new URLSearchParams(location.search);
  const [active, setActive] = useState(!query.has("paused"));
  const [revision, setRevision] = useState(0);
  const [stats, setStats] = useState<TypingStats | null>(null);
  const target = query.has("long")
    ? "supercalifragilisticexpialidocious".repeat(3) + " dog"
    : "cat dog";

  return (
    <main style={{ padding: 16, background: "var(--theme-bg-base)", color: "var(--theme-text-primary)" }}>
      <button onClick={() => setActive(!active)}>{active ? "Pause fixture" : "Resume fixture"}</button>
      <button onClick={() => setRevision(revision + 1)}>Rerender fixture</button>
      <TypingArea
        targetText={target}
        mode={query.has("race") ? "race" : "standard"}
        feedingTape={query.has("tape")}
        fontSize={query.has("long") ? 6 : 2}
        isActive={active}
        initialInput={query.has("resume") ? "ca" : ""}
        initialElapsedMs={query.has("resume") ? 1200 : 0}
        onProgress={(next) => {
          fixture.__areaReports.push(next);
          setStats(next);
        }}
        onFinish={(next) => fixture.__areaFinishes.push(next)}
      />
      <output data-area-stats style={{ display: "block", overflowWrap: "anywhere" }}>
        {JSON.stringify(stats)}
      </output>
      <span>{revision}</span>
    </main>
  );
}
