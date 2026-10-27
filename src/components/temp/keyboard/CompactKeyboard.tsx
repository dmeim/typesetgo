import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowFatLineUpIcon, BackspaceIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { isWide, keyRole, keyText, type KeyboardModel, type MockKey } from "./keyboard-mock";

const SPRING = { type: "spring", stiffness: 480, damping: 36 } as const;

/** 04: a shorter keyboard. The number row folds away until it's needed, and an "up next" strip previews the keys. */
export function CompactKeyboard({ model }: { model: KeyboardModel }) {
  const numbersNeeded = model.next?.row === 0 || model.rows[0].some((key) => model.pressed.has(key.id));
  return (
    <div className="@container flex w-full flex-col items-center gap-3">
      <UpNext model={model} />
      <div className="flex w-full max-w-3xl flex-col gap-[0.6cqw] rounded-2xl bg-muted/40 p-[1cqw] text-[clamp(0.65rem,1.9cqw,0.95rem)]" aria-hidden="true">
        {model.rows.map((row, index) => (
          <motion.div
            key={index}
            initial={false}
            animate={index === 0 ? { height: numbersNeeded ? "auto" : "0.55rem", opacity: numbersNeeded ? 1 : 0.5 } : {}}
            transition={SPRING}
            className={cn("flex justify-center gap-[0.6cqw]", index === 0 && "overflow-hidden")}
          >
            {row.map((key) => <CompactKey key={key.id} keyDef={key} model={model} folded={index === 0 && !numbersNeeded} />)}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CompactKey({ keyDef, model, folded }: { keyDef: MockKey; model: KeyboardModel; folded: boolean }) {
  const role = keyRole(model, keyDef);
  return (
    <motion.div
      style={{ flex: `${keyDef.width} 1 0%` }}
      animate={{ scale: model.pressed.has(keyDef.id) ? 0.9 : 1 }}
      className={cn(
        "flex min-w-0 items-center justify-center rounded-md bg-card text-muted-foreground shadow-sm",
        folded ? "h-[0.55rem] text-transparent" : "h-[clamp(1.6rem,4.4cqw,2.5rem)]",
        isWide(keyDef) && "text-[0.65em]",
        (keyDef.type === "tab" || keyDef.type === "enter") && "opacity-40",
        role === "next" && "bg-primary text-primary-foreground",
        role === "shift" && "bg-primary/20 text-primary",
        role === "fix" && "bg-destructive text-background",
        role === "caps" && "bg-warning text-background",
        role === "skip" && "outline-2 outline-dashed outline-muted-foreground",
      )}
    >
      {keyDef.type === "space" ? "" : keyText(keyDef, false)}
    </motion.div>
  );
}

function Chip({ children, tone, big = false }: { children: ReactNode; tone: string; big?: boolean }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={SPRING}
      className={cn("inline-flex items-center gap-1.5 rounded-xl px-3 font-mono", big ? "h-11 text-lg font-bold" : "h-9 text-sm", tone)}
    >
      {children}
    </motion.span>
  );
}

/** The next few keys, or what to delete, or the Caps Lock warning. */
function UpNext({ model }: { model: KeyboardModel }) {
  const shown = (char: string) => (char === " " ? "space" : char);
  return (
    <div role="status" className="flex min-h-11 flex-wrap items-center justify-center gap-2">
      <span className="text-[0.65rem] uppercase tracking-widest text-muted-foreground">up next</span>
      <AnimatePresence mode="popLayout" initial={false}>
        {model.caps && (
          <Chip key="caps" tone="bg-warning/15 text-warning"><ArrowFatLineUpIcon className="size-4" weight="bold" aria-hidden="true" />caps lock is on</Chip>
        )}
        {model.toDelete > 0 ? (
          [
            <Chip key="fix" big tone="bg-destructive text-background"><BackspaceIcon className="size-5" weight="bold" aria-hidden="true" />delete{model.toDelete > 1 && ` ×${model.toDelete}`}</Chip>,
            model.toDelete > 1 && <Chip key="skip" tone="bg-muted text-muted-foreground">or space to skip</Chip>,
          ]
        ) : model.upcoming.map(({ char, at }, index) => (
          <Chip key={at} big={index === 0} tone={index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground opacity-70"}>
            {index === 0 && model.shift && <ArrowFatLineUpIcon className="size-4" weight="bold" aria-label="Shift +" />}
            {shown(char)}
          </Chip>
        ))}
        {model.hint?.tone === "skipped" && <Chip key="skipped" tone="bg-muted text-muted-foreground">skipped</Chip>}
      </AnimatePresence>
    </div>
  );
}
