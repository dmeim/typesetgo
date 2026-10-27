import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HintPill } from "./KeyboardParts";
import { isWide, keyRole, keyText, type KeyboardModel, type KeyRole, type MockKey } from "./keyboard-mock";

const ROLE: Record<Exclude<KeyRole, null>, string> = {
  next: "border-primary bg-primary text-primary-foreground shadow-[0_0.3rem_0_color-mix(in_oklab,var(--primary)_55%,black)]",
  shift: "border-primary bg-primary/15 text-primary shadow-[0_0.3rem_0_color-mix(in_oklab,var(--primary)_40%,transparent)]",
  fix: "border-destructive bg-destructive text-background shadow-[0_0.3rem_0_color-mix(in_oklab,var(--destructive)_55%,black)]",
  caps: "border-warning bg-warning text-background shadow-[0_0.3rem_0_color-mix(in_oklab,var(--warning)_55%,black)]",
  skip: "border-dashed border-muted-foreground text-foreground",
};

/** 01: chunky keycaps that press down. The next key bobs; delete wiggles after a mistake. */
export function KeycapKeyboard({ model }: { model: KeyboardModel }) {
  return (
    <div className="@container flex w-full flex-col items-center gap-2">
      <HintPill hint={model.hint} />
      <div className="flex w-full max-w-4xl flex-col gap-[1cqw] text-[clamp(0.7rem,2.1cqw,1.1rem)]" aria-hidden="true">
        {model.rows.map((row, index) => (
          <div key={index} className="flex justify-center gap-[1cqw]">
            {row.map((key) => <Keycap key={key.id} keyDef={key} role={keyRole(model, key)} pressed={model.pressed.has(key.id)} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

function Keycap({ keyDef, role, pressed }: { keyDef: MockKey; role: KeyRole; pressed: boolean }) {
  const wide = isWide(keyDef);
  return (
    <motion.div
      style={{ flex: `${keyDef.width} 1 0%` }}
      animate={pressed
        ? { y: 5, rotate: 0 }
        : role === "next" ? { y: [0, -3, 0], rotate: 0 }
          : role === "fix" ? { y: 0, rotate: [0, -4, 4, -2, 0] }
            : { y: 0, rotate: 0 }}
      transition={pressed ? { duration: 0.05 } : role === "next" || role === "fix" ? { duration: role === "fix" ? 0.5 : 1.1, repeat: Infinity, repeatDelay: role === "fix" ? 0.8 : 0 } : { type: "spring", stiffness: 600, damping: 25 }}
      className={cn(
        "relative flex h-[clamp(1.9rem,5.8cqw,3.3rem)] min-w-0 items-center justify-center rounded-[0.65rem] border-2 border-border bg-card font-semibold text-muted-foreground shadow-[0_0.3rem_0_var(--border)]",
        wide && "text-[0.65em] font-medium tracking-wide",
        role && ROLE[role],
        pressed && "shadow-none",
      )}
    >
      {keyDef.type === "space" ? (role === "skip" ? "space to skip" : "") : role === "shift" ? "hold" : keyText(keyDef, false)}
      {role === "caps" && <span className="absolute top-1 right-1.5 size-1.5 rounded-full bg-background" />}
    </motion.div>
  );
}
