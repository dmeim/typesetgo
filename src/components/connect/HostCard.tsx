import { Radio } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RoomButton } from "./RoomUI";
import { fieldClass, fieldStyle, panelStyle } from "./room-styles";
import { tv } from "@/lib/theme-vars";

export default function HostCard() {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  return (
    <section
      className="min-w-0 rounded-xl border p-5 sm:p-8"
      style={panelStyle}
      aria-labelledby="host-title"
    >
      <h2 id="host-title" className="text-2xl font-semibold">
        Host a room
      </h2>
      <p className="mt-2 text-sm" style={{ color: tv.ui.mutedForeground }}>
        Choose the practice settings and guide your group.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim())
            navigate(`/connect/host?name=${encodeURIComponent(name.trim())}`);
        }}
      >
        <label className="block space-y-2 text-sm">
          Your name
          <input
            className={fieldClass}
            style={fieldStyle}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={15}
            autoComplete="nickname"
            required
          />
        </label>
        <RoomButton
          type="submit"
          selected
          disabled={!name.trim()}
          className="w-full"
        >
          <Radio className="size-4 shrink-0" aria-hidden="true" />
          Start hosting
        </RoomButton>
      </form>
    </section>
  );
}
