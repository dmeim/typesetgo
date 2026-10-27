import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HINT_STYLE, isWide, keyRole, keyText, showsUpper, type KeyboardModel, type MockKey } from "./keyboard-mock";

const GLIDE = { type: "spring", stiffness: 520, damping: 38 } as const;

/** 03: quiet outline keys and one spotlight that glides to the next key. Labels follow Shift and Caps Lock. */
export function SpotlightKeyboard({ model, bare = false }: { model: KeyboardModel; bare?: boolean }) {
  const scope = useId();
  const tone = model.hint?.tone;
  return (
    <div className="@container flex w-full flex-col items-center gap-2">
      <div
        className={cn(
          "relative w-full max-w-4xl overflow-hidden rounded-3xl border bg-card/40 p-[1.4cqw] transition-colors duration-300",
          tone === "caps" ? "border-warning/70" : tone === "mistake" || tone === "ignored" ? "border-destructive/60" : "border-border/60",
        )}
      >
        <AnimatePresence initial={false}>
          {model.caps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="-mx-[1.4cqw] -mt-[1.4cqw] mb-[1.4cqw] bg-warning/15 text-center text-xs font-semibold uppercase tracking-[0.3em] text-warning"
            >
              <div className="py-1.5">Caps Lock is on</div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-col gap-[0.6cqw] text-[clamp(0.7rem,2cqw,1.05rem)]" aria-hidden="true">
          {model.rows.map((row, index) => (
            <div key={index} className="flex justify-center gap-[0.6cqw]">
              {row.map((key) => <SpotKey key={key.id} keyDef={key} model={model} scope={scope} />)}
            </div>
          ))}
        </div>
      </div>
      {!bare && <p role="status" className={cn("min-h-5 text-center text-sm", tone ? HINT_STYLE[tone].text : "text-muted-foreground")}>
        {model.hint ? `${model.hint.title}. ${model.hint.detail}.` : model.next ? "Follow the light." : ""}
      </p>}
    </div>
  );
}

function SpotKey({ keyDef, model, scope }: { keyDef: MockKey; model: KeyboardModel; scope: string }) {
  const role = keyRole(model, keyDef);
  const pressed = model.pressed.has(keyDef.id);
  const upper = showsUpper(keyDef, model.caps, !!model.shift);
  const lit = role === "next" || role === "fix";
  return (
    <div
      style={{ flex: `${keyDef.width} 1 0%` }}
      className={cn(
        "relative flex h-[clamp(1.8rem,5.2cqw,3rem)] min-w-0 items-center justify-center rounded-xl border border-border/50 text-muted-foreground/80 transition-colors",
        isWide(keyDef) && "text-[0.65em]",
        role === "caps" && "border-warning bg-warning/15 text-warning",
        role === "skip" && "border-dashed border-muted-foreground text-foreground",
      )}
    >
      {lit && (
        <motion.span
          layoutId={`${scope}-spot`}
          transition={GLIDE}
          className={cn("absolute -inset-px rounded-xl", role === "fix" ? "bg-destructive shadow-[0_0_24px_var(--destructive)]" : "bg-primary shadow-[0_0_24px_var(--primary)]")}
        />
      )}
      {role === "shift" && <motion.span layoutId={`${scope}-shift`} transition={GLIDE} className="absolute -inset-px rounded-xl bg-primary/20 ring-1 ring-primary" />}
      <AnimatePresence>
        {pressed && (
          <motion.span
            initial={{ opacity: 0.6, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 rounded-xl border-2 border-primary"
          />
        )}
      </AnimatePresence>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={keyText(keyDef, upper)}
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn("relative font-medium", lit && (role === "fix" ? "text-background" : "text-primary-foreground"), role === "shift" && "text-primary")}
        >
          {keyDef.type === "space" ? (role === "skip" ? "space to skip" : "") : keyText(keyDef, upper)}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
