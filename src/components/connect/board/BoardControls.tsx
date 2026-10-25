import { useId } from "react";
import { ListIcon, SortAscendingIcon, SortDescendingIcon, SquaresFourIcon } from "@phosphor-icons/react";
import type { BoardPrefs, BoardSort } from "@/hooks/useConnectBoardPrefs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface BoardControlsProps {
  prefs: BoardPrefs;
  onChange: (changes: Partial<BoardPrefs>) => void;
  className?: string;
}

const BOARD_SORT_OPTIONS: { value: BoardSort; label: string }[] = [
  { value: "join", label: "Join order" },
  { value: "name", label: "Name" },
  { value: "wpm", label: "WPM" },
  { value: "accuracy", label: "Accuracy" },
  { value: "progress", label: "Progress" },
  { value: "custom", label: "Custom (drag)" },
];

// Scores read best highest-first; names and join order read best first-to-last.
const DEFAULT_DESCENDING: Record<BoardSort, boolean> = {
  join: false, name: false, wpm: true, accuracy: true, progress: true, custom: false,
};

export function BoardControls({ prefs, onChange, className }: BoardControlsProps) {
  const id = useId();
  const sortId = `${id}-sort`;
  const sizeId = `${id}-size`;
  const offlineId = `${id}-offline`;
  const custom = prefs.sort === "custom";

  return (
    <div className={cn("flex flex-wrap items-center gap-x-5 gap-y-3", className)} role="group" aria-label="Board settings">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={prefs.layout}
        onValueChange={(value) => { if (value === "grid" || value === "list") onChange({ layout: value }); }}
        aria-label="Layout"
      >
        <ToggleGroupItem value="grid" aria-label="Grid layout" title="Grid">
          <SquaresFourIcon aria-hidden="true" />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label="List layout" title="List">
          <ListIcon aria-hidden="true" />
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="flex items-center gap-2">
        <Label htmlFor={sortId} className="text-muted-foreground">Sort</Label>
        <div className="w-40">
          <NativeSelect
            id={sortId}
            size="sm"
            value={prefs.sort}
            onChange={(event) => {
              const sort = event.target.value as BoardSort;
              onChange({ sort, descending: DEFAULT_DESCENDING[sort] });
            }}
          >
            {BOARD_SORT_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>{option.label}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={custom}
          aria-label={prefs.descending ? "Sorted descending; switch to ascending" : "Sorted ascending; switch to descending"}
          title={prefs.descending ? "Descending" : "Ascending"}
          onClick={() => onChange({ descending: !prefs.descending })}
        >
          {prefs.descending ? <SortDescendingIcon aria-hidden="true" /> : <SortAscendingIcon aria-hidden="true" />}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Label id={sizeId} className="text-muted-foreground">Card size</Label>
        <Slider
          className="w-28"
          min={0.8}
          max={1.6}
          step={0.1}
          value={[prefs.cardSize]}
          onValueChange={([value]) => { if (value !== undefined) onChange({ cardSize: Math.round(value * 10) / 10 }); }}
          aria-labelledby={sizeId}
        />
        <span className="w-9 text-right text-xs tabular-nums text-muted-foreground" aria-hidden="true">{Math.round(prefs.cardSize * 100)}%</span>
      </div>

      <div className="flex items-center gap-2">
        <Switch id={offlineId} checked={prefs.showOffline} onCheckedChange={(checked) => onChange({ showOffline: checked })} />
        <Label htmlFor={offlineId}>Show offline</Label>
      </div>
    </div>
  );
}
