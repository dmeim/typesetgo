import { describe, expect, it } from "vitest";
import { PLAYERS, findPlayer, playerId } from "@/components/temp/settings/mock-players";
import { PROFILE_TABS, parseProfilePath, profilePath } from "@/components/temp/settings/profile-routes";

const BASE = "/temp-profile";

describe("profile routes", () => {
  it("treats the bare path and /stats as your own stats", () => {
    expect(parseProfilePath(BASE, BASE)).toEqual({ kind: "own" });
    expect(parseProfilePath(`${BASE}/`, BASE)).toEqual({ kind: "own" });
    expect(parseProfilePath(`${BASE}/stats`, BASE)).toEqual({ kind: "own" });
  });

  it("reads every tab name, in any case, before user IDs", () => {
    for (const tab of PROFILE_TABS) {
      expect(parseProfilePath(`${BASE}/${tab}`, BASE)).toEqual({ kind: "tab", tab });
      expect(parseProfilePath(`${BASE}/${tab.toUpperCase()}/extra`, BASE)).toEqual({ kind: "tab", tab });
    }
  });

  it("treats anything else as a public profile and keeps the ID as written", () => {
    expect(parseProfilePath(`${BASE}/jd7F3k`, BASE)).toEqual({ kind: "player", userId: "jd7F3k" });
    expect(parseProfilePath(`${BASE}/a%20b`, BASE)).toEqual({ kind: "player", userId: "a b" });
  });

  it("builds paths that parse back to the same route", () => {
    for (const route of [{ kind: "own" as const }, { kind: "tab" as const, tab: "theme" as const }, { kind: "player" as const, userId: "a b" }]) {
      expect(parseProfilePath(profilePath(BASE, route), BASE)).toEqual(route);
    }
  });

  it("gives every mock player a stable, tab-safe ID that resolves to them", () => {
    const ids = PLAYERS.map((player) => player.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const player of PLAYERS) {
      expect(player.id).toMatch(/^[0-9a-z]{32}$/);
      expect(playerId(player.username)).toBe(player.id);
      expect(parseProfilePath(profilePath(BASE, { kind: "player", userId: player.id }), BASE)).toEqual({ kind: "player", userId: player.id });
      expect(findPlayer(player.id)).toBe(player);
    }
  });
});
