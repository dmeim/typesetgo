# TypeSetGo Migration Plan
## From: Next.js + Node.js + Socket.io + Supabase
## To: Bun + Vite + Convex + Shadcn/UI
---

## 📋 Quick Reference

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (port 3000) |
| `bun run build` | Production build |
| `bun run test:run` | Run unit tests |
| `bun run lint` | Run ESLint |
| `bunx convex dev` | Start Convex dev server |

---

## 🎯 Current Status

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Preparation | ✅ COMPLETE | Branch created, checklist documented |
| Phase 1: Scaffolding | ✅ COMPLETE | Vite + Bun project set up |
| Phase 2: Tailwind + Shadcn | ✅ COMPLETE | Components installed |
| Phase 3: Routing | ✅ COMPLETE | Pages with forms implemented |
| Phase 4: Convex | ✅ COMPLETE | Schema, functions, and initialization done |
| Phase 5: Components | ✅ COMPLETE | Hooks, schemas, and pages migrated |
| Phase 6: TypingPractice | ✅ COMPLETE | TypingPractice component fully migrated |
| Phase 7: Docker | ✅ COMPLETE | Dockerfile, nginx, docker-compose created |
| Phase 8: Cleanup | 🔶 PARTIAL | README updated, verification passed, pending commit |
| Phase 9: Plan Mode | ✅ COMPLETE | Plan components + TypingPractice integration |

---

# PHASE 4: Convex Setup

## Prerequisites
- Convex account at https://convex.dev (free tier available)
- Project must be on `migration/bun-vite-convex` branch

---

## Task 4.1: Initialize Convex Project

### Steps
1. Run `bunx convex dev` in the project root
2. Follow the prompts to:
   - Log in to Convex (browser will open)
   - Create a new project named `typesetgo`
   - Select the project
3. This will create `convex/_generated/` folder and add `VITE_CONVEX_URL` to `.env.local`

### Commands
```bash
cd /Users/dimitri/Library/Mobile\ Documents/com~apple~CloudDocs/~/Code/typesetgo
bunx convex dev
```

### Verification
- [x] `convex/_generated/api.d.ts` exists
- [x] `convex/_generated/server.d.ts` exists
- [x] `.env.local` contains `VITE_CONVEX_URL=https://xxx.convex.cloud`

### Checkbox
- [x] **TASK 4.1 COMPLETE**: Convex project initialized

> **NOTE**: This step requires user interaction. Run `bunx convex dev` in the terminal.

---

## Task 4.2: Create Database Schema

### File to Create: `convex/schema.ts`

### Steps
1. Create the file `convex/schema.ts` with the schema below
2. Save the file - Convex will auto-sync

### Code
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Rooms for multiplayer Connect mode
  rooms: defineTable({
    code: v.string(),
    hostId: v.string(),
    hostName: v.string(),
    status: v.union(v.literal("waiting"), v.literal("active")),
    settings: v.object({
      mode: v.string(),
      duration: v.number(),
      wordTarget: v.number(),
      difficulty: v.string(),
      punctuation: v.boolean(),
      numbers: v.boolean(),
      quoteLength: v.string(),
      presetText: v.optional(v.string()),
      presetModeType: v.optional(v.string()),
      ghostWriterEnabled: v.boolean(),
      ghostWriterSpeed: v.number(),
      soundEnabled: v.boolean(),
      typingFontSize: v.number(),
      textAlign: v.string(),
      theme: v.optional(v.any()),
      plan: v.optional(v.any()),
      planIndex: v.optional(v.number()),
    }),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_host", ["hostId"]),

  // Participants in rooms
  participants: defineTable({
    roomId: v.id("rooms"),
    sessionId: v.string(),
    name: v.string(),
    isConnected: v.boolean(),
    stats: v.object({
      wpm: v.number(),
      accuracy: v.number(),
      progress: v.number(),
      wordsTyped: v.number(),
      timeElapsed: v.number(),
      isFinished: v.boolean(),
    }),
    typedText: v.optional(v.string()),
    targetText: v.optional(v.string()),
    joinedAt: v.number(),
    lastSeen: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_session", ["sessionId"]),
});
```

### Verification
- [x] File saved at `convex/schema.ts`
- [x] Convex dev server shows "Schema validated" or similar
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 4.2 COMPLETE**: Database schema created

---

## Task 4.3: Create Room Functions

### File to Create: `convex/rooms.ts`

### Code
```typescript
// convex/rooms.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export const create = mutation({
  args: {
    hostName: v.string(),
    hostSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const code = generateRoomCode();
    const now = Date.now();

    const roomId = await ctx.db.insert("rooms", {
      code,
      hostId: args.hostSessionId,
      hostName: args.hostName,
      status: "waiting",
      settings: {
        mode: "time",
        duration: 30,
        wordTarget: 25,
        difficulty: "medium",
        punctuation: false,
        numbers: false,
        quoteLength: "all",
        ghostWriterEnabled: false,
        ghostWriterSpeed: 60,
        soundEnabled: false,
        typingFontSize: 3.5,
        textAlign: "left",
      },
      createdAt: now,
      expiresAt: now + 15 * 60 * 1000,
    });

    return { roomId, code };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();
  },
});

export const updateSettings = mutation({
  args: {
    roomId: v.id("rooms"),
    settings: v.any(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    await ctx.db.patch(args.roomId, {
      settings: { ...room.settings, ...args.settings },
    });
  },
});

export const setStatus = mutation({
  args: {
    roomId: v.id("rooms"),
    status: v.union(v.literal("waiting"), v.literal("active")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, { status: args.status });
  },
});

export const deleteRoom = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    // Delete all participants first
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    for (const p of participants) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.roomId);
  },
});
```

### Verification
- [x] File saved at `convex/rooms.ts`
- [x] Convex dev server shows functions synced
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 4.3 COMPLETE**: Room functions created

---

## Task 4.4: Create Participant Functions

### File to Create: `convex/participants.ts`

### Code
```typescript
// convex/participants.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: {
    roomCode: v.string(),
    sessionId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_code", (q) => q.eq("code", args.roomCode))
      .first();

    if (!room) throw new Error("Room not found");

    // Check for existing participant with same session (reconnect)
    const existing = await ctx.db
      .query("participants")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (existing && existing.roomId === room._id) {
      await ctx.db.patch(existing._id, {
        isConnected: true,
        lastSeen: Date.now(),
      });
      return { participantId: existing._id, isReconnect: true, room };
    }

    const now = Date.now();
    const participantId = await ctx.db.insert("participants", {
      roomId: room._id,
      sessionId: args.sessionId,
      name: args.name,
      isConnected: true,
      stats: {
        wpm: 0,
        accuracy: 0,
        progress: 0,
        wordsTyped: 0,
        timeElapsed: 0,
        isFinished: false,
      },
      joinedAt: now,
      lastSeen: now,
    });

    return { participantId, isReconnect: false, room };
  },
});

export const updateStats = mutation({
  args: {
    participantId: v.id("participants"),
    stats: v.object({
      wpm: v.number(),
      accuracy: v.number(),
      progress: v.number(),
      wordsTyped: v.number(),
      timeElapsed: v.number(),
      isFinished: v.boolean(),
    }),
    typedText: v.optional(v.string()),
    targetText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      stats: args.stats,
      typedText: args.typedText,
      targetText: args.targetText,
      lastSeen: Date.now(),
    });
  },
});

export const listByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("participants")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const kick = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.participantId);
  },
});

export const resetStats = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      stats: {
        wpm: 0,
        accuracy: 0,
        progress: 0,
        wordsTyped: 0,
        timeElapsed: 0,
        isFinished: false,
      },
      typedText: undefined,
      targetText: undefined,
    });
  },
});

export const disconnect = mutation({
  args: { participantId: v.id("participants") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.participantId, {
      isConnected: false,
      lastSeen: Date.now(),
    });
  },
});
```

### Verification
- [x] File saved at `convex/participants.ts`
- [x] Convex dev server shows functions synced
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 4.4 COMPLETE**: Participant functions created

---

## Task 4.5: Update main.tsx with ConvexProvider

### File to Modify: `src/main.tsx`

### Current Content (approximately)
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

### Replace With
```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App.tsx";
import "./index.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConvexProvider>
  </StrictMode>
);
```

### Verification
- [x] File updated
- [x] `bun run build` succeeds
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 4.5 COMPLETE**: ConvexProvider added to main.tsx

---

## Task 4.6: Test Convex Connection

### Steps
1. Start the dev server: `bun run dev`
2. Start Convex: `bunx convex dev` (in another terminal)
3. Open http://localhost:3000
4. Open browser DevTools Console
5. Check for Convex connection messages (no errors)

### Verification
- [x] No Convex connection errors in console
- [x] App loads without crashing

### Checkbox
- [x] **TASK 4.6 COMPLETE**: Convex connection verified

---

## Phase 4 Complete Checklist
- [x] Task 4.1: Convex project initialized (requires `bunx convex dev`)
- [x] Task 4.2: Database schema created
- [x] Task 4.3: Room functions created
- [x] Task 4.4: Participant functions created
- [x] Task 4.5: ConvexProvider added
- [x] Task 4.6: Connection verified

---

# PHASE 5: Component Migration

## Overview
Migrate components from the old Next.js structure. The old files are deleted but can be referenced from git history on the `main` branch.

---

## Task 5.1: Create useSessionId Hook

### File to Create: `src/hooks/useSessionId.ts`

### Purpose
Generate and persist a unique session ID for each browser.

### Code
```typescript
// src/hooks/useSessionId.ts
import { useState, useEffect } from "react";

const SESSION_ID_KEY = "typesetgo_session_id";

export function useSessionId(): string {
  const [sessionId, setSessionId] = useState<string>("");

  useEffect(() => {
    let id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
```

### Verification
- [x] File created at `src/hooks/useSessionId.ts`
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 5.1 COMPLETE**: useSessionId hook created

---

## Task 5.2: Create useSound Hook

### File to Create: `src/hooks/useSound.ts`

### Code
```typescript
// src/hooks/useSound.ts
import { useRef, useCallback } from "react";
import { getRandomSoundUrl, SOUND_MANIFEST } from "@/lib/sounds";

export function useSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((category: string, pack: string) => {
    const url = getRandomSoundUrl(SOUND_MANIFEST, category, pack);
    if (!url) return;

    // Reuse or create audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = url;
    audioRef.current.volume = 0.5;
    audioRef.current.play().catch(() => {
      // Ignore autoplay errors
    });
  }, []);

  const playTypingSound = useCallback(
    (pack: string) => {
      playSound("typing", pack);
    },
    [playSound]
  );

  const playWarningSound = useCallback(
    (pack: string) => {
      playSound("warning", pack);
    },
    [playSound]
  );

  return { playTypingSound, playWarningSound, playSound };
}
```

### Verification
- [x] File created at `src/hooks/useSound.ts`
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 5.2 COMPLETE**: useSound hook created

---

## Task 5.3: Create Zod Schemas

### File to Create: `src/lib/schemas.ts`

### Code
```typescript
// src/lib/schemas.ts
import { z } from "zod";

export const joinRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(20, "Name must be 20 characters or less"),
  code: z
    .string()
    .length(5, "Code must be 5 characters")
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, "Code must be alphanumeric"),
});

export const hostRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(20, "Name must be 20 characters or less"),
});

export const presetTextSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(10000, "Text must be 10,000 characters or less"),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type HostRoomInput = z.infer<typeof hostRoomSchema>;
export type PresetTextInput = z.infer<typeof presetTextSchema>;
```

### Verification
- [x] File created at `src/lib/schemas.ts`
- [x] No TypeScript errors

### Checkbox
- [x] **TASK 5.3 COMPLETE**: Zod schemas created

---

## Task 5.4: Migrate Connect Page

### File to Modify: `src/pages/Connect.tsx`

### Replace entire file with:
```typescript
// src/pages/Connect.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  joinRoomSchema,
  hostRoomSchema,
  type JoinRoomInput,
  type HostRoomInput,
} from "@/lib/schemas";

export default function Connect() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"host" | "join">("host");

  const hostForm = useForm<HostRoomInput>({
    resolver: zodResolver(hostRoomSchema),
    defaultValues: { name: "" },
  });

  const joinForm = useForm<JoinRoomInput>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: { name: "", code: "" },
  });

  const onHostSubmit = (data: HostRoomInput) => {
    navigate(`/connect/host?name=${encodeURIComponent(data.name)}`);
  };

  const onJoinSubmit = (data: JoinRoomInput) => {
    navigate(
      `/connect/join?name=${encodeURIComponent(data.name)}&code=${data.code.toUpperCase()}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)]">
        Connect
      </h1>

      {/* Tab Buttons */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeTab === "host" ? "default" : "outline"}
          onClick={() => setActiveTab("host")}
        >
          Host a Room
        </Button>
        <Button
          variant={activeTab === "join" ? "default" : "outline"}
          onClick={() => setActiveTab("join")}
        >
          Join a Room
        </Button>
      </div>

      {/* Host Form */}
      {activeTab === "host" && (
        <form
          onSubmit={hostForm.handleSubmit(onHostSubmit)}
          className="w-full max-w-sm space-y-4 p-6 rounded-lg bg-[var(--surface)]"
        >
          <div>
            <Label htmlFor="host-name">Your Name</Label>
            <Input
              id="host-name"
              {...hostForm.register("name")}
              placeholder="Enter your name"
              className="mt-1"
            />
            {hostForm.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {hostForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Create Room
          </Button>
        </form>
      )}

      {/* Join Form */}
      {activeTab === "join" && (
        <form
          onSubmit={joinForm.handleSubmit(onJoinSubmit)}
          className="w-full max-w-sm space-y-4 p-6 rounded-lg bg-[var(--surface)]"
        >
          <div>
            <Label htmlFor="join-name">Your Name</Label>
            <Input
              id="join-name"
              {...joinForm.register("name")}
              placeholder="Enter your name"
              className="mt-1"
            />
            {joinForm.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">
                {joinForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="join-code">Room Code</Label>
            <Input
              id="join-code"
              {...joinForm.register("code")}
              placeholder="XXXXX"
              className="mt-1 uppercase tracking-widest text-center font-mono"
              maxLength={5}
            />
            {joinForm.formState.errors.code && (
              <p className="text-red-500 text-sm mt-1">
                {joinForm.formState.errors.code.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Join Room
          </Button>
        </form>
      )}

      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mt-8"
      >
        ← Back to Practice
      </Button>
    </div>
  );
}
```

### Verification
- [x] File updated
- [x] `bun run build` succeeds
- [x] Navigate to `/connect` works
- [x] Forms validate properly

### Checkbox
- [x] **TASK 5.4 COMPLETE**: Connect page migrated with forms

---

## Task 5.5: Migrate Host Page with Convex

### File to Modify: `src/pages/Host.tsx`

### Replace entire file with:
```typescript
// src/pages/Host.tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useSessionId } from "@/hooks/useSessionId";

export default function Host() {
  const [searchParams] = useSearchParams();
  const hostName = searchParams.get("name") || "Host";
  const sessionId = useSessionId();

  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = useMutation(api.rooms.create);
  const setStatus = useMutation(api.rooms.setStatus);
  const deleteRoom = useMutation(api.rooms.deleteRoom);
  const kickParticipant = useMutation(api.participants.kick);
  const resetParticipant = useMutation(api.participants.resetStats);

  // Get room data reactively
  const room = useQuery(
    api.rooms.getByCode,
    roomCode ? { code: roomCode } : "skip"
  );

  // Get participants reactively
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip"
  );

  // Create room on mount
  useEffect(() => {
    if (!sessionId || isCreating || roomCode) return;

    const initRoom = async () => {
      setIsCreating(true);
      try {
        const result = await createRoom({
          hostName,
          hostSessionId: sessionId,
        });
        setRoomCode(result.code);
      } catch (error) {
        console.error("Failed to create room:", error);
      }
      setIsCreating(false);
    };

    initRoom();
  }, [sessionId, hostName, createRoom, isCreating, roomCode]);

  const handleStartTest = async () => {
    if (room) {
      await setStatus({ roomId: room._id, status: "active" });
    }
  };

  const handleStopTest = async () => {
    if (room) {
      await setStatus({ roomId: room._id, status: "waiting" });
    }
  };

  const handleResetAll = async () => {
    if (participants) {
      for (const p of participants) {
        await resetParticipant({ participantId: p._id });
      }
    }
  };

  const handleKick = async (participantId: string) => {
    await kickParticipant({ participantId: participantId as any });
  };

  const handleDeleteRoom = async () => {
    if (room) {
      await deleteRoom({ roomId: room._id });
      setRoomCode(null);
    }
  };

  if (!sessionId) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-12">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
        Host Room
      </h1>
      <p className="text-lg mb-4 text-[var(--text-secondary)]">
        Hosting as: {hostName}
      </p>

      {/* Room Code Display */}
      {roomCode && (
        <div className="mb-8 text-center">
          <p className="text-sm text-[var(--text-secondary)] mb-2">Room Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-[var(--brand-primary)]">
            {roomCode}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 mb-8">
        {room?.status === "waiting" ? (
          <Button onClick={handleStartTest}>Start Test</Button>
        ) : (
          <Button onClick={handleStopTest} variant="destructive">
            Stop Test
          </Button>
        )}
        <Button onClick={handleResetAll} variant="outline">
          Reset All
        </Button>
      </div>

      {/* Participants List */}
      <div className="w-full max-w-2xl p-6 rounded-lg bg-[var(--surface)]">
        <h2 className="text-xl font-bold mb-4">
          Participants ({participants?.length || 0})
        </h2>
        {participants && participants.length > 0 ? (
          <ul className="space-y-3">
            {participants.map((p) => (
              <li
                key={p._id}
                className="flex items-center justify-between p-3 rounded bg-[var(--bg-primary)]"
              >
                <div>
                  <span className="font-medium">{p.name}</span>
                  {p.stats.isFinished && (
                    <span className="ml-2 text-green-500">✓</span>
                  )}
                  <span className="ml-4 text-sm text-[var(--text-secondary)]">
                    {p.stats.wpm} WPM | {p.stats.accuracy.toFixed(0)}%
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleKick(p._id)}
                >
                  Kick
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[var(--text-secondary)]">
            Waiting for participants to join...
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 flex gap-4">
        <Button variant="destructive" onClick={handleDeleteRoom}>
          Close Room
        </Button>
        <Link to="/connect">
          <Button variant="ghost">← Back</Button>
        </Link>
      </div>
    </div>
  );
}
```

### Verification
- [x] File updated
- [x] `bun run build` succeeds
- [x] Room creation works (check Convex dashboard)

### Checkbox
- [x] **TASK 5.5 COMPLETE**: Host page migrated with Convex

---

## Task 5.6: Migrate Join Page with Convex

### File to Modify: `src/pages/Join.tsx`

### Replace entire file with:
```typescript
// src/pages/Join.tsx
import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { useSessionId } from "@/hooks/useSessionId";

export default function Join() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const name = searchParams.get("name") || "Guest";
  const code = searchParams.get("code")?.toUpperCase() || "";
  const sessionId = useSessionId();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const joinRoom = useMutation(api.participants.join);
  const updateStats = useMutation(api.participants.updateStats);

  // Get room data reactively
  const room = useQuery(api.rooms.getByCode, code ? { code } : "skip");

  // Get all participants reactively
  const participants = useQuery(
    api.participants.listByRoom,
    room ? { roomId: room._id } : "skip"
  );

  // Join room on mount
  useEffect(() => {
    if (!sessionId || !code || isJoining || participantId) return;

    const doJoin = async () => {
      setIsJoining(true);
      try {
        const result = await joinRoom({
          roomCode: code,
          sessionId,
          name,
        });
        setParticipantId(result.participantId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to join room");
      }
      setIsJoining(false);
    };

    doJoin();
  }, [sessionId, code, name, joinRoom, isJoining, participantId]);

  // Find current participant
  const currentParticipant = participants?.find((p) => p._id === participantId);

  // Check if kicked
  useEffect(() => {
    if (participantId && participants && !currentParticipant) {
      setError("You have been removed from the room");
      setParticipantId(null);
    }
  }, [participantId, participants, currentParticipant]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-500 text-xl mb-4">{error}</p>
        <Link to="/connect">
          <Button>← Back to Connect</Button>
        </Link>
      </div>
    );
  }

  if (!sessionId || isJoining) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Joining room...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pt-12">
      <h1 className="text-3xl font-bold mb-2 text-[var(--text-primary)]">
        Room: {code}
      </h1>
      <p className="text-lg mb-4 text-[var(--text-secondary)]">
        Joined as: {name}
      </p>

      {/* Room Status */}
      <div className="mb-8">
        {room?.status === "active" ? (
          <span className="px-4 py-2 bg-green-600 rounded-full text-white">
            Test Active
          </span>
        ) : (
          <span className="px-4 py-2 bg-yellow-600 rounded-full text-white">
            Waiting for host to start...
          </span>
        )}
      </div>

      {/* Your Stats */}
      {currentParticipant && (
        <div className="w-full max-w-md p-6 rounded-lg bg-[var(--surface)] mb-8">
          <h2 className="text-xl font-bold mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[var(--text-secondary)]">WPM</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.wpm}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Accuracy</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.accuracy.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Progress</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.progress.toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Status</p>
              <p className="text-2xl font-bold">
                {currentParticipant.stats.isFinished ? "✓ Done" : "Typing..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other Participants */}
      <div className="w-full max-w-md p-6 rounded-lg bg-[var(--surface)]">
        <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
        {participants && participants.length > 0 ? (
          <ul className="space-y-2">
            {[...participants]
              .sort((a, b) => b.stats.wpm - a.stats.wpm)
              .map((p, i) => (
                <li
                  key={p._id}
                  className={`flex items-center justify-between p-2 rounded ${
                    p._id === participantId
                      ? "bg-[var(--brand-primary)]/20"
                      : "bg-[var(--bg-primary)]"
                  }`}
                >
                  <span>
                    #{i + 1} {p.name}
                    {p._id === participantId && " (You)"}
                  </span>
                  <span className="font-mono">
                    {p.stats.wpm} WPM
                  </span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-[var(--text-secondary)]">No participants yet</p>
        )}
      </div>

      <Link to="/connect" className="mt-8">
        <Button variant="ghost">← Leave Room</Button>
      </Link>
    </div>
  );
}
```

### Verification
- [x] File updated
- [x] `bun run build` succeeds
- [x] Can join a room created by Host page

### Checkbox
- [x] **TASK 5.6 COMPLETE**: Join page migrated with Convex

---

## Task 5.7: Verify Multiplayer Works End-to-End

### Steps
1. Open two browser windows (or use incognito)
2. In window 1: Go to `/connect`, enter name, click "Create Room"
3. Copy the room code displayed
4. In window 2: Go to `/connect`, enter name and room code, click "Join Room"
5. Verify participant appears in window 1's list
6. Click "Start Test" in window 1
7. Verify status changes in window 2

### Verification
- [ ] Room creation works (manual test pending)
- [ ] Joining works (manual test pending)
- [ ] Participant list updates in real-time (manual test pending)
- [ ] Start/Stop works (manual test pending)
- [ ] Kick works (manual test pending)

### Checkbox
- [ ] **TASK 5.7 COMPLETE**: Multiplayer end-to-end verified (manual testing required)

---

## Phase 5 Complete Checklist
- [x] Task 5.1: useSessionId hook created
- [x] Task 5.2: useSound hook created
- [x] Task 5.3: Zod schemas created
- [x] Task 5.4: Connect page migrated
- [x] Task 5.5: Host page migrated with Convex
- [x] Task 5.6: Join page migrated with Convex
- [ ] Task 5.7: Multiplayer verified (manual testing required)

### Additional Work Completed (not in original plan)
- [x] Updated eslint.config.js to ignore `.next` and `convex/_generated` directories
- [x] Fixed lint errors in useSessionId.ts (replaced useState+useEffect with useSyncExternalStore)
- [x] Fixed lint errors in Host.tsx (proper Convex Id type)
- [x] Fixed lint errors in Join.tsx (derived state instead of setState in effect)
- [x] Added eslint-disable for Shadcn button.tsx (standard pattern)

---

# PHASE 6: Migrate TypingPractice Component

## Overview
This is the largest component. It needs to be migrated from the old Next.js version.

---

## Task 6.1: Get Old TypingPractice Source

### Steps
1. Switch to main branch temporarily: `git stash && git checkout main`
2. Copy `components/TypingPractice.tsx` content
3. Switch back: `git checkout migration/bun-vite-convex && git stash pop`

### Command to View Old File
```bash
git show main:components/TypingPractice.tsx
```

### Checkbox
- [x] **TASK 6.1 COMPLETE**: Retrieved old TypingPractice source (via `git show main:components/TypingPractice.tsx`)

---

## Task 6.2: Create TypingPractice Component

### File to Create: `src/components/typing/TypingPractice.tsx`

### Key Changes from Old Version
1. Remove `"use client"` directive
2. Replace `next/link` imports with `react-router-dom`
3. Replace `useSearchParams` from `next/navigation` with `react-router-dom`
4. Replace API fetch for sounds/themes with static imports from `@/lib/sounds` and `@/lib/themes`
5. Use `@/components/ui/*` for Shadcn components

### Migration Checklist
- [x] Remove `"use client"`
- [x] Import `Link` from `react-router-dom`
- [x] Import `useSearchParams` from `react-router-dom` (not needed for TypingPractice)
- [x] Replace `fetch("/api/sounds")` with `SOUND_MANIFEST` from `@/lib/sounds`
- [x] Replace `fetch("/api/themes")` with `THEME_MANIFEST` from `@/lib/themes`
- [x] Update any `next/navigation` router usage

### Checkbox
- [x] **TASK 6.2 COMPLETE**: TypingPractice component migrated

---

## Task 6.3: Create Remaining Modal Components

### Files to Create
- [x] `src/components/settings/SoundSettingsModal.tsx`
- [x] `src/components/settings/GhostWriterSettingsModal.tsx`
- [x] `src/components/settings/ThemeSettingsModal.tsx` (integrated into TypingPractice component)

### Additional Components Created
- [x] `src/components/typing/SoundController.tsx`
- [x] `src/components/typing/GhostWriterController.tsx`
- [x] `src/components/typing/ColorPicker.tsx`
- [x] `src/components/typing/TypingPractice.tsx`

### For Each Modal
1. Get source from `git show main:components/[Name].tsx`
2. Remove `"use client"`
3. Replace Shadcn imports if needed
4. Fix type imports (use `import type`)
5. Fix lint errors (use `useSyncExternalStore` instead of `useEffect` for mounted state)
6. Save to new location

### Checkbox
- [x] **TASK 6.3 COMPLETE**: Sound and GhostWriter modals + controllers migrated, Theme modal integrated

---

## Task 6.4: Update Home Page to Use TypingPractice

### File to Modify: `src/pages/Home.tsx`

### Code
```typescript
// src/pages/Home.tsx
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import TypingPractice from "@/components/typing/TypingPractice";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center p-4">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">
          TypeSetGo
        </h1>
        <Link to="/connect">
          <Button variant="outline" size="sm">
            Connect
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <TypingPractice />
      </main>
    </div>
  );
}
```

### Checkbox
- [x] **TASK 6.4 COMPLETE**: Home page updated

---

## Phase 6 Complete Checklist
- [x] Task 6.1: Old source retrieved (via git show)
- [x] Task 6.2: TypingPractice migrated
- [x] Task 6.3: Modal components migrated (Sound + GhostWriter + Theme integrated)
- [x] Task 6.4: Home page updated

---

# PHASE 7: Docker Setup

## Task 7.1: Create Dockerfile

### File to Create: `docker/Dockerfile`

### Code
```dockerfile
FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Checkbox
- [x] **TASK 7.1 COMPLETE**: Dockerfile created

---

## Task 7.2: Create nginx.conf

### File to Create: `docker/nginx.conf`

### Code
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### Checkbox
- [x] **TASK 7.2 COMPLETE**: nginx.conf created

---

## Task 7.3: Create docker-compose.yml

### File to Create: `docker/docker-compose.yml`

### Code
```yaml
version: '3.8'

services:
  typesetgo:
    build:
      context: ..
      dockerfile: docker/Dockerfile
      args:
        VITE_CONVEX_URL: ${VITE_CONVEX_URL}
    ports:
      - "3000:80"
    restart: unless-stopped
```

### Checkbox
- [x] **TASK 7.3 COMPLETE**: docker-compose.yml created

---

## Task 7.3b: Create .dockerignore (Added)

### Checkbox
- [x] **TASK 7.3b COMPLETE**: .dockerignore created for optimized builds

---

## Task 7.4: Test Docker Build

### Commands
```bash
cd docker
docker-compose build
docker-compose up -d
# Visit http://localhost:3000
docker-compose down
```

### Checkbox
- [ ] **TASK 7.4 COMPLETE**: Docker build tested

---

# PHASE 8: Final Cleanup

## Task 8.1: Update README.md

### Add These Sections to README

```markdown
## Development

### Prerequisites
- [Bun](https://bun.sh) v1.0+
- [Convex](https://convex.dev) account

### Setup
1. Clone the repo
2. Run `bun install`
3. Run `bunx convex dev` to start Convex
4. Run `bun run dev` to start the dev server
5. Open http://localhost:3000

### Commands
| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server |
| `bun run build` | Production build |
| `bun run test` | Run tests |
| `bun run lint` | Run linter |
| `bunx convex dev` | Start Convex dev |

## Deployment

### Docker
```bash
cd docker
VITE_CONVEX_URL=https://your-project.convex.cloud docker-compose up -d
```
```

### Checkbox
- [x] **TASK 8.1 COMPLETE**: README updated with new stack (Bun, Vite, Convex)

---

## Task 8.2: Run Final Verification

### Commands
```bash
bun run lint
bun run test:run
bun run build
```

### Verification
- [x] Lint passes (only minor warnings)
- [x] All tests pass (12 tests)
- [x] Build succeeds

### Checkbox
- [x] **TASK 8.2 COMPLETE**: Final verification passed

---

## Task 8.3: Commit Migration

### Commands
```bash
git add -A
git commit -m "Complete migration to Bun + Vite + Convex

- Migrated from Next.js to Vite + React Router
- Replaced Socket.io with Convex real-time
- Added Shadcn/UI components
- Added react-hook-form + zod validation
- Set up Vitest for testing
- Added Docker deployment config"
```

### Checkbox
- [ ] **TASK 8.3 COMPLETE**: Migration committed

---

# 📊 Final Checklist

## All Phases
- [x] Phase 0: Preparation
- [x] Phase 1: Project Scaffolding
- [x] Phase 2: Tailwind + Shadcn
- [x] Phase 3: Routing
- [x] Phase 4: Convex Setup
- [x] Phase 5: Component Migration
- [x] Phase 6: TypingPractice Migration
- [x] Phase 7: Docker Setup
- [x] Phase 8: Final Cleanup (pending commit only)

## Feature Parity
- [x] Typing practice (time, words, quote, preset modes)
- [x] Ghost writer
- [x] Sound effects
- [x] Theme customization
- [x] Settings persistence
- [x] Plan mode (components + TypingPractice integration)
- [x] Connect/Multiplayer (pages migrated, pending manual test)

---

# PHASE 9: Plan Mode Migration (Added)

## Task 9.1: Install dnd-kit Dependencies
- [x] **TASK 9.1 COMPLETE**: Installed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

## Task 9.2: Create Plan Types
- [x] **TASK 9.2 COMPLETE**: `src/types/plan.ts` already existed with correct types

## Task 9.3: Migrate Plan Components
- [x] Created `src/components/plan/PlanBuilderModal.tsx` - Main plan builder with drag-and-drop
- [x] Created `src/components/plan/PlanNavigation.tsx` - Navigation buttons
- [x] Created `src/components/plan/PlanResultsModal.tsx` - Results display
- [x] Created `src/components/plan/PlanSplash.tsx` - Splash screen before each step
- [x] Created `src/components/plan/index.ts` - Barrel export
- [x] Fixed type import (DragEndEvent must be type-only import)
- [x] **TASK 9.3 COMPLETE**: All Plan components migrated

## Task 9.4: Integrate Plan Mode into TypingPractice
- [x] Added Plan mode state variables
- [x] Added Plan mode handlers (handleStartPlan, handlePlanStepStart, handlePlanNext, etc.)
- [x] Added Plan button to toolbar
- [x] Added PlanBuilderModal, PlanSplash, PlanResultsModal renders
- [x] Added plan navigation buttons when step is complete
- [x] Fixed lint error (setState in effect → ref-based pattern)
- [x] **TASK 9.4 COMPLETE**: Plan mode integrated into TypingPractice

## Task 9.5: Fix Lint Warnings
- [x] Fixed unused eslint-disable directives in TypingPractice.tsx
- [x] Added missing `generateTest` to useEffect dependency array
- [x] **TASK 9.5 COMPLETE**: All lint warnings resolved

## Phase 9 Complete Checklist
- [x] Task 9.1: dnd-kit installed
- [x] Task 9.2: Plan types verified
- [x] Task 9.3: Plan components migrated
- [x] Task 9.4: Plan mode integrated into TypingPractice
- [x] Task 9.5: Lint warnings fixed

---

*Last updated: January 14, 2026 (Plan mode migration complete)*
*Current branch: migration/bun-vite-convex*
