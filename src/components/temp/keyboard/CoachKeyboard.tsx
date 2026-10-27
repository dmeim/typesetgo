import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { FINGER_NAMES, isLeftHand, isWide, keyRole, keyText, type KeyboardModel, type MockKey } from "./keyboard-mock";

const BUBBLE_WIDTH = 220;

/** What the coach says, and which key it points at. */
function coaching(model: KeyboardModel): { anchor: MockKey | null; title: string; detail: string; tone: "caps" | "fix" | "next" | "skipped" } {
  if (model.caps) return { anchor: model.rows[2][0], tone: "caps", title: "Caps Lock is on!", detail: model.toDelete ? "Press me to turn it off, then fix the mistake." : "Press me to turn it off." };
  if (model.toDelete >= 2) return { anchor: model.next, tone: "fix", title: `${model.toDelete} letters to fix`, detail: `Press delete ${model.toDelete} times, or space to skip this word.` };
  if (model.toDelete === 1) return { anchor: model.next, tone: "fix", title: "Oops! Wrong letter", detail: "Press delete to fix it." };
  const next = model.next;
  if (!next) return { anchor: null, tone: "next", title: "", detail: "" };
  const name = next.type === "space" ? "space" : keyText(next, !!model.shift);
  const shiftHint = model.shift ? `Hold the ${isLeftHand(model.shift.finger) ? "left" : "right"} Shift, then press ${name}.` : `Use your ${FINGER_NAMES[next.finger]}.`;
  if (model.hint?.tone === "skipped") return { anchor: next, tone: "skipped", title: "Skipped! Keep going", detail: `Next up: ${name}.` };
  return { anchor: next, tone: "next", title: name, detail: shiftHint };
}

const TONES = {
  caps: "bg-warning text-background",
  fix: "bg-destructive text-background",
  next: "bg-popover text-popover-foreground ring-1 ring-border",
  skipped: "bg-popover text-popover-foreground ring-1 ring-border",
};
const ARROWS = { caps: "bg-warning", fix: "bg-destructive", next: "bg-popover", skipped: "bg-popover" };

/** 05: a speech bubble rides above the key to press and explains what to do. */
export function CoachKeyboard({ model }: { model: KeyboardModel }) {
  const board = useRef<HTMLDivElement>(null);
  const keys = useRef(new Map<string, HTMLDivElement>());
  const coach = coaching(model);
  const [spot, setSpot] = useState<{ left: number; top: number; arrow: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const anchor = coach.anchor && keys.current.get(coach.anchor.id);
      const frame = board.current;
      if (!anchor || !frame) return setSpot(null);
      const center = anchor.offsetLeft + anchor.offsetWidth / 2;
      const left = Math.min(Math.max(center - BUBBLE_WIDTH / 2, 0), frame.offsetWidth - BUBBLE_WIDTH);
      setSpot({ left, top: anchor.offsetTop, arrow: center - left });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (board.current) observer.observe(board.current);
    return () => observer.disconnect();
  }, [coach.anchor]);

  return (
    <div className="@container flex w-full flex-col items-center pt-24">
      <div ref={board} className="relative flex w-full max-w-4xl flex-col gap-[0.8cqw] text-[clamp(0.7rem,2cqw,1.05rem)]">
        {spot && (
          <motion.div
            role="status"
            initial={false}
            animate={{ left: spot.left, top: spot.top, x: coach.tone === "fix" && model.toDelete >= 2 ? [0, -6, 6, -3, 0] : 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, x: { duration: 0.4 } }}
            style={{ width: BUBBLE_WIDTH }}
            className="pointer-events-none absolute z-10 -translate-y-[calc(100%+0.6rem)]"
          >
            <div className={cn("relative rounded-2xl px-3.5 py-2.5 text-left shadow-lg", TONES[coach.tone])}>
              <div className={cn("font-bold", coach.tone === "next" ? "font-mono text-2xl leading-none" : "text-sm")}>{coach.title}</div>
              <div className="mt-1 text-xs opacity-90">{coach.detail}</div>
              <motion.span animate={{ left: spot.arrow - 6 }} transition={{ type: "spring", stiffness: 420, damping: 32 }} className={cn("absolute -bottom-1.5 size-3 rotate-45", ARROWS[coach.tone])} />
            </div>
          </motion.div>
        )}
        {model.rows.map((row, index) => (
          <div key={index} className="flex justify-center gap-[0.8cqw]" aria-hidden="true">
            {row.map((key) => (
              <CoachKey key={key.id} keyDef={key} model={model} register={(element) => { if (element) keys.current.set(key.id, element); else keys.current.delete(key.id); }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachKey({ keyDef, model, register }: { keyDef: MockKey; model: KeyboardModel; register: (element: HTMLDivElement | null) => void }) {
  const role = keyRole(model, keyDef);
  return (
    <motion.div
      ref={register}
      style={{ flex: `${keyDef.width} 1 0%` }}
      animate={{ y: model.pressed.has(keyDef.id) ? 2 : 0 }}
      className={cn(
        "flex h-[clamp(1.8rem,5.2cqw,3rem)] min-w-0 items-center justify-center rounded-xl bg-muted/60 font-medium text-muted-foreground",
        isWide(keyDef) && "text-[0.65em]",
        role === "next" && "bg-primary/15 text-primary ring-2 ring-primary",
        role === "shift" && "bg-primary/10 text-primary ring-2 ring-primary/50",
        role === "fix" && "bg-destructive/15 text-destructive ring-2 ring-destructive",
        role === "caps" && "bg-warning/15 text-warning ring-2 ring-warning",
        role === "skip" && "text-foreground outline-2 outline-dashed outline-muted-foreground",
        model.pressed.has(keyDef.id) && "bg-primary text-primary-foreground",
      )}
    >
      {keyDef.type === "space" ? (role === "skip" ? "space to skip" : "space") : keyText(keyDef, false)}
    </motion.div>
  );
}
