import type { TypingStats } from "@/components/typing/TypingArea";

export interface FixtureMutation {
  name: string;
  args: Record<string, unknown>;
  at: number;
}

declare global {
  interface Window {
    __areaReports: TypingStats[];
    __areaFinishes: TypingStats[];
    __mutations: FixtureMutation[];
    __preferences: Record<string, unknown> | null | undefined;
    __setPreferences: (value: Record<string, unknown> | null) => void;
    __sessionDelay?: number;
  }
}

window.__areaReports ??= [];
window.__areaFinishes ??= [];
window.__mutations ??= [];
if (!Object.hasOwn(window, "__preferences")) window.__preferences = null;

export const fixture = window;
