/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as achievementThresholds from "../achievementThresholds.js";
import type * as achievements from "../achievements.js";
import type * as admin from "../admin.js";
import type * as crons from "../crons.js";
import type * as lib_achievementEvaluator from "../lib/achievementEvaluator.js";
import type * as lib_achievementGate from "../lib/achievementGate.js";
import type * as lib_activityCalendar from "../lib/activityCalendar.js";
import type * as lib_antiCheatConstants from "../lib/antiCheatConstants.js";
import type * as lib_burst from "../lib/burst.js";
import type * as lib_computeStats from "../lib/computeStats.js";
import type * as lib_consumeRateLimit from "../lib/consumeRateLimit.js";
import type * as lib_crypto from "../lib/crypto.js";
import type * as lib_finalizeLength from "../lib/finalizeLength.js";
import type * as lib_identity from "../lib/identity.js";
import type * as lib_leaderboardEligibility from "../lib/leaderboardEligibility.js";
import type * as lib_multiplayer from "../lib/multiplayer.js";
import type * as lib_qualification from "../lib/qualification.js";
import type * as lib_raceWords from "../lib/raceWords.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_soloCompletion from "../lib/soloCompletion.js";
import type * as lib_soloPrompt from "../lib/soloPrompt.js";
import type * as lib_utc from "../lib/utc.js";
import type * as lib_validateSession from "../lib/validateSession.js";
import type * as migrations from "../migrations.js";
import type * as multiplayerPresence from "../multiplayerPresence.js";
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

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  achievementThresholds: typeof achievementThresholds;
  achievements: typeof achievements;
  admin: typeof admin;
  crons: typeof crons;
  "lib/achievementEvaluator": typeof lib_achievementEvaluator;
  "lib/achievementGate": typeof lib_achievementGate;
  "lib/activityCalendar": typeof lib_activityCalendar;
  "lib/antiCheatConstants": typeof lib_antiCheatConstants;
  "lib/burst": typeof lib_burst;
  "lib/computeStats": typeof lib_computeStats;
  "lib/consumeRateLimit": typeof lib_consumeRateLimit;
  "lib/crypto": typeof lib_crypto;
  "lib/finalizeLength": typeof lib_finalizeLength;
  "lib/identity": typeof lib_identity;
  "lib/leaderboardEligibility": typeof lib_leaderboardEligibility;
  "lib/multiplayer": typeof lib_multiplayer;
  "lib/qualification": typeof lib_qualification;
  "lib/raceWords": typeof lib_raceWords;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/soloCompletion": typeof lib_soloCompletion;
  "lib/soloPrompt": typeof lib_soloPrompt;
  "lib/utc": typeof lib_utc;
  "lib/validateSession": typeof lib_validateSession;
  migrations: typeof migrations;
  multiplayerPresence: typeof multiplayerPresence;
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
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
