import {
  EyeIcon, EyeSlashIcon, FrameCornersIcon, IdentificationBadgeIcon, ListIcon, MagnifyingGlassMinusIcon, MagnifyingGlassPlusIcon, NumberSquareOneIcon, SortAscendingIcon, SortDescendingIcon,
  UserCircleIcon, UserCircleDashedIcon,
} from "@phosphor-icons/react";
import type { BoardPrefs, BoardSort, CardStyle } from "@/hooks/useConnectBoardPrefs";
import { ScrollRow } from "@/components/ui/scroll-row";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { CHIP, ICON_BUTTON, Pills, type PillOption } from "@/components/connect/ConnectParts";
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

type BoardLook = CardStyle | "list";

const LOOKS = [
  { value: "ribbon", label: "Ribbon", Icon: IdentificationBadgeIcon },
  { value: "big", label: "Big number", short: "Big", Icon: NumberSquareOneIcon },
  { value: "list", label: "List", Icon: ListIcon },
] satisfies PillOption<BoardLook>[];

const roundTenth = (value: number) => Math.round(value * 10) / 10;

function sortHandler({ prefs, onChange, currentOrder }: BoardControlsProps) {
  return (sort: BoardSort) => onChange({
    sort,
    descending: DEFAULT_DESCENDING[sort],
    ...(sort === "custom" && !prefs.customOrder.length && currentOrder ? { customOrder: currentOrder() } : {}),
  });
}

/** Sort and its direction. The live board puts these in its title row. */
export function BoardSortControls(props: BoardControlsProps) {
  const { prefs, onChange, className } = props;
  const sortBy = sortHandler(props);
  return (
    <div role="group" aria-label="Board sort" className={cn("flex min-w-0 items-center gap-2", className)}>
      <ScrollRow aria-label="Sort players" className="min-w-0 flex-1 p-0.5">
        <Pills<BoardSort> label="Sort by" value={prefs.sort} onChange={sortBy} options={SORTS} className="shrink-0" />
      </ScrollRow>
      <button type="button" disabled={prefs.sort === "custom"} onClick={() => onChange({ descending: !prefs.descending })} className={cn(CHIP, "px-2.5")}
        aria-label={prefs.descending ? "Highest first; switch to lowest first" : "Lowest first; switch to highest first"} title={prefs.descending ? "Highest first" : "Lowest first"}>
        {prefs.descending ? <SortDescendingIcon className="size-4" aria-hidden="true" /> : <SortAscendingIcon className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

/** Card style (Ribbon, Big number) or List, card size (or Fit), offline players and pictures. */
export function BoardViewControls({ prefs, onChange, className }: BoardControlsProps) {
  // Picking a size by hand leaves Fit.
  const setSize = (cardSize: number) => onChange({ cardSize: Math.min(CARD_SIZE.max, Math.max(CARD_SIZE.min, roundTenth(cardSize))), fit: false });
  return (
    <div role="group" aria-label="Board settings" className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Pills<BoardLook> label="Layout" value={prefs.layout === "list" ? "list" : prefs.cardStyle} options={LOOKS} className="shrink-0"
          onChange={(look) => onChange(look === "list" ? { layout: "list" } : { layout: "grid", cardStyle: look })} />
        <div className="flex min-w-56 flex-1 items-center gap-1">
          <button type="button" className={ICON_BUTTON} aria-label="Smaller cards" disabled={!prefs.fit && prefs.cardSize <= CARD_SIZE.min} onClick={() => setSize(prefs.cardSize - CARD_SIZE.step)}>
            <MagnifyingGlassMinusIcon className="size-4" aria-hidden="true" />
          </button>
          <Slider className={cn("min-w-20 flex-1 transition-opacity", prefs.fit && "opacity-50")} aria-label="Card size" min={CARD_SIZE.min} max={CARD_SIZE.max} step={CARD_SIZE.step} value={[prefs.cardSize]}
            onValueChange={([value]) => { if (value !== undefined) setSize(value); }} />
          <button type="button" className={ICON_BUTTON} aria-label="Bigger cards" disabled={!prefs.fit && prefs.cardSize >= CARD_SIZE.max} onClick={() => setSize(prefs.cardSize + CARD_SIZE.step)}>
            <MagnifyingGlassPlusIcon className="size-4" aria-hidden="true" />
          </button>
          <span className="w-11 text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">{prefs.fit ? "Auto" : `${Math.round(prefs.cardSize * 100)}%`}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={prefs.fit} onClick={() => onChange({ fit: !prefs.fit })} className={CHIP}
            title="Make the cards as big as they can be with everyone on screen at once">
            <FrameCornersIcon className="size-4" aria-hidden="true" />Fit
          </button>
          <button type="button" aria-pressed={prefs.showOffline} onClick={() => onChange({ showOffline: !prefs.showOffline })} className={CHIP}>
            {prefs.showOffline ? <EyeIcon className="size-4" aria-hidden="true" /> : <EyeSlashIcon className="size-4" aria-hidden="true" />}Offline
          </button>
          <button type="button" aria-pressed={prefs.showPictures} onClick={() => onChange({ showPictures: !prefs.showPictures })} className={CHIP}
            title={prefs.showPictures ? "Account pictures shown" : "Everyone shows as a letter"}>
            {prefs.showPictures ? <UserCircleIcon className="size-4" aria-hidden="true" /> : <UserCircleDashedIcon className="size-4" aria-hidden="true" />}Pictures
          </button>
        </div>
      </div>
      {prefs.sort === "custom" && <p className="text-xs text-muted-foreground">Drag the dots on a card to move it. Use space and the arrow keys to move one with the keyboard.</p>}
    </div>
  );
}
