"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GLOBAL_COLORS } from "@/lib/colors";

function JoinCardContent() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [joinName, setJoinName] = useState(searchParams.get("name") || "");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() && joinName.trim()) {
      router.push(`/connect/${code.trim().toUpperCase()}?name=${encodeURIComponent(joinName.trim())}`);
    }
  };

  return (
    <div 
      className="relative overflow-hidden rounded-2xl p-10 flex flex-col items-center group border border-gray-800 hover:border-gray-700 transition-colors h-96"
      style={{ backgroundColor: GLOBAL_COLORS.surface }}
    >
      <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: GLOBAL_COLORS.text.secondary }}>Join Room</div>
      <h2 className="text-5xl font-black mb-8" style={{ color: GLOBAL_COLORS.brand.primary }}>JOIN</h2>
      
      <form onSubmit={handleJoin} className="w-full max-w-xs flex flex-col gap-4 z-10">
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="YOUR NAME"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-center text-lg font-bold tracking-wide focus:outline-none text-white placeholder-gray-600"
            style={{ borderColor: "transparent" }}
            onFocus={(e) => e.target.style.borderColor = GLOBAL_COLORS.brand.primary}
            onBlur={(e) => e.target.style.borderColor = "transparent"}
            maxLength={15}
          />
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER CODE"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-center text-xl font-bold tracking-widest uppercase focus:outline-none text-white placeholder-gray-600"
            style={{ borderColor: "transparent" }}
            onFocus={(e) => e.target.style.borderColor = GLOBAL_COLORS.brand.primary}
            onBlur={(e) => e.target.style.borderColor = "transparent"}
            maxLength={6}
          />
          <button
              type="submit"
              disabled={!code.trim() || !joinName.trim()}
              className="w-full px-8 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg transition"
          >
              Join Room
          </button>
      </form>

      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
      </div>
    </div>
  );
}

export default function JoinCard() {
    return (
        <Suspense fallback={<div className="h-96 bg-gray-900 rounded-2xl animate-pulse"></div>}>
            <JoinCardContent />
        </Suspense>
    );
}
