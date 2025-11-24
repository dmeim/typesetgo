
import { Mode, SettingsState } from "@/lib/typing-constants";

export type PlanItem = {
  id: string;
  mode: Mode;
  settings: Partial<SettingsState>; // Specific config for the chosen mode
  metadata: {
    title: string;
    subtitle: string;
  };
  syncSettings: {
    waitForAll: boolean;
    zenWaiting: boolean; // Only relevant if waitForAll is true
  };
};

export type Plan = PlanItem[];

export type UserPlanProgress = {
  userId: string;
  currentStepIndex: number;
  // Map step ID to result stats. 
  // We use the same stats structure as TypingPractice: { wpm, accuracy, ... }
  stepResults: Record<string, PlanStepResult>; 
  status: 'typing' | 'waiting' | 'zen_waiting';
};

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
