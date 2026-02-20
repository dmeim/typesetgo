import { useState, useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Dot,
} from "recharts";
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
import type { LegacyTheme } from "@/types/theme";

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
  theme: LegacyTheme;
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
        title: `Typing Time - ${cardValue}`,
        yLabel: "Duration",
        dataKey: "duration" as const,
        unit: "s",
        hasHighlights: false,
      };
    case "bestWpm":
      return {
        title: `Best WPM - ${cardValue}`,
        yLabel: "WPM",
        dataKey: "wpm" as const,
        unit: "",
        hasHighlights: true,
      };
    case "avgWpm":
      return {
        title: `Average WPM - ${cardValue}`,
        yLabel: "WPM",
        dataKey: "wpm" as const,
        unit: "",
        hasHighlights: true,
      };
    case "avgAccuracy":
      return {
        title: `Average Accuracy - ${cardValue}`,
        yLabel: "Accuracy",
        dataKey: "accuracy" as const,
        unit: "%",
        hasHighlights: true,
      };
    case "wordsTyped":
      return {
        title: `Words Typed - ${cardValue}`,
        yLabel: "Words",
        dataKey: "words" as const,
        unit: "",
        hasHighlights: false,
      };
    case "characters":
      return {
        title: `Characters - ${cardValue}`,
        yLabel: "Characters",
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
  theme,
}: UserStatsChartModalProps) {
  const [showBest, setShowBest] = useState(true);
  const [showLowest, setShowLowest] = useState(true);

  const meta = getChartMeta(cardType, cardValue);

  // Build chart data from results (chronological order, valid only)
  const { chartData } = useMemo(() => {
    const validResults = allResults
      .filter((r) => r.isValid !== false)
      .sort((a, b) => a.createdAt - b.createdAt);

    let bestIdx = -1;
    let lowestIdx = -1;
    let bestVal = -Infinity;
    let lowestVal = Infinity;

    const data = validResults.map((r, i) => {
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

      if (value > bestVal) {
        bestVal = value;
        bestIdx = i;
      }
      if (value < lowestVal) {
        lowestVal = value;
        lowestIdx = i;
      }

      return {
        time: r.createdAt,
        dateLabel: formatDate(r.createdAt),
        timeLabel: formatTime(r.createdAt),
        fullDate: formatFullDateTime(r.createdAt),
        value,
        // These will be set after the loop
        isBest: false,
        isLowest: false,
      };
    });

    if (bestIdx >= 0) data[bestIdx].isBest = true;
    if (lowestIdx >= 0) data[lowestIdx].isLowest = true;

    return { chartData: data };
  }, [allResults, meta.dataKey]);

  // Chart config using theme colors
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {
      value: {
        label: meta.yLabel,
        color: theme.buttonSelected,
      },
    };
    if (meta.hasHighlights) {
      config.best = {
        label: "Best / Highest",
        color: theme.statusSuccess,
      };
      config.lowest = {
        label: "Lowest",
        color: theme.statusError,
      };
    }
    return config;
  }, [meta.yLabel, meta.hasHighlights, theme]);

  // Compute dynamic Y-axis domain with buffer
  const yDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) return undefined;

    const values = chartData.map((d) => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    const BUFFER = 4;
    let lower = Math.max(0, Math.floor(minVal - BUFFER));
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
        className="max-w-none sm:max-w-none flex flex-col"
        style={{
          backgroundColor: theme.surfaceColor,
          borderColor: theme.borderSubtle,
          width: "80vw",
          maxHeight: "80vh",
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: theme.textPrimary }}>
            {meta.title}
          </DialogTitle>
          <DialogDescription style={{ color: theme.textSecondary }}>
            {hasData
              ? `Showing ${chartData.length} test${chartData.length !== 1 ? "s" : ""} over time`
              : "No test data available yet"}
          </DialogDescription>
        </DialogHeader>

        {/* Toggle buttons for highlight markers */}
        {meta.hasHighlights && hasData && (
          <div className="flex items-center gap-3 px-1">
            <ToggleChip
              label="Best / Highest"
              active={showBest}
              color={theme.statusSuccess}
              theme={theme}
              onClick={() => setShowBest(!showBest)}
            />
            <ToggleChip
              label="Lowest"
              active={showLowest}
              color={theme.statusError}
              theme={theme}
              onClick={() => setShowLowest(!showLowest)}
            />
          </div>
        )}

        {/* Chart */}
        {hasData ? (
          <ChartContainer
            config={chartConfig}
            className="min-h-0 flex-1 w-full"
          >
            <LineChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 12, left: 8, right: 12, bottom: 16 }}
            >
              <CartesianGrid
                vertical={false}
                stroke={theme.borderSubtle}
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
                      fill={theme.textSecondary}
                      fontSize={11}
                    >
                      {formatDate(payload.value)}
                    </text>
                    <text
                      x={0}
                      y={0}
                      dy={18}
                      textAnchor="middle"
                      fill={theme.textSecondary}
                      fontSize={10}
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
                tick={{ fill: theme.textSecondary, fontSize: 11 }}
                tickFormatter={formatYAxis}
                domain={yDomain}
                width={56}
              />
              <ChartTooltip
                cursor={{ stroke: theme.borderDefault }}
                content={
                  <ChartTooltipContent
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
                type="monotone"
                stroke={theme.buttonSelected}
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
                        fill={theme.statusSuccess}
                        stroke={theme.statusSuccess}
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
                        fill={theme.statusError}
                        stroke={theme.statusError}
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
                      fill={theme.buttonSelected}
                      stroke={theme.buttonSelected}
                    />
                  );
                }}
                activeDot={{
                  r: 5,
                  fill: theme.buttonSelected,
                  stroke: theme.surfaceColor,
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
                style={{ color: theme.textSecondary }}
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
            </div>
            <p className="text-sm" style={{ color: theme.textSecondary }}>
              Complete some typing tests to see your chart data
            </p>
          </div>
        )}

        {/* Legend for highlights */}
        {meta.hasHighlights && hasData && (
          <div
            className="flex items-center justify-center gap-6 text-xs"
            style={{ color: theme.textSecondary }}
          >
            <div className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: theme.buttonSelected }}
              />
              <span>All Tests</span>
            </div>
            {showBest && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.statusSuccess }}
                />
                <span>Best / Highest</span>
              </div>
            )}
            {showLowest && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: theme.statusError }}
                />
                <span>Lowest</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Small toggle chip component for highlight controls
function ToggleChip({
  label,
  active,
  color,
  theme,
  onClick,
}: {
  label: string;
  active: boolean;
  color: string;
  theme: LegacyTheme;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
      style={{
        backgroundColor: active ? `${color}20` : `${theme.defaultText}15`,
        color: active ? color : theme.textSecondary,
        border: `1px solid ${active ? `${color}40` : "transparent"}`,
      }}
    >
      <div
        className="h-2 w-2 rounded-full transition-colors"
        style={{
          backgroundColor: active ? color : theme.textSecondary,
          opacity: active ? 1 : 0.4,
        }}
      />
      {label}
    </button>
  );
}
