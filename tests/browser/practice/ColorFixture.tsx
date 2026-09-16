import { useState } from "react";
import ColorPicker from "@/components/typing/ColorPicker";

export default function ColorFixture() {
  const [color, setColor] = useState("#ff0000");
  return (
    <main style={{ padding: 16, minHeight: 1600, background: "var(--theme-bg-base)", color: "var(--theme-text-primary)" }}>
      <h1>Color fixture</h1>
      <div style={{ paddingTop: 720, display: "flex", justifyContent: "flex-end" }}>
        <ColorPicker value={color} onChange={setColor} />
      </div>
      <output aria-label="Selected color">{color}</output>
      <ColorPicker value="#00ff00" onChange={setColor} />
    </main>
  );
}
