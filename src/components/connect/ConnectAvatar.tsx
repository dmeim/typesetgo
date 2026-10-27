import { useState } from "react";
import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary text-primary-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-success text-background",
  "bg-warning text-background",
  "bg-destructive text-background",
  "bg-muted-foreground text-background",
];

function toneFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

/** A player's account picture, or the first letter of their name on a colour picked from the name. */
export function ConnectAvatar({ name, avatarUrl, className }: { name: string; avatarUrl?: string; className?: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const picture = avatarUrl && avatarUrl !== failedUrl ? avatarUrl : undefined;
  return (
    <span
      aria-hidden="true"
      data-avatar={picture ? "picture" : "letter"}
      className={cn("relative flex size-[1.75em] shrink-0 items-center justify-center overflow-hidden rounded-full font-bold leading-none", toneFor(name), className)}
    >
      {(name.trim().charAt(0) || "?").toUpperCase()}
      {picture && (
        <img
          src={picture}
          alt=""
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedUrl(picture)}
        />
      )}
    </span>
  );
}
