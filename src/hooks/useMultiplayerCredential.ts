import { multiplayerCredential } from "@/lib/multiplayer-identity";

export function useMultiplayerCredential(): string {
  return multiplayerCredential;
}
