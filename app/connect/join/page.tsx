"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import TypingPractice from "@/components/TypingPractice";
import { SettingsState } from "@/lib/typing-constants";
import { GLOBAL_COLORS } from "@/lib/colors";
import JoinCard from "@/components/connect/JoinCard";

let socket: Socket;

function JoinRoomContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const code = searchParams.get("code");
  const searchName = searchParams.get("name");
  
  const [name, setName] = useState<string | null>(searchName);
  const [inputName, setInputName] = useState("");

  const [connected, setConnected] = useState(false);
  const [lockedSettings, setLockedSettings] = useState<Partial<SettingsState> | null>(null);
  const [status, setStatus] = useState<"waiting" | "active">("waiting");
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(0);
  const [hostName, setHostName] = useState<string>("Host");
  const [isFocused, setIsFocused] = useState(false);

  // Effect for joining the room once code and name are present
  useEffect(() => {
    if (!code || !name) return;

    socket = io();

    socket.on("connect", () => {
      console.log("Connected to server");
      
      socket.emit("join_room", { code, name }, (response: any) => {
          if (response.error) {
            setError(response.error);
        } else {
            setLockedSettings(response.settings);
            setStatus(response.status);
            if (response.hostName) setHostName(response.hostName);
            setConnected(true);
        }
      });
    });

    socket.on("settings_updated", (settings: SettingsState) => {
        setLockedSettings(settings);
        setSessionId(prev => prev + 1);
    });

    socket.on("test_started", () => {
        setStatus("active");
        setSessionId(prev => prev + 1);
    });

    socket.on("test_stopped", () => {
        setStatus("waiting");
    });

    socket.on("test_reset", () => {
        setStatus("waiting");
        setSessionId(prev => prev + 1);
    });

    socket.on("host_disconnected", () => {
        setError("Host disconnected.");
        setConnected(false);
    });

    socket.on("kicked", () => {
        setError("You have been kicked from the room.");
        setConnected(false);
        socket.disconnect();
        setTimeout(() => {
            router.push("/");
        }, 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, [code, name, router]);

  const handleStatsUpdate = (stats: any) => {
      if (connected) {
          socket.emit("send_stats", { code, stats });
      }
  };

  const handleLeave = () => {
      socket.disconnect();
      router.push("/");
  };

  // If no code is provided, show the default Join Card to enter code/name manually
  if (!code) {
    return (
        <div 
          className="min-h-[100dvh] flex items-center justify-center font-mono px-4 transition-colors duration-300"
          style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
        >
          <div className="w-full max-w-md animate-fade-in">
             <div className="text-center mb-8">
                 <Link href="/connect" className="text-sm hover:text-white mb-4 inline-block" style={{ color: GLOBAL_COLORS.text.secondary }}>
                    ← Back
                </Link>
             </div>
            <JoinCard />
          </div>
        </div>
    );
  }

  if (error) {
      return (
      <div 
        className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 transition-colors duration-300"
        style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
      >
          <div className="text-xl" style={{ color: GLOBAL_COLORS.text.error }}>{error}</div>
          <button onClick={() => router.push("/connect")} className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600">
              Go Back
          </button>
      </div>
    );
  }

  // If code is present but no name, show the name entry form
  if (!name) {
    return (
      <div 
        className={`min-h-[100dvh] flex items-center justify-center px-4 transition-all duration-300 ${isFocused && window.innerWidth < 768 ? "items-start pt-20" : ""}`}
        style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
      >
          <div 
            className="w-full max-w-md p-8 rounded-2xl border border-gray-800 shadow-2xl text-center animate-fade-in"
            style={{ backgroundColor: GLOBAL_COLORS.surface }}
          >
              <h2 className="text-2xl font-bold mb-2" style={{ color: GLOBAL_COLORS.brand.primary }}>Join Room</h2>
              <div className="mb-8" style={{ color: GLOBAL_COLORS.text.secondary }}>
                  Joining Room: <span className="font-mono font-bold text-white">{code}</span>
              </div>
              
              <form onSubmit={(e) => {
                  e.preventDefault();
                  if (inputName.trim()) {
                      setName(inputName.trim());
                  }
              }} className="flex flex-col gap-4">
                  <input
                      type="text"
                      value={inputName}
                      onChange={(e) => setInputName(e.target.value)}
                      placeholder="YOUR NAME"
                      className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded text-center text-lg font-bold tracking-wide focus:outline-none text-white placeholder-gray-600"
                      style={{ borderColor: "transparent" }}
                      onFocus={(e) => {
                          e.target.style.borderColor = GLOBAL_COLORS.brand.primary;
                          if (window.innerWidth < 768) setIsFocused(true);
                      }}
                      onBlur={(e) => {
                          e.target.style.borderColor = "transparent";
                          setIsFocused(false);
                      }}
                      maxLength={15}
                      autoFocus
                  />
                  <button
                      type="submit"
                      disabled={!inputName.trim()}
                      className="w-full px-8 py-3 text-gray-900 font-bold rounded-lg transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      style={{ 
                        backgroundColor: GLOBAL_COLORS.brand.primary,
                        boxShadow: `0 10px 15px -3px ${GLOBAL_COLORS.brand.primary}33`
                      }}
                  >
                      Enter Room
                  </button>
              </form>
              <div className="mt-6">
                 <button onClick={() => router.push("/connect")} className="text-sm transition hover:text-white" style={{ color: GLOBAL_COLORS.text.secondary }}>
                    Cancel
                 </button>
              </div>
          </div>
      </div>
    );
  }

  if (!connected || !lockedSettings) {
       return (
          <div 
            className="min-h-[100dvh] flex items-center justify-center transition-colors duration-300"
            style={{ backgroundColor: GLOBAL_COLORS.background, color: GLOBAL_COLORS.text.primary }}
          >
              Connecting to room {code}...
          </div>
      );
  }

  return (
    <TypingPractice 
        connectMode={true}
        lockedSettings={lockedSettings}
        isTestActive={status === "active"}
        onStatsUpdate={handleStatsUpdate}
        onLeave={handleLeave}
        sessionId={sessionId}
        hostName={hostName}
    />
  );
}

export default function ConnectJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] flex items-center justify-center bg-[#0d1117] text-white">Loading...</div>}>
      <JoinRoomContent />
    </Suspense>
  );
}
