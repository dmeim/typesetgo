import type { Mode, SettingsState } from "@/lib/typing-constants";

export type PlanItem = {
  id: string;
  mode: Mode;
  settings: Partial<SettingsState>; // Specific config for the chosen mode
  metadata: {
    title: string;
    subtitle: string;
  };
};

export type Plan = PlanItem[];

export type PlanStepResult = {
  wpm: number;
  accuracy: number;
  raw: number;
  consistency: number;
  time: number;
  date: number;
  mode: string;
  metadata?: {
    title: string;
    subtitle: string;
  };
};
