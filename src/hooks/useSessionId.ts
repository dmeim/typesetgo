// src/hooks/useSessionId.ts
import { useSyncExternalStore } from "react";

const SESSION_ID_KEY = "typesetgo_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  
  let id = localStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// No-op subscribe since session ID doesn't change
const subscribe = () => () => {};

export function useSessionId(): string {
  return useSyncExternalStore(subscribe, getSessionId, () => "");
}
