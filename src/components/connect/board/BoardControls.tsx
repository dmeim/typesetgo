import {
  EyeIcon, EyeSlashIcon, ListIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, SortAscendingIcon, SortDescendingIcon, SquaresFourIcon, UserCircleIcon, UserCircleDashedIcon,
} from "@phosphor-icons/react";
import type { BoardPrefs, BoardSort } from "@/hooks/useConnectBoardPrefs";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { CHIP, ICON_BUTTON, Pills } from "@/components/connect/ConnectParts";
import { CARD_SIZE } from "@/components/connect/board/board-model";

export interface BoardControlsProps {
  prefs: BoardPrefs;
  onChange: (changes: Partial<BoardPrefs>) => void;
  /** The order on screen now; "Your order" starts from it the first time it is picked. */
  currentOrder?: () => string[];
  className?: string;
}

const SORTS: { value: BoardSort; label: string }[] = [
  { value: "join", label: "Joined" },
  { value: "name", label: "Name" },
  { value: "wpm", label: "WPM" },
  { value: "accuracy", label: "Accuracy" },
  { value: "progress", label: "Progress" },
  { value: "custom", label: "Your order" },
];

// Scores read best highest-first; names and join order read first-to-last.
const DEFAULT_DESCENDING: Record<BoardSort, boolean> = { join: false, name: false, wpm: true, accuracy: true, progress: true, custom: false };

const roundTenth = (value: number) => Math.round(value * 10) / 10;

/** Sort and its direction, layout, card size, offline players and pictures. A popped-out board follows these. */
export function BoardControls({ prefs, onChange, currentOrder, className }: BoardControlsProps) {
  const custom = prefs.sort === "custom";
  const nudge = (step: number) => onChange({ cardSize: Math.min(CARD_SIZE.max, Math.max(CARD_SIZE.min, roundTenth(prefs.cardSize + step))) });
  const sortBy = (sort: BoardSort) => onChange({
    sort,
    descending: DEFAULT_DESCENDING[sort],
    ...(sort === "custom" && !prefs.customOrder.length && currentOrder ? { customOrder: currentOrder() } : {}),
  });
  return (
    <div role="group" aria-label="Board settings" className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center gap-2">
        <ScrollRow aria-label="Sort players" className="min-w-0 flex-1 p-0.5">
          <Pills<BoardSort> label="Sort by" value={prefs.sort} onChange={sortBy} options={SORTS} className="shrink-0" />
        </ScrollRow>
        <button type="button" disabled={custom} onClick={() => onChange({ descending: !prefs.descending })} className={cn(CHIP, "px-2.5")}
          aria-label={prefs.descending ? "Highest first; switch to lowest first" : "Lowest first; switch to highest first"} title={prefs.descending ? "Highest first" : "Lowest first"}>
          {prefs.descending ? <SortDescendingIcon className="size-4" aria-hidden="true" /> : <SortAscendingIcon className="size-4" aria-hidden="true" />}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Pills<BoardPrefs["layout"]> label="Layout" value={prefs.layout} onChange={(layout) => onChange({ layout })} className="shrink-0"
          options={[{ value: "grid", label: "Cards", Icon: SquaresFourIcon }, { value: "list", label: "List", Icon: ListIcon }]} />
        <div className="flex min-w-56 flex-1 items-center gap-1">
          <button type="button" className={ICON_BUTTON} aria-label="Smaller cards" disabled={prefs.cardSize <= CARD_SIZE.min} onClick={() => nudge(-CARD_SIZE.step)}>
            <MagnifyingGlassMinusIcon className="size-4" aria-hidden="true" />
          </button>
          <Slider className="min-w-20 flex-1" aria-label="Card size" min={CARD_SIZE.min} max={CARD_SIZE.max} step={CARD_SIZE.step} value={[prefs.cardSize]}
            onValueChange={([value]) => { if (value !== undefined) onChange({ cardSize: roundTenth(value) }); }} />
          <button type="button" className={ICON_BUTTON} aria-label="Bigger cards" disabled={prefs.cardSize >= CARD_SIZE.max} onClick={() => nudge(CARD_SIZE.step)}>
            <MagnifyingGlassPlusIcon className="size-4" aria-hidden="true" />
          </button>
          <span className="w-11 text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">{Math.round(prefs.cardSize * 100)}%</span>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-pressed={prefs.showOffline} onClick={() => onChange({ showOffline: !prefs.showOffline })} className={CHIP}>
            {prefs.showOffline ? <EyeIcon className="size-4" aria-hidden="true" /> : <EyeSlashIcon className="size-4" aria-hidden="true" />}Offline
          </button>
          <button type="button" aria-pressed={prefs.showPictures} onClick={() => onChange({ showPictures: !prefs.showPictures })} className={CHIP}
            title={prefs.showPictures ? "Account pictures shown" : "Everyone shows as a letter"}>
            {prefs.showPictures ? <UserCircleIcon className="size-4" aria-hidden="true" /> : <UserCircleDashedIcon className="size-4" aria-hidden="true" />}Pictures
          </button>
        </div>
      </div>
      {custom && <p className="text-xs text-muted-foreground">Drag the dots on a card to move it. Use space and the arrow keys to move one with the keyboard.</p>}
    </div>
  );
}
