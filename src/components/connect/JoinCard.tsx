import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { fieldClass, fieldStyle, panelStyle, RoomButton } from "./RoomUI";
import { tv } from "@/lib/theme-vars";

export default function JoinCard() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(params.get("code") ?? "");
  const [name, setName] = useState(params.get("name") ?? "");
  const navigate = useNavigate();
  return (
    <section
      className="min-w-0 rounded-xl border p-5 sm:p-8"
      style={panelStyle}
      aria-labelledby="join-title"
    >
      <h2 id="join-title" className="text-2xl font-semibold">
        Join a room
      </h2>
      <p className="mt-2 text-sm" style={{ color: tv.ui.mutedForeground }}>
        Enter the code shared by your host.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && code.trim())
            navigate(
              `/connect/join?code=${encodeURIComponent(code.trim().toUpperCase())}&name=${encodeURIComponent(name.trim())}`,
            );
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
        <label className="block space-y-2 text-sm">
          Room code
          <input
            className={`${fieldClass} uppercase tracking-widest`}
            style={fieldStyle}
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>
        <RoomButton
          type="submit"
          selected
          disabled={!name.trim() || !code.trim()}
          className="w-full"
        >
          Join room
        </RoomButton>
      </form>
    </section>
  );
}
