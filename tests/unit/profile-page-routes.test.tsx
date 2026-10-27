import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation, type RouteObject } from "react-router-dom";
import { appRoutes } from "@/components/layout/app-routes";
import {
  PROFILE_BASE, PROFILE_TABS, paneForRoute, parseProfilePath, profilePath, publicProfilePath,
} from "@/components/profile/profile-routes";

describe("/profile URL mapping", () => {
  it("treats the bare path and /stats as your own stats", () => {
    expect(parseProfilePath("/profile")).toEqual({ kind: "own" });
    expect(parseProfilePath("/profile/")).toEqual({ kind: "own" });
    expect(parseProfilePath("/profile/stats")).toEqual({ kind: "own" });
    expect(paneForRoute({ kind: "own" })).toBe("stats");
  });

  it("opens every tab by name, in any case, before user IDs", () => {
    for (const tab of PROFILE_TABS) {
      expect(parseProfilePath(`/profile/${tab}`)).toEqual({ kind: "tab", tab });
      expect(parseProfilePath(`/profile/${tab.toUpperCase()}/extra`)).toEqual({ kind: "tab", tab });
      expect(paneForRoute({ kind: "tab", tab })).toBe(tab);
    }
  });

  it("treats anything else as a public profile, including malformed escapes", () => {
    expect(parseProfilePath("/profile/jd7F3k")).toEqual({ kind: "player", userId: "jd7F3k" });
    expect(parseProfilePath("/profile/a%20b")).toEqual({ kind: "player", userId: "a b" });
    expect(parseProfilePath("/profile/100%")).toEqual({ kind: "player", userId: "100%" });
    expect(paneForRoute({ kind: "player", userId: "jd7F3k" })).toBe("stats");
  });

  it("builds paths that parse back to the same route", () => {
    for (const route of [{ kind: "own" as const }, { kind: "tab" as const, tab: "keyboard" as const }, { kind: "player" as const, userId: "a b" }]) {
      expect(parseProfilePath(profilePath(PROFILE_BASE, route))).toEqual(route);
    }
    expect(publicProfilePath("k57abc")).toBe("/profile/k57abc");
  });
});

function Where() {
  const location = useLocation();
  return <p data-testid="location">{location.pathname}{location.search}</p>;
}

describe("app routes", () => {
  const children = appRoutes[0].children as RouteObject[];
  const route = (path: string) => children.find((child) => child.path === path);

  it("registers the Profile page for /profile and everything under it", () => {
    expect(route("/profile/*")?.lazy).toBeTypeOf("function");
  });

  it("sends old /user/:userId links to the same player's public profile, keeping the query", async () => {
    const router = createMemoryRouter([{ ...appRoutes[0], children: [
      route("/user/:userId")!,
      { path: "/profile/*", Component: Where },
    ] }], { initialEntries: ["/user/k57abc?from=share"] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByTestId("location")).toHaveTextContent("/profile/k57abc?from=share");
  });
});
