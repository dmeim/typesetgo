import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckIcon, GaugeIcon, PlayIcon } from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import { SETTINGS_SPRING } from "@/components/typing/practice-settings-meta";
import { cn } from "@/lib/utils";
import { CharNotice, CheckLine, CloseButton, PrimaryButton, QuietButton, Scrim, StagePrompt, TextBox, TrimButton } from "./dialog-parts";
import { PillRow, PillShell } from "./MockPill";
import {
  DIAL_MARKS, DIAL_STOPS, LENGTH_TITLES, LIMITS, MAX_TEXT, MOCK_WPM, fixCharacters, formatLength, nearestStop, shortEstimate, shortTime, trimToLimit,
  type Applied, type ConceptProps, type LengthKind, type SeedId, type TextCheck,
} from "./practice-dialogs-mock";
import { surfaceKeys, useLengthDraft, useSurface, useTextDraft } from "./use-surface";

/** 03: a drop-down panel with a gauge and slider and a live guess of what the length means for you. */
export function DialConcept({ surface, kind, applied, apply, initialSeed }: ConceptProps) {
  const panel = useSurface(initialSeed);
  const titleId = useId();
  const title = surface === "text" ? "How long is your text?" : LENGTH_TITLES[kind];

  return (
    <div className="relative flex h-full flex-col items-center gap-8 px-3 pt-6 pb-3 @min-[40rem]:px-6">
      <AnimatePresence>{panel.isOpen && <Scrim key="scrim" onClick={() => panel.close(false)} />}</AnimatePresence>
      {/* The panel sits in the flow under the pill so it can shrink and scroll inside the stage. */}
      <div className="relative z-30 flex min-h-0 w-full max-w-2xl flex-col gap-3">
        <PillShell className="shrink-0">
          <PillRow surface={surface} kind={kind} applied={applied} apply={apply} pillStyle="estimate" open={panel.isOpen}
            onOpen={() => (panel.isOpen ? panel.close() : panel.open())} triggerRef={panel.triggerRef} />
        </PillShell>
        <AnimatePresence>
          {panel.isOpen && (
            <motion.div key="dial" role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => surfaceKeys(event, () => panel.close(), true)}
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={SETTINGS_SPRING}
              className="flex min-h-0 flex-col gap-4 overflow-y-auto rounded-3xl *:shrink-0 border border-border bg-card p-4 shadow-2xl @min-[40rem]:p-5">
              <div className="flex items-center justify-between gap-2">
                <h4 id={titleId} className="inline-flex items-center gap-2 text-sm font-semibold">
                  <GaugeIcon className="size-4 text-primary" aria-hidden="true" />
                  {title}
                </h4>
                <CloseButton onClick={() => panel.close()} />
              </div>
              {surface === "length"
                ? <LengthBody kind={kind} seed={panel.seed} applied={applied} onCancel={() => panel.close()} onApply={(value) => { apply({ [kind]: value }); panel.close(); }} />
                : <TextBody seed={panel.seed} applied={applied} onCancel={() => panel.close()} onApply={(text) => { apply({ text }); panel.close(); }} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Gives up its height first when the panel needs the room. */}
      <div className="min-h-0 w-full shrink-[100] overflow-hidden">
        <StagePrompt text={surface === "text" ? applied.text : undefined} />
      </div>
    </div>
  );
}

type BodyProps<T> = { seed: SeedId; applied: Applied; onApply: (value: T) => void; onCancel: () => void };

function LengthBody({ kind, seed, applied, onApply, onCancel }: BodyProps<number> & { kind: LengthKind }) {
  const draft = useLengthDraft(kind, seed, applied);
  const exactId = useId();
  const stops = DIAL_STOPS[kind];
  const index = nearestStop(kind, draft.value);
  const fraction = index / (stops.length - 1);
  const error = draft.check.severity === "error";
  const submit = () => { if (draft.valid) onApply(draft.value); };

  return (
    <>
      <div className="relative mx-auto w-full max-w-[15rem] shrink-0">
        <Gauge kind={kind} fraction={error ? (draft.value > LIMITS[kind].max ? 1 : 0) : fraction} error={error} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <motion.span key={draft.raw} initial={{ scale: 0.92, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} transition={SETTINGS_SPRING}
            className={cn("text-4xl font-bold tabular-nums", error ? "text-destructive" : "text-primary")}>
            {error ? "—" : formatLength(kind, draft.value)}
          </motion.span>
          <span className="text-sm text-muted-foreground">{error ? draft.check.title.toLowerCase() : `${shortEstimate(kind, draft.value)} at ${MOCK_WPM} wpm`}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Slider aria-label={`${LENGTH_TITLES[kind]}, ${formatLength(kind, stops[index])}`} value={[index]} min={0} max={stops.length - 1} step={1}
          onValueChange={([next]) => draft.setValue(stops[next])} />
        <div aria-hidden="true" className="relative h-4 text-[11px] text-muted-foreground">
          {DIAL_MARKS[kind].map((mark, markIndex) => {
            const left = (nearestStop(kind, mark) / (stops.length - 1)) * 100;
            const edge = markIndex === 0 ? "translate-x-0" : markIndex === DIAL_MARKS[kind].length - 1 ? "-translate-x-full" : "-translate-x-1/2";
            return <span key={mark} className={cn("absolute top-0 tabular-nums", edge)} style={{ left: `${left}%` }}>{kind === "time" ? formatLength(kind, mark) : mark.toLocaleString()}</span>;
          })}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <label htmlFor={exactId} className="text-xs uppercase tracking-wider text-muted-foreground">Exact</label>
        <input id={exactId} value={draft.raw} inputMode={kind === "time" ? "text" : "numeric"} placeholder={kind === "time" ? "1:30" : "75"}
          aria-invalid={error || undefined} onChange={(event) => draft.setRaw(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)}
          className="h-9 w-24 rounded-xl border border-input bg-background px-3 text-sm tabular-nums outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 aria-invalid:border-destructive" />
      </div>
      <CheckLine check={draft.check} />
      <Footer onCancel={onCancel} disabled={!draft.valid} onApply={submit} label={draft.valid ? `Set ${formatLength(kind, draft.value)}` : "Set length"} />
    </>
  );
}

const ARC = "M 20 110 A 90 90 0 0 1 200 110";

/** A half-circle gauge with the slider's marks as ticks. */
function Gauge({ kind, fraction, error }: { kind: LengthKind; fraction: number; error: boolean }) {
  const angle = Math.PI * (1 - fraction);
  const stops = DIAL_STOPS[kind].length - 1;
  return (
    <svg viewBox="0 0 220 124" className="w-full" aria-hidden="true">
      <path d={ARC} fill="none" strokeWidth={14} strokeLinecap="round" className="stroke-muted" />
      {DIAL_MARKS[kind].map((mark) => {
        const tick = Math.PI * (1 - nearestStop(kind, mark) / stops);
        return <line key={mark} x1={110 + 102 * Math.cos(tick)} y1={110 - 102 * Math.sin(tick)} x2={110 + 108 * Math.cos(tick)} y2={110 - 108 * Math.sin(tick)} strokeWidth={2} strokeLinecap="round" className="stroke-muted-foreground/50" />;
      })}
      <motion.path d={ARC} fill="none" strokeWidth={14} strokeLinecap="round" initial={false} animate={{ pathLength: Math.max(fraction, 0.001), opacity: fraction > 0.002 ? 1 : 0 }} transition={SETTINGS_SPRING}
        className={error ? "stroke-destructive" : "stroke-primary"} />
      <motion.circle r={11} initial={false} animate={{ cx: 110 + 90 * Math.cos(angle), cy: 110 - 90 * Math.sin(angle) }} transition={SETTINGS_SPRING}
        strokeWidth={4} className={cn("fill-card", error ? "stroke-destructive" : "stroke-primary")} />
    </svg>
  );
}

// Zone edges in characters; the meter uses a square-root scale so short texts still move it.
const ZONES = [
  { label: "Quick", until: 150 },
  { label: "Short", until: 700 },
  { label: "Solid", until: 3000 },
  { label: "Long", until: MAX_TEXT },
];
const OVER = 0.1;
const scale = (chars: number) => Math.sqrt(Math.min(chars, MAX_TEXT) / MAX_TEXT) * (1 - OVER) + (chars > MAX_TEXT ? OVER * Math.min(1, (chars - MAX_TEXT) / 2000) : 0);
const zoneWidth = (index: number) => scale(ZONES[index].until) - (index ? scale(ZONES[index - 1].until) : 0);

function TextBody({ seed, applied, onApply, onCancel }: BodyProps<string>) {
  const draft = useTextDraft(seed, applied);
  const hintId = useId();
  const submit = () => { if (draft.valid) onApply(draft.check.clean); };

  return (
    <>
      <TextBox autoFocus rows={5} aria-label="Your own text" aria-describedby={hintId} value={draft.text} invalid={draft.check.severity === "error" && draft.text.length > 0}
        onChange={(event) => draft.setText(event.target.value)} onKeyDown={(event) => draft.onKeyDown(event, submit)} />
      <LengthMeter check={draft.check} />
      <CharNotice compact check={draft.check} onFix={() => draft.setText(fixCharacters(draft.text))} />
      <div id={hintId}><CheckLine check={draft.check} action={<TrimButton check={draft.check} onTrim={() => draft.setText(trimToLimit(draft.text))} />} /></div>
      <Footer onCancel={onCancel} disabled={!draft.valid} onApply={submit} label="Practice this" play />
    </>
  );
}

/** Where the text lands from a quick drill to the character limit, with the typing time on the marker. */
function LengthMeter({ check }: { check: TextCheck }) {
  const position = scale(check.chars);
  const over = check.chars > MAX_TEXT;
  const active = ZONES.findIndex((zone) => check.chars <= zone.until);
  return (
    <div className="flex flex-col gap-1.5" aria-hidden="true">
      <div className="relative pt-6">
        <motion.span initial={false} animate={{ left: `${position * 100}%` }} transition={SETTINGS_SPRING}
          className={cn("absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums", over ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")}>
          {check.words ? shortTime(check.seconds) : "0"}
        </motion.span>
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {ZONES.map((zone, index) => (
            <span key={zone.label} className={cn("h-full transition-colors", check.chars > 0 && index === active ? "bg-primary" : index < active || over ? "bg-primary/35" : "bg-muted")} style={{ width: `${zoneWidth(index) * 100}%` }} />
          ))}
          <span className={cn("h-full flex-1", over ? "bg-destructive" : "bg-[repeating-linear-gradient(45deg,var(--color-muted)_0_4px,transparent_4px_8px)]")} />
        </div>
      </div>
      <div className="flex text-[11px] text-muted-foreground">
        {ZONES.map((zone, index) => (
          <span key={zone.label} className={cn("truncate", index === active && check.chars > 0 && "font-semibold text-foreground")}
            style={{ width: `${zoneWidth(index) * 100}%` }}>{zone.label}</span>
        ))}
        <span className={cn("flex-1 truncate text-right", over && "font-semibold text-destructive")}>Limit</span>
      </div>
    </div>
  );
}

function Footer({ onCancel, onApply, disabled, label, play = false }: { onCancel: () => void; onApply: () => void; disabled: boolean; label: string; play?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <QuietButton onClick={onCancel}>Cancel</QuietButton>
      <PrimaryButton disabled={disabled} onClick={onApply}>
        {play ? <PlayIcon className="size-4" aria-hidden="true" /> : <CheckIcon className="size-4" aria-hidden="true" />}
        {label}
      </PrimaryButton>
    </div>
  );
}
