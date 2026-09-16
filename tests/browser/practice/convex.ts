import { useCallback, useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";
const fixture = window as any;
fixture.__mutations ??= [];
if (!("__preferences" in fixture)) fixture.__preferences = null;
fixture.__setPreferences = (value: any) => { fixture.__preferences = value; window.dispatchEvent(new Event("fixture-preferences")); };
const subscribe = (onChange: () => void) => { window.addEventListener("fixture-preferences", onChange); return () => window.removeEventListener("fixture-preferences", onChange); };
export const useQuery = (reference: any) => {
  const name = getFunctionName(reference);
  return useSyncExternalStore(subscribe, () => name === "preferences:getPreferences" ? fixture.__preferences : null);
};
export const useMutation = (reference: any) => {
  const name = getFunctionName(reference);
  return useCallback(async (args: any) => {
    if (!location.search.includes("ranked")) throw new Error("Fixture blocked unexpected mutation: " + name);
    fixture.__mutations.push({ name, args, at: performance.now() });
    if (name === "users:getOrCreateUser") return "fixture-user";
    if (name === "typingSessions:startSession") {
      await new Promise(resolve => setTimeout(resolve, fixture.__sessionDelay ?? 800));
      return { sessionId: "fixture-session-" + fixture.__mutations.length, targetText: args.mode === "quote" || args.mode === "preset" ? args.targetText : Array(args.wordTarget || 25).fill("dog").join(" ") };
    }
    if (name === "typingSessions:recordProgress" || name === "typingSessions:cancelSession") return { success: true };
    if (name === "typingSessions:finalizeSession") return { resultId: "fixture-result", wpm: 40, accuracy: 100, duration: 3000, isValid: true, wordsCorrect: 10, wordsIncorrect: 0, charsMissed: 0, charsExtra: 0, newAchievements: [] };
    if (name === "testResults:saveResult") return { resultId: "fixture-result", newAchievements: [] };
    if (name === "preferences:savePreferences") return { success: true };
    throw new Error("Fixture blocked unsupported mutation: " + name);
  }, [name]);
};
export const useConvexAuth = () => ({ isLoading: false, isAuthenticated: location.search.includes("ranked") });
