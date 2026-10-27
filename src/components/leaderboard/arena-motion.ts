export const ARENA_SPRING = { type: "spring", stiffness: 460, damping: 38, mass: 0.85 } as const;

const AVATAR_TONES = [
  "bg-primary text-primary-foreground",
  "bg-(--accent-emphasis) text-background",
  "bg-warning text-background",
  "bg-success text-background",
  "bg-destructive text-background",
  "bg-muted-foreground text-background",
];

function hash(text: string) {
  return [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
}

/** A steady letter-avatar colour per player, so the same person keeps their colour between periods. */
export function avatarTone(key: string) {
  return AVATAR_TONES[hash(key) % AVATAR_TONES.length];
}
