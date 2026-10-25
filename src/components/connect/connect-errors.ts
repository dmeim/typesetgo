import { ConvexError } from "convex/values";

export type ConnectErrorCode = "missing" | "forbidden" | "ended" | "not_found" | "full" | "not_member" | "removed";

type ConnectErrorData = { code?: unknown; message?: unknown };

function errorData(error: unknown): ConnectErrorData | null {
  if (error instanceof ConvexError && typeof error.data === "object" && error.data !== null) return error.data as ConnectErrorData;
  return null;
}

/** The branchable `code` of a Connect `ConvexError`, if any. */
export function connectErrorCode(error: unknown): ConnectErrorCode | null {
  const code = errorData(error)?.code;
  return typeof code === "string" ? code as ConnectErrorCode : null;
}

/**
 * A message safe to show users. Convex wraps plain server errors as
 * "[CONVEX M(fn)] [Request ID: …] Server Error\nUncaught Error: <message>\n    at …".
 */
export function readableError(error: unknown, fallback = "Something went wrong. Try again.") {
  const message = errorData(error)?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (!(error instanceof Error)) return fallback;
  const uncaught = /Uncaught (?:Error|ConvexError):\s*([^\n]+)/.exec(error.message);
  if (uncaught?.[1]) return uncaught[1].trim();
  if (error.message.startsWith("[CONVEX") || !error.message.trim()) return fallback;
  return error.message;
}
