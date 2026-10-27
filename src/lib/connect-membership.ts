// Remembers which participant record this browser holds in each room, so a
// refresh or reconnect resumes the same seat instead of joining again.
export type ConnectMembership = { participantId: string; name: string };

const membershipKey = (roomId: string) => `typesetgo_connect_membership:${roomId}`;
const NAME_KEY = "typesetgo_connect_name";
const HOST_NAME_KEY = "typesetgo_connect_host_name";

function read(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* Storage is optional; the server can still rejoin by session id. */ }
}

export function loadMembership(roomId: string): ConnectMembership | null {
  try {
    const value = JSON.parse(read(membershipKey(roomId)) ?? "null") as Partial<ConnectMembership> | null;
    return value && typeof value.participantId === "string" && typeof value.name === "string"
      ? { participantId: value.participantId, name: value.name } : null;
  } catch {
    return null;
  }
}

/** `rememberName` prefills the next guest join; only a guest join sets it, so an account's username never does. */
export function saveMembership(roomId: string, membership: ConnectMembership, { rememberName = false } = {}) {
  write(membershipKey(roomId), JSON.stringify(membership));
  if (rememberName) write(NAME_KEY, membership.name);
}

export function clearMembership(roomId: string) {
  write(membershipKey(roomId), null);
}

export const loadParticipantName = () => read(NAME_KEY) ?? "";
export const loadHostName = () => read(HOST_NAME_KEY) ?? "";
export const saveHostName = (name: string) => write(HOST_NAME_KEY, name);
