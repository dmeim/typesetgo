import { multiplayerSessionId } from "@/lib/multiplayer-identity";

export function useSessionId(): string {
  return multiplayerSessionId;
}
