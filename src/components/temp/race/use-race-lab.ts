import { useCallback, useMemo, useState } from "react";
import { DEFAULT_YOU, simulateResults, type Difficulty, type RaceResult, type Role, type Screen, type YouProfile } from "./race-mock";

export interface RaceSettings {
  difficulty: Difficulty;
  words: number;
}

/** Shared pretend state that lives across the four screens of every concept. */
export interface RaceLab {
  role: Role;
  setRole: (role: Role) => void;
  you: YouProfile;
  setYou: (patch: Partial<YouProfile>) => void;
  settings: RaceSettings;
  setSettings: (patch: Partial<RaceSettings>) => void;
  /** The last finished race, or a scripted one when results are opened directly. */
  results: RaceResult[];
  saveResults: (results: RaceResult[]) => void;
}

export interface ConceptProps {
  screen: Screen;
  lab: RaceLab;
  go: (screen: Screen) => void;
}

export function useRaceLab(): RaceLab {
  const [role, setRole] = useState<Role>("host");
  const [you, setYouState] = useState<YouProfile>(DEFAULT_YOU);
  const [settings, setSettingsState] = useState<RaceSettings>({ difficulty: "medium", words: 25 });
  const [saved, setSaved] = useState<RaceResult[] | null>(null);
  const fallback = useMemo(() => simulateResults(you, role), [you, role]);

  const setYou = useCallback((patch: Partial<YouProfile>) => setYouState((current) => ({ ...current, ...patch })), []);
  const setSettings = useCallback((patch: Partial<RaceSettings>) => setSettingsState((current) => ({ ...current, ...patch })), []);

  return { role, setRole, you, setYou, settings, setSettings, results: saved ?? fallback, saveResults: setSaved };
}
