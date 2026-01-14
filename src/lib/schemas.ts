// src/lib/schemas.ts
import { z } from "zod";

export const joinRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(20, "Name must be 20 characters or less"),
  code: z
    .string()
    .length(5, "Code must be 5 characters")
    .toUpperCase()
    .regex(/^[A-Z0-9]+$/, "Code must be alphanumeric"),
});

export const hostRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(20, "Name must be 20 characters or less"),
});

export const presetTextSchema = z.object({
  text: z
    .string()
    .min(1, "Text is required")
    .max(10000, "Text must be 10,000 characters or less"),
});

export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type HostRoomInput = z.infer<typeof hostRoomSchema>;
export type PresetTextInput = z.infer<typeof presetTextSchema>;
