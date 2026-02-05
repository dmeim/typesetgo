/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievementThresholds from "../achievementThresholds.js";
import type * as achievements from "../achievements.js";
import type * as crons from "../crons.js";
import type * as lib_antiCheatConstants from "../lib/antiCheatConstants.js";
import type * as lib_computeStats from "../lib/computeStats.js";
import type * as lib_raceWords from "../lib/raceWords.js";
import type * as migrations from "../migrations.js";
import type * as participants from "../participants.js";
import type * as preferences from "../preferences.js";
import type * as raceResults from "../raceResults.js";
import type * as rooms from "../rooms.js";
import type * as sessionCleanup from "../sessionCleanup.js";
import type * as statsCache from "../statsCache.js";
import type * as streaks from "../streaks.js";
import type * as testResults from "../testResults.js";
import type * as typingSessions from "../typingSessions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievementThresholds: typeof achievementThresholds;
  achievements: typeof achievements;
  crons: typeof crons;
  "lib/antiCheatConstants": typeof lib_antiCheatConstants;
  "lib/computeStats": typeof lib_computeStats;
  "lib/raceWords": typeof lib_raceWords;
  migrations: typeof migrations;
  participants: typeof participants;
  preferences: typeof preferences;
  raceResults: typeof raceResults;
  rooms: typeof rooms;
  sessionCleanup: typeof sessionCleanup;
  statsCache: typeof statsCache;
  streaks: typeof streaks;
  testResults: typeof testResults;
  typingSessions: typeof typingSessions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
