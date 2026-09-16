import { useState, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Dot,
} from "recharts";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useTheme } from "@/hooks/useTheme";
import { tv } from "@/lib/theme-vars";
import { PROFILE_HISTORY_LIMIT } from "./profile-presentation";

// Which stat card was clicked
export type StatCardType =
  | "typingTime"
  | "bestWpm"
  | "avgWpm"
  | "avgAccuracy"
  | "wordsTyped"
  | "characters";

// Minimal test result shape needed for charts
interface ChartTestResult {
  wpm: number;
  accuracy: number;
  duration: number;
  wordCount: number;
  isValid?: boolean;
  createdAt: number;
}

interface UserStatsChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType: StatCardType;
  cardValue: string;
  allResults: ChartTestResult[];
  onCloseAutoFocus?: (event: Event) => void;
}

// Format date for x-axis ticks (e.g. "02/15")
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}/${day}`;
}

// Format time for x-axis ticks (e.g. "8:03 AM")
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

// Format full date+time for tooltip (e.g. "01/15/2025 at 8:03 AM")
function formatFullDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${month}/${day}/${year} at ${hour12}:${minutes} ${ampm}`;
}

// Format duration in seconds to readable string
function formatDurationValue(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Config for each card type
function getChartMeta(cardType: StatCardType, cardValue: string) {
  switch (cardType) {
    case "typingTime":
      return {
        title: "Recent typing time",
        lifetimeLabel: `Lifetime typing time: ${cardValue}`,
        yLabel: "Duration",
        dataKey: "duration" as const,
        unit: "s",
        hasHighlights: false,
      };
    case "bestWpm":
      return {
        title: "Recent WPM",
        lifetimeLabel: `Lifetime best WPM: ${cardValue}`,
        yLabel: "WPM",
        dataKey: "wpm" as const,
        unit: "",
        hasHighlights: true,
      };
    case "avgWpm":
      return {
        title: "Recent WPM",
        lifetimeLabel: `Lifetime average WPM: ${cardValue}`,
        yLabel: "WPM",
        dataKey: "wpm" as const,
        unit: "",
        hasHighlights: true,
      };
    case "avgAccuracy":
      return {
        title: "Recent accuracy",
        lifetimeLabel: `Lifetime average accuracy: ${cardValue}`,
        yLabel: "Accuracy",
        dataKey: "accuracy" as const,
        unit: "%",
        hasHighlights: true,
      };
    case "wordsTyped":
      return {
        title: "Recent words typed",
        lifetimeLabel: `Lifetime words typed: ${cardValue}`,
        yLabel: "Words",
        dataKey: "words" as const,
        unit: "",
        hasHighlights: false,
      };
    case "characters":
      return {
        title: "Recent estimated characters",
        lifetimeLabel: `Lifetime estimated characters: ${cardValue}`,
        yLabel: "Estimated characters",
        dataKey: "characters" as const,
        unit: "",
        hasHighlights: false,
      };
  }
}

export default function UserStatsChartModal({
  isOpen,
  onClose,
  cardType,
  cardValue,
  allResults,
  onCloseAutoFocus,
}: UserStatsChartModalProps) {
  const { colors } = useTheme();
  const [showBest, setShowBest] = useState(true);
  const [showLowest, setShowLowest] = useState(true);

  const meta = getChartMeta(cardType, cardValue);

  // Build chart data from results (chronological order, valid only)
  const { chartData } = useMemo(() => {
    const validResults = allResults
      .filter((r) => r.isValid !== false)
      .sort((a, b) => a.createdAt - b.createdAt);

    const data = validResults.map((r) => {
      let value: number;
      switch (meta.dataKey) {
        case "duration":
          value = Math.round(r.duration / 1000);
          break;
        case "wpm":
          value = r.wpm;
          break;
        case "accuracy":
          value = Math.round(r.accuracy * 10) / 10;
          break;
        case "words":
          value = r.wordCount;
          break;
        case "characters":
          value = r.wordCount * 5;
          break;
      }

      return {
        time: r.createdAt,
        dateLabel: formatDate(r.createdAt),
        timeLabel: formatTime(r.createdAt),
        fullDate: formatFullDateTime(r.createdAt),
        value,
      };
    });

    const { bestIndex, lowestIndex } = data.reduce((extrema, point, index) => ({
      bestIndex: point.value > (data[extrema.bestIndex]?.value ?? -Infinity) ? index : extrema.bestIndex,
      lowestIndex: point.value < (data[extrema.lowestIndex]?.value ?? Infinity) ? index : extrema.lowestIndex,
    }), { bestIndex: -1, lowestIndex: -1 });

    return { chartData: data.map((point, index) => ({
      ...point,
      isBest: index === bestIndex,
      isLowest: index === lowestIndex,
    })) };
  }, [allResults, meta.dataKey]);

  // Chart config using theme colors
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: meta.yLabel,
        color: colors.interactive.secondary.DEFAULT,
      },
    };
    if (meta.hasHighlights) {
      config.best = {
        label: "Highest in sample",
        color: colors.status.success.DEFAULT,
      };
      config.lowest = {
        label: "Lowest in sample",
        color: colors.status.error.DEFAULT,
      };
    }
    return config;
  }, [meta.yLabel, meta.hasHighlights, colors]);

  // Compute dynamic Y-axis domain with buffer
  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) return undefined;

    const values = chartData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const BUFFER = 4;
    const lower = Math.max(0, Math.floor(minVal - BUFFER));
    let upper = Math.ceil(maxVal + BUFFER);

    // Percentages can't exceed 100
    if (meta.dataKey === "accuracy") {
      upper = Math.min(upper, 100);
    }

    return [lower, upper];
  }, [chartData, meta.dataKey]);

  // Y-axis formatter
  const formatYAxis = (val: number) => {
    if (meta.dataKey === "duration") {
      return formatDurationValue(val * 1000);
    }
    if (meta.dataKey === "accuracy") {
      return `${val}%`;
    }
    return String(val);
  };

  // Custom tooltip formatter
  const tooltipFormatter = (val: number) => {
    if (meta.dataKey === "duration") {
      return formatDurationValue(val * 1000);
    }
    if (meta.dataKey === "accuracy") {
      return `${val}%`;
    }
    return val.toLocaleString();
  };

  const hasData = chartData.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto bg-card text-card-foreground shadow-none sm:max-w-4xl"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="pr-6">
          <DialogTitle>{meta.title}</DialogTitle>
          <DialogDescription>
            {chartData.length} valid tests from the latest {allResults.length} saved tests (up to {PROFILE_HISTORY_LIMIT}). Invalid tests are excluded.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 text-sm">
          <p>{meta.lifetimeLabel}</p>
          <p className="text-xs text-muted-foreground">Each point is one recent test. Highlights refer only to this sample.</p>
          {hasData && <p className="text-xs text-muted-foreground">{chartData[0].fullDate} – {chartData[chartData.length - 1].fullDate}</p>}
          {meta.dataKey === "characters" && <p className="text-xs text-muted-foreground">Estimated as words × 5; these are not measured keystrokes.</p>}
        </div>

        {/* Toggle buttons for highlight markers */}
        {meta.hasHighlights && hasData && (
          <div className="flex flex-wrap items-center gap-2">
            <ToggleChip
              label="Highest in sample"
              active={showBest}
              color={colors.status.success.DEFAULT}
              onClick={() => setShowBest(!showBest)}
            />
            <ToggleChip
              label="Lowest in sample"
              active={showLowest}
              color={colors.status.error.DEFAULT}
              onClick={() => setShowLowest(!showLowest)}
            />
          </div>
        )}

        {/* Chart */}
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="h-64 min-h-64 w-full shrink-0 aspect-auto sm:h-80 sm:min-h-80"
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, left: 8, right: 12, bottom: 16 }}
            >
              <CartesianGrid
                vertical={false}
                stroke={colors.border.subtle}
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                interval="preserveStartEnd"
                minTickGap={60}
                height={36}
                tick={({ x, y, payload }: { x: number; y: number; payload: { value: number } }) => (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={0}
                      dy={4}
                      textAnchor="middle"
                      fill={tv.ui.mutedForeground}
                      fontSize={12}
                    >
                      {formatDate(payload.value)}
                    </text>
                    <text
                      x={0}
                      y={0}
                      dy={18}
                      textAnchor="middle"
                      fill={tv.ui.mutedForeground}
                      fontSize={12}
                    >
                      {formatTime(payload.value)}
                    </text>
                  </g>
                )}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: tv.ui.mutedForeground, fontSize: 12 }}
                tickFormatter={formatYAxis}
                domain={yDomain}
                width={56}
              />
              <ChartTooltip
                cursor={{ stroke: colors.border.default }}
                content={
                  <ChartTooltipContent
                    className="bg-popover text-popover-foreground shadow-none"
                    labelFormatter={(_value, payload) => {
                      if (payload && payload.length > 0) {
                        const item = payload[0];
                        return (item.payload as { fullDate: string }).fullDate;
                      }
                      return String(_value);
                    }}
                    formatter={(val) => tooltipFormatter(val as number)}
                    hideIndicator
                  />
                }
              />
              <Line
                dataKey="value"
                isAnimationActive={false}
                type="linear"
                stroke={colors.interactive.secondary.DEFAULT}
                strokeWidth={2}
                dot={({ cx, cy, payload: dotPayload }) => {
                  const dp = dotPayload as {
                    isBest: boolean;
                    isLowest: boolean;
                    time: number;
                  };
                  // Determine fill color for special points
                  if (meta.hasHighlights && dp.isBest && showBest) {
                    return (
                      <Dot
                        key={dp.time}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={colors.status.success.DEFAULT}
                        stroke={colors.status.success.DEFAULT}
                      />
                    );
                  }
                  if (meta.hasHighlights && dp.isLowest && showLowest) {
                    return (
                      <Dot
                        key={dp.time}
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill={colors.status.error.DEFAULT}
                        stroke={colors.status.error.DEFAULT}
                      />
                    );
                  }
                  // Default small dot
                  return (
                    <Dot
                      key={dp.time}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill={colors.interactive.secondary.DEFAULT}
                      stroke={colors.interactive.secondary.DEFAULT}
                    />
                  );
                }}
                activeDot={{
                  r: 5,
                  fill: colors.interactive.secondary.DEFAULT,
                  stroke: colors.bg.surface,
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-16"
          >
            <div className="text-3xl mb-2 opacity-50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              No valid tests in the recent history sample.
            </p>
          </div>
        )}

        {/* Legend for highlights */}
        {meta.hasHighlights && hasData && (
          <div
            className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: colors.interactive.secondary.DEFAULT }}
              />
              <span>Valid tests in sample</span>
            </div>
            {showBest && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors.status.success.DEFAULT }}
                />
                <span>Highest in sample</span>
              </div>
            )}
            {showLowest && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: colors.status.error.DEFAULT }}
                />
                <span>Lowest in sample</span>
              </div>
            )}
          </div>
        )}
        {hasData && (
          <details className="rounded-md border border-border text-sm">
            <summary className="cursor-pointer rounded-md px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">View chart data ({chartData.length} tests)</summary>
            <div className="max-h-60 overflow-auto px-3 pb-3">
              <Table className="w-full text-left text-xs">
                <TableCaption className="sr-only">Recent valid tests, oldest first</TableCaption>
                <TableHeader><TableRow><TableHead scope="col" className="py-2">Date</TableHead><TableHead scope="col" className="py-2 text-right">{meta.yLabel}</TableHead></TableRow></TableHeader>
                <TableBody>{chartData.map((point, index) => (
                  <TableRow key={`${point.time}-${index}`} className="border-t border-border">
                    <TableHead scope="row" className="py-2 pr-2 font-normal">{point.fullDate}</TableHead>
                    <TableCell className="py-2 text-right tabular-nums">{tooltipFormatter(point.value)}{meta.hasHighlights && point.isBest ? " (highest in sample)" : ""}{meta.hasHighlights && point.isLowest ? " (lowest in sample)" : ""}</TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          </details>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ToggleChip({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-10 items-center gap-2 rounded-md border border-border px-3 py-2 text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"}`}
    >
      <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </button>
  );
}
