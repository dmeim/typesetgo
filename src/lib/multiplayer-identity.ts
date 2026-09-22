// Browser-wide identity is intentional: tabs share ownership and reconnect the same
// membership. A storage-denied document retains its own stable in-memory identity.
function persistedValue(key: string, create: () => string, valid: (value: string) => boolean) {
  let value: string | null = null;
  try { value = localStorage.getItem(key); } catch { /* Storage is optional. */ }
  if (value && valid(value)) return value;
  value = create();
  try { localStorage.setItem(key, value); } catch { /* Keep the in-memory value. */ }
  return value;
}

// Initialization is outside React render and external-store snapshot reads.
export const multiplayerSessionId = typeof window === "undefined" ? "" : persistedValue(
  "typesetgo_session_id", () => crypto.randomUUID(), (value) => value.length > 0,
);
export const multiplayerCredential = typeof window === "undefined" ? "" : persistedValue(
  "typesetgo_multiplayer_credential",
  () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  (value) => /^[a-f0-9]{64}$/.test(value),
);
