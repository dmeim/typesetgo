"use client";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
} from "recharts";
import { Theme } from "@/lib/typing-constants";

interface DataPoint {
  time: number;
  wpm: number;
  accuracy: number;
  raw?: number;
}

interface ResultsChartProps {
  data: DataPoint[];
  errors: number[];
  theme: Theme;
}

const CustomTooltip = ({ active, payload, label, theme }: any) => {
  if (active && payload && payload.length) {
    const wpmPayload = payload.find((p: any) => p.dataKey === "wpm");
    const accuracyPayload = payload.find((p: any) => p.dataKey === "accuracy");
    
    const wpm = wpmPayload ? wpmPayload.value : 0;
    const accuracy = accuracyPayload ? accuracyPayload.value : 0;

    return (
      <div
        className="rounded-lg p-3 shadow-xl border border-gray-700"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <p className="mb-2 font-mono text-sm text-gray-400">
          Time: {label}s
        </p>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.cursor }}></span>
             <span className="text-sm font-bold" style={{ color: theme.cursor }}>{Math.round(wpm)} WPM</span>
          </div>
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-gray-400"></span>
             <span className="text-sm font-bold text-gray-400">{Math.round(accuracy)}% Acc</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const CustomXShape = (props: any) => {
    const { cx, cy } = props;
    return (
        <text 
            x={cx} 
            y={cy} 
            dy={4} 
            textAnchor="middle" 
            fill="#ef4444" 
            fontSize={12} 
            fontWeight="bold"
            style={{ pointerEvents: 'none' }}
        >
            ✕
        </text>
    );
};

export default function ResultsChart({ data, errors, theme }: ResultsChartProps) {
  
  const errorPoints = errors.map(errorTime => {
      const closest = data.reduce((prev, curr) => {
          return (Math.abs(curr.time - errorTime) < Math.abs(prev.time - errorTime) ? curr : prev);
      });
      return { time: closest.time, wpm: closest.wpm }; 
  });

  return (
    // Applied Card Design
    <div className="relative overflow-hidden rounded-2xl bg-[#2c2e31] p-6 mb-8 border border-gray-800 hover:border-gray-700 transition-colors flex flex-col animate-fade-in h-[300px] md:h-[400px]">
       <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 self-start ml-2">Performance Over Time</div>
       <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
            data={data}
            margin={{
                top: 10,
                right: 10,
                left: 0,
                bottom: 10,
            }}
            >
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" opacity={0.1} vertical={false} />
            
            <XAxis 
                dataKey="time" 
                type="number"
                domain={['dataMin', 'dataMax']}
                stroke="#6b7280" 
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                interval="preserveStartEnd"
                tickFormatter={(val) => Math.floor(val).toString()}
                label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#6b7280', fontSize: 10 }}
                height={30}
            />
            
            <YAxis 
                yAxisId="left"
                stroke={theme.cursor} 
                tick={{ fill: theme.cursor, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, (dataMax: number) => Math.ceil(Math.max(dataMax || 0, 60) * 1.3)]}
                allowDecimals={false}
                width={50}
                tickMargin={10}
                label={{ 
                    value: 'Words Per Minute', 
                    angle: -90, 
                    position: 'insideLeft', 
                    style: { fill: theme.cursor, textAnchor: 'middle', fontSize: 12, fontWeight: 500 },
                    offset: 0 // Adjust offset to pull it closer/further from axis
                }}
            />
            
            <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                width={50}
                tickMargin={10}
                label={{ 
                    value: 'Accuracy', 
                    angle: 90, 
                    position: 'insideRight', 
                    style: { fill: '#9ca3af', textAnchor: 'middle', fontSize: 12, fontWeight: 500 },
                    offset: 0
                }}
            />
            
            <Tooltip 
                content={<CustomTooltip theme={theme} />} 
                cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '4 4' }}
                isAnimationActive={false}
                trigger="hover"
            />
            
            <Line
                yAxisId="left"
                type="monotone"
                dataKey="wpm"
                stroke={theme.cursor}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: theme.cursor, strokeWidth: 2, stroke: theme.backgroundColor }}
                animationDuration={1000}
            />
            
            <Line
                yAxisId="right"
                type="monotone"
                dataKey="accuracy"
                stroke="#9ca3af"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#9ca3af', strokeWidth: 0 }}
                strokeOpacity={0.5}
                animationDuration={1000}
            />
            
            <Scatter 
                yAxisId="left"
                data={errorPoints} 
                fill="#ef4444"
                shape={<CustomXShape />}
                isAnimationActive={false}
                pointerEvents="none"
                legendType="none"
                tooltipType="none"
            />

            </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
