// Pure shared limits: frontend controls and Convex validation can import this module.
export const TEXT_SIZE_MIN = 1;
export const TEXT_SIZE_MAX = 6;
export const MAX_DURATION_SECONDS = 6 * 3600 + 59 * 60 + 59;
export const MAX_WORD_TARGET = 9999;
export const MAX_GHOST_SPEED = 200;

// Prepared solo prompts may wait on the page; active sessions use a separate activity timeout.
export const SOLO_PREPARED_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
