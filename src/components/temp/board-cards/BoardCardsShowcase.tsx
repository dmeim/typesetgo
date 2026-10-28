import { useLayoutEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowsOutIcon, ImageIcon, ProjectorScreenIcon, TextAaIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { CARD_SIZE } from "@/components/connect/board/board-model";
import { fitCardScale } from "@/components/connect/board/board-fit";
import { CONNECT_SPRING } from "@/components/connect/connect-motion";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { cardViews, PLAYER_COUNTS, ROOM_CODE, ROOM_NAME, SIM_TESTS, type CardView } from "./board-cards-mock";
import type { BoardCardProps } from "./card-tone";
import { useBoardSim } from "./use-board-sim";
import { BigNumberCard } from "./BigNumberCard";
import { NameRibbonCard } from "./NameRibbonCard";
import { RingCard } from "./RingCard";
import { ScoreRowCard } from "./ScoreRowCard";
import { LaneCard } from "./LaneCard";

interface Concept {
  name: string;
  summary: string;
  Card: ComponentType<BoardCardProps>;
  /** Narrowest a card may be, in em: the grid's column minimum. */
  minCardWidth: number;
  /** Gap between cards, in em. */
  gap: number;
}

const CONCEPTS: Concept[] = [
  { name: "Big number", summary: "A tile with the name alone on the top line, a huge speed in the middle, status and test dots underneath, and the card's bottom edge as the progress bar.", Card: BigNumberCard, minCardWidth: 12, gap: 0.6 },
  { name: "Name ribbon", summary: "A short, wide card where the name is the biggest text, the speed sits at the right end, and the whole card fills with colour as the player gets through the test.", Card: NameRibbonCard, minCardWidth: 17, gap: 0.5 },
  { name: "Progress ring", summary: "The face sits inside a ring that closes as the test goes on, with the name on its own line beside it and the speed right under the name.", Card: RingCard, minCardWidth: 14, gap: 0.6 },
  { name: "Scoreboard", summary: "One dense row per player like a sports scoreboard: place number (a crown for the fastest), the name filling the middle, and the speed in its own box.", Card: ScoreRowCard, minCardWidth: 18, gap: 0.35 },
  { name: "Lane", summary: "The name and speed share one wide line over a race lane where the player's face moves toward the finish flag; the status rides in the open part of the lane.", Card: LaneCard, minCardWidth: 16, gap: 0.5 },
];

/** The pretend projector's screen, in CSS pixels; the stage scales it down to fit the page. */
const SCREEN = { width: 1600, height: 900 };

/** Five player-card designs for the Connect live board on a pretend projector, with Fit sizing the cards to fill the screen. */
export function BoardCardsShowcase() {
  const [concept, setConcept] = useState(0);
  const [count, setCount] = useState<number>(24);
  const [pictures, setPictures] = useState(true);
  const [fit, setFit] = useState(true);
  const [manualSize, setManualSize] = useState(1.2);
  const sim = useBoardSim();
  const players = useMemo(() => cardViews(sim, count, pictures), [sim, count, pictures]);
  const { name, summary, Card, minCardWidth, gap } = CONCEPTS[concept];

  const frameRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [scale, setScale] = useState(0);
  const [area, setArea] = useState({ width: 0, height: 0, remPx: 16 });
  // Tallest card's height in px at size 1.
  const [unitHeight, setUnitHeight] = useState(0);

  const fitSize = fit && unitHeight > 0 && area.width > 0
    ? fitCardScale({ count: players.length, width: area.width, height: area.height, cardHeight: unitHeight, minCardWidth, gap, remPx: area.remPx })
    : null;
  const size = fitSize ?? manualSize;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const box = areaRef.current;
    if (!frame || !box) return;
    const measure = () => {
      setScale(frame.clientWidth / SCREEN.width);
      // The site's root font size is not always 16px, and card sizes are in rem.
      setArea({ width: box.clientWidth, height: box.clientHeight, remPx: parseFloat(getComputedStyle(document.documentElement).fontSize) || 16 });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(box);
    measure();
    return () => observer.disconnect();
  }, []);

  // Card heights are all in em, so one measurement at any size gives the height at size 1.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      let tallest = 0;
      for (const child of Array.from(list.children)) tallest = Math.max(tallest, (child as HTMLElement).offsetHeight);
      if (tallest === 0) return;
      const next = tallest / size;
      setUnitHeight((previous) => (Math.abs(previous - next) < 0.25 ? previous : next));
    };
    const observer = new ResizeObserver(measure);
    for (const child of Array.from(list.children)) observer.observe(child);
    measure();
    return () => observer.disconnect();
  }, [concept, count, pictures, size]);

  const listStyle: CSSProperties = {
    fontSize: `${size}rem`,
    gap: `${gap}em`,
    gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minCardWidth}em), 1fr))`,
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PressedGroup label="Card concept">
        {CONCEPTS.map((entry, index) => (
          <PressedButton key={entry.name} pressed={concept === index} onClick={() => setConcept(index)} layoutId="board-cards-concept">
            <span className="text-muted-foreground">{String(index + 1).padStart(2, "0")}</span> {entry.name}
          </PressedButton>
        ))}
      </PressedGroup>
      <div className="flex flex-wrap items-center gap-2">
        <PressedGroup label="Players">
          {PLAYER_COUNTS.map((value) => (
            <PressedButton key={value} pressed={count === value} onClick={() => setCount(value)} layoutId="board-cards-count">
              {value === PLAYER_COUNTS[0] && <UsersThreeIcon className="size-3.5" aria-hidden="true" />}{value}
            </PressedButton>
          ))}
        </PressedGroup>
        <PressedGroup label="Avatars">
          <PressedButton pressed={pictures} onClick={() => setPictures(true)} layoutId="board-cards-pictures">
            <ImageIcon className="size-3.5" aria-hidden="true" />Pictures
          </PressedButton>
          <PressedButton pressed={!pictures} onClick={() => setPictures(false)} layoutId="board-cards-pictures">
            <TextAaIcon className="size-3.5" aria-hidden="true" />Letters
          </PressedButton>
        </PressedGroup>
        <PressedGroup label="Card size">
          <PressedButton pressed={fit} onClick={() => setFit(true)} layoutId="board-cards-fit">
            <ArrowsOutIcon className="size-3.5" aria-hidden="true" />Fit
          </PressedButton>
          <PressedButton pressed={!fit} onClick={() => setFit(false)} layoutId="board-cards-fit">Manual</PressedButton>
        </PressedGroup>
        <label className={cn("flex min-w-[12rem] flex-1 items-center gap-3 rounded-2xl bg-muted/60 px-3 py-2 text-xs sm:max-w-[18rem]", fit && "opacity-60")}>
          <span className="shrink-0 text-muted-foreground">Size</span>
          <Slider aria-label="Card size" min={CARD_SIZE.min} max={CARD_SIZE.max} step={CARD_SIZE.step} value={[manualSize]} disabled={fit}
            onValueChange={([value]) => setManualSize(value)} />
          <span className="w-10 shrink-0 text-right tabular-nums">{size.toFixed(2)}×</span>
        </label>
      </div>
      <p className="px-1 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{name}.</span> {summary}
      </p>

      <figure className="flex min-w-0 flex-col gap-2">
        <div className="rounded-2xl bg-muted p-2 shadow-sm ring-1 ring-border">
          <div ref={frameRef} className="relative aspect-video w-full overflow-hidden rounded-lg bg-background">
            <div className="absolute left-0 top-0 flex origin-top-left flex-col bg-background font-mono text-foreground"
              style={{ width: SCREEN.width, height: SCREEN.height, transform: `scale(${scale})`, visibility: scale ? "visible" : "hidden" }}>
              <BoardHeader players={players} />
              <div className="min-h-0 flex-1 px-6 pb-6">
                <div ref={areaRef} className="h-full overflow-y-auto overflow-x-hidden">
                  <ul ref={listRef} aria-label="Players" className="grid content-start" style={listStyle}>
                    {players.map((player) => (
                      <li key={player.id} className="flex min-w-0" data-status={player.status}>
                        <Card player={player} tests={SIM_TESTS} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <figcaption className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <ProjectorScreenIcon className="size-3.5 shrink-0" aria-hidden="true" />
          Pretend projector, {SCREEN.width}×{SCREEN.height}. Cards at {size.toFixed(2)}× {fit ? "(Fit)" : "(manual)"}.
        </figcaption>
      </figure>
    </div>
  );
}

function BoardHeader({ players }: { players: CardView[] }) {
  const tally = (match: (player: CardView) => boolean) => players.filter(match).length;
  const chips: [string, number][] = [
    ["typing", tally((player) => player.status === "typing")],
    ["finished", tally((player) => player.finished)],
    ["on a break", tally((player) => player.status === "break")],
    ["offline", tally((player) => player.away)],
  ];
  return (
    <header className="flex items-center justify-between gap-6 px-6 pb-4 pt-5">
      <div className="flex min-w-0 items-center gap-4">
        <h3 className="truncate text-2xl font-bold">{ROOM_NAME}</h3>
        <span className="rounded-xl bg-primary/12 px-3 py-1 text-xl font-black tracking-[0.3em] text-primary">{ROOM_CODE}</span>
      </div>
      <ul aria-label="Room counts" className="flex shrink-0 items-center gap-2 text-base">
        {chips.map(([label, value]) => (
          <li key={label} className="rounded-full bg-muted px-3 py-1 text-muted-foreground">
            <span className="font-bold tabular-nums text-foreground">{value}</span> {label}
          </li>
        ))}
      </ul>
    </header>
  );
}

function PressedGroup({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label} className="flex max-w-full flex-wrap gap-1 rounded-2xl bg-muted/60 p-1">{children}</div>;
}

function PressedButton({ pressed, onClick, layoutId, children }: { pressed: boolean; onClick: () => void; layoutId: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="relative rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-pressed:text-foreground"
    >
      {pressed && <motion.span layoutId={layoutId} transition={CONNECT_SPRING} className="absolute inset-0 rounded-xl bg-card shadow-sm" />}
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </button>
  );
}
