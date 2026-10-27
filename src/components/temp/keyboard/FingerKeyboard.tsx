import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HintPill } from "./KeyboardParts";
import { FINGER_NAMES, isWide, keyRole, keyText, type Finger, type KeyboardModel, type MockKey } from "./keyboard-mock";

// Mirrored zones: pinkies red, ring fingers amber, middle fingers green; the two index fingers differ so hands read apart.
const TINT: Record<Finger, string> = {
  lp: "bg-destructive/12 text-destructive", lr: "bg-warning/12 text-warning", lm: "bg-success/12 text-success", li: "bg-primary/12 text-primary",
  ri: "bg-(--accent-emphasis)/12 text-(--accent-emphasis)", rm: "bg-success/12 text-success", rr: "bg-warning/12 text-warning", rp: "bg-destructive/12 text-destructive",
  thumb: "bg-muted text-muted-foreground",
};
const SOLID: Record<Finger, string> = {
  lp: "bg-destructive text-background", lr: "bg-warning text-background", lm: "bg-success text-background", li: "bg-primary text-primary-foreground",
  ri: "bg-(--accent-emphasis) text-background", rm: "bg-success text-background", rr: "bg-warning text-background", rp: "bg-destructive text-background",
  thumb: "bg-muted-foreground text-background",
};
const HANDS: { side: string; fingers: [Finger, string][] }[] = [
  { side: "Left", fingers: [["lp", "h-9"], ["lr", "h-12"], ["lm", "h-14"], ["li", "h-12"], ["thumb", "h-7"]] },
  { side: "Right", fingers: [["thumb", "h-7"], ["ri", "h-12"], ["rm", "h-14"], ["rr", "h-12"], ["rp", "h-9"]] },
];

/** 02: keys tinted by finger, with two hands underneath that light up the finger to use. */
export function FingerKeyboard({ model }: { model: KeyboardModel }) {
  const capsKey = model.rows[2][0];
  const lead = model.caps ? capsKey : model.next;
  const helper = model.caps ? null : model.shift;
  const instruction = lead
    ? `${FINGER_NAMES[lead.finger]}: ${lead.type === "caps" ? "Caps Lock" : lead.type === "backspace" ? "delete" : lead.type === "space" ? "space" : keyText(lead, !!model.shift || model.caps)}`
    + (helper ? `, while your ${FINGER_NAMES[helper.finger]} holds Shift` : "")
    : "All done!";

  return (
    <div className="@container flex w-full flex-col items-center gap-2">
      <HintPill hint={model.hint} />
      <div className="flex w-full max-w-4xl flex-col gap-[0.7cqw] text-[clamp(0.7rem,2.1cqw,1.05rem)]" aria-hidden="true">
        {model.rows.map((row, index) => (
          <div key={index} className="flex justify-center gap-[0.7cqw]">
            {row.map((key) => <FingerKey key={key.id} keyDef={key} model={model} />)}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-end justify-center gap-6 @min-[30rem]:gap-12" aria-hidden="true">
        {HANDS.map(({ side, fingers }) => (
          <div key={side} className="flex flex-col items-center gap-1.5">
            <div className="flex items-end gap-1">
              {fingers.map(([finger, height]) => {
                const on = lead?.finger === finger;
                const helping = helper?.finger === finger;
                return (
                  <motion.span
                    key={finger}
                    animate={{ y: on ? -6 : 0, scale: on ? 1.08 : 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className={cn("w-4 rounded-full @min-[30rem]:w-5", height, on ? SOLID[finger] : helping ? cn(TINT[finger], "ring-2 ring-current") : "bg-muted")}
                  />
                );
              })}
            </div>
            <span className="h-6 w-24 rounded-b-[1.5rem] rounded-t-md bg-muted @min-[30rem]:w-28" />
            <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">{side}</span>
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">Use your <span className="font-semibold text-foreground">{instruction}</span></p>
    </div>
  );
}

function FingerKey({ keyDef, model }: { keyDef: MockKey; model: KeyboardModel }) {
  const role = keyRole(model, keyDef);
  const lit = role === "next" || role === "fix" || role === "caps";
  // The F and J positions, where your index fingers rest.
  const homeBump = keyDef.id === "2-4" || keyDef.id === "2-7";
  return (
    <motion.div
      style={{ flex: `${keyDef.width} 1 0%` }}
      animate={{ scale: model.pressed.has(keyDef.id) ? 0.9 : lit ? 1.06 : 1 }}
      transition={{ type: "spring", stiffness: 600, damping: 24 }}
      className={cn(
        "relative flex h-[clamp(1.8rem,5.2cqw,3rem)] min-w-0 items-center justify-center rounded-lg font-semibold",
        isWide(keyDef) && "text-[0.65em] font-medium",
        lit ? cn(SOLID[keyDef.finger], "shadow-lg ring-2 ring-foreground/70 ring-offset-2 ring-offset-background") : TINT[keyDef.finger],
        role === "shift" && "ring-2 ring-current",
        role === "skip" && "outline-2 outline-offset-2 outline-dashed outline-muted-foreground",
      )}
    >
      {keyDef.type === "space" ? (role === "skip" ? "space to skip" : "") : keyText(keyDef, false)}
      {homeBump && <span className="absolute bottom-1 h-0.5 w-2.5 rounded-full bg-current opacity-70" />}
    </motion.div>
  );
}
