// src/components/connect/HostCard.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GLOBAL_COLORS } from "@/lib/colors";

export default function HostCard() {
  const [hostName, setHostName] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const handleHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (hostName.trim()) {
      navigate(`/connect/host?name=${encodeURIComponent(hostName.trim())}`);
    }
  };

  return (
    <div
      className={`relative rounded-2xl p-10 flex flex-col items-center group border border-gray-800 hover:border-gray-700 transition-all duration-300 min-h-96 ${isFocused ? "justify-start pt-10" : "justify-center"}`}
      style={{ backgroundColor: GLOBAL_COLORS.surface }}
    >
      <div
        className="text-xs font-bold uppercase tracking-widest mb-6"
        style={{ color: GLOBAL_COLORS.text.secondary }}
      >
        Create Room
      </div>
      <h2
        className="text-5xl font-black mb-8"
        style={{ color: GLOBAL_COLORS.brand.primary }}
      >
        HOST
      </h2>

      <form
        onSubmit={handleHost}
        className="w-full max-w-xs flex flex-col gap-4 z-10"
      >
        <input
          type="text"
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          placeholder="YOUR NAME"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-center text-lg font-bold tracking-wide focus:outline-none text-white placeholder-gray-600"
          style={{ borderColor: "transparent" }}
          maxLength={15}
          onFocus={(e) => {
            e.target.style.borderColor = GLOBAL_COLORS.brand.primary;
            if (window.innerWidth < 768) setIsFocused(true);
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "transparent";
            setIsFocused(false);
          }}
        />
        <button
          type="submit"
          disabled={!hostName.trim()}
          className="w-full px-8 py-3 text-gray-900 font-bold rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{
            backgroundColor: GLOBAL_COLORS.brand.primary,
            boxShadow: `0 10px 15px -3px ${GLOBAL_COLORS.brand.primary}33`,
          }}
        >
          Start Hosting
        </button>
      </form>

      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="150"
          height="150"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      </div>
    </div>
  );
}
