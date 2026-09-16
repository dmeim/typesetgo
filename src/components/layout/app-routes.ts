import type { RouteObject } from "react-router-dom";
import { NotFound, RouteError, RouteFrame, RouteLoading } from "./RouteRecovery";

export const appRoutes: RouteObject[] = [{
  Component: RouteFrame,
  ErrorBoundary: RouteError,
  HydrateFallback: RouteLoading,
  children: [
    { path: "/", lazy: async () => ({ Component: (await import("@/pages/Home")).default }) },
    { path: "/leaderboard", lazy: async () => ({ Component: (await import("@/pages/Leaderboard")).default }) },
    { path: "/user/:userId", lazy: async () => ({ Component: (await import("@/pages/UserStats")).default }) },
    { path: "/connect", lazy: async () => ({ Component: (await import("@/pages/Connect")).default }) },
    { path: "/connect/host", lazy: async () => ({ Component: (await import("@/pages/Host")).default }) },
    { path: "/connect/join", lazy: async () => ({ Component: (await import("@/pages/Join")).default }) },
    { path: "/race", lazy: async () => ({ Component: (await import("@/pages/Race")).default }) },
    { path: "/race/lobby/:lobbyId", lazy: async () => ({ Component: (await import("@/pages/RaceLobby")).default }) },
    { path: "/race/:raceId", lazy: async () => ({ Component: (await import("@/pages/RaceActive")).default }) },
    { path: "/race/results/:raceId", lazy: async () => ({ Component: (await import("@/pages/RaceResults")).default }) },
    { path: "/lessons", lazy: async () => ({ Component: (await import("@/pages/Lessons")).default }) },
    { path: "/about", lazy: async () => ({ Component: (await import("@/pages/About")).default }) },
    { path: "/privacy", lazy: async () => ({ Component: (await import("@/pages/Privacy")).default }) },
    { path: "/tos", lazy: async () => ({ Component: (await import("@/pages/TermsOfService")).default }) },
    { path: "/admin", lazy: async () => ({ Component: (await import("@/pages/Admin")).default }) },
    { path: "*", Component: NotFound },
  ],
}];
