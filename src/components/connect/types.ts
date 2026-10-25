import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";

type HostView = Extract<FunctionReturnType<typeof api.connect.hostView>, { state: "ok" }>;
type ParticipantView = Extract<FunctionReturnType<typeof api.connect.participantView>, { state: "ok" }>;

export type HostRoom = HostView["room"];
export type HostParticipant = HostView["participants"][number];
export type ParticipantRoom = ParticipantView["room"];
export type ParticipantSelf = ParticipantView["participant"];
export type RecentRoom = FunctionReturnType<typeof api.connect.recentRooms>[number];
