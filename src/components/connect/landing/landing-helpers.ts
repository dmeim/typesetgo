import { CONNECT_CODE_ALPHABET, CONNECT_CODE_LENGTH } from "@/lib/connect-types";
import { connectErrorCode, readableError } from "@/components/connect/connect-errors";

/** Relative time for recent-room rows, e.g. "just now", "12 min ago", "3 h ago". */
export function formatAgo(timestamp: number, now: number) {
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Uppercases and drops anything outside the code alphabet. */
export function sanitizeCode(value: string) {
  return [...value.toUpperCase()].filter((char) => CONNECT_CODE_ALPHABET.includes(char)).join("").slice(0, CONNECT_CODE_LENGTH);
}

const JOIN_ERRORS: Record<string, string> = {
  not_found: "No live room uses that code. Check the code on the host's screen.",
  full: "This room is full. Ask the host to remove someone or open another room.",
  forbidden: "This browser already holds a different seat in that room. Ask the host to remove it, or join from another browser.",
};

export function joinErrorMessage(error: unknown) {
  const code = connectErrorCode(error);
  if (code && JOIN_ERRORS[code]) return JOIN_ERRORS[code];
  return readableError(error, "Couldn't join the room. Check your connection and try again.");
}
