import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDuration, percentile } from "@/utils/format";
import { cn } from "@/lib/utils";

const METRIC_CONFIG = {
  e2e: { label: "E2E 时长", color: "#38bdf8", unit: "h", divisor: 3600000 },
  queue: { label: "排队时长", color: "#f59e0b", unit: "m", divisor: 60000 },
  wfTotal: { label: "Workflow 总时长", color: "#10b981", unit: "m", divisor: 60000 },
} as const;

type MetricKey = keyof typeof METRIC_CONFIG;

interface DurationTrendChartProps {
  prs: PRMetrics[];
}

export default function DurationTrendChart({ prs }: DurationTrendChartProps) {
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(
    new Set(["e2e", "queue"])
  );
  const [showPercentiles, setShowPercentiles] = useState(true);

  const toggleMetric = (key: MetricKey) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const data = useMemo(() => {
    return [...prs]
      .reverse()
      .filter((pr) => pr.e2eDuration !== null)
      .map((pr) => {
        const wfTotal = pr.workflows.reduce(
          (sum, wf) => sum + (wf.duration || 0),
          0
        );
        return {
          name: `#${pr.prNumber}`,
          e2e: pr.e2eDuration! / METRIC_CONFIG.e2e.divisor,
          e2eRaw: pr.e2eDuration,
          queue: pr.queueDuration ? pr.queueDuration / METRIC_CONFIG.queue.divisor : 0,
          queueRaw: pr.queueDuration,
          wfTotal: wfTotal / METRIC_CONFIG.wfTotal.divisor,
          wfTotalRaw: wfTotal,
          author: pr.author,
        };
      });
  }, [prs]);

  const referenceLines = useMemo(() => {
    if (!showPercentiles) return {};
    const lines: Record<MetricKey, { p50: number; p90: number }> = {} as never;
    for (const key of activeMetrics) {
      const cfg = METRIC_CONFIG[key];
      const rawKey = `${key}Raw` as "e2eRaw" | "queueRaw" | "wfTotalRaw";
      const values = data.map((d) => d[rawKey]).filter((v): v is number => v != null && v > 0);
      if (values.length > 0) {
        lines[key] = {
          p50: percentile(values, 50) / cfg.divisor,
          p90: percentile(values, 90) / cfg.divisor,
        };
      }
    }
    return lines;
  }, [data, activeMetrics, showPercentiles]);

  const maxDivisor = useMemo(() => {
    let max: number = METRIC_CONFIG.e2e.divisor;
    for (const key of activeMetrics) {
      if (METRIC_CONFIG[key].divisor < max) {
        max = METRIC_CONFIG[key].divisor;
      }
    }
    return max;
  }, [activeMetrics]);

  const unitLabel = maxDivisor >= 3600000 ? "h" : "m";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">时长趋势</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPercentiles(!showPercentiles)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
              showPercentiles
                ? "border-white/[0.12] bg-white/[0.06] text-slate-200"
                : "border-transparent bg-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            P50/P90
          </button>
          <div className="w-px h-4 bg-white/[0.08]" />
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => {
            const cfg = METRIC_CONFIG[key];
            const active = activeMetrics.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleMetric(key)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                  active
                    ? "border-white/[0.12] bg-white/[0.06]"
                    : "border-transparent bg-transparent opacity-40 hover:opacity-70"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cfg.color }}
                />
                <span className="text-slate-300">{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => (
                <linearGradient key={key} id={`trendGrad_${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={METRIC_CONFIG[key].color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={METRIC_CONFIG[key].color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="name"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}${unitLabel}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              formatter={(value: number, name: string) => {
                const rawKey = `${name}Raw` as "e2eRaw" | "queueRaw" | "wfTotalRaw";
                const item = data.find((d) => d[name as keyof typeof d] === value);
                const rawVal = item?.[rawKey];
                return [rawVal ? formatDuration(rawVal) : `${value.toFixed(1)}${unitLabel}`, METRIC_CONFIG[name as MetricKey]?.label || name];
              }}
              labelFormatter={(label: string) => {
                const item = data.find((d) => d.name === label);
                return item ? `${label} by ${item.author}` : label;
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              iconSize={8}
            />
            {showPercentiles && (Object.keys(referenceLines) as MetricKey[]).map((key) => {
              const ref = referenceLines[key];
              if (!ref) return null;
              const cfg = METRIC_CONFIG[key];
              return (
                <ReferenceLine
                  key={`p50_${key}`}
                  y={ref.p50}
                  stroke={cfg.color}
                  strokeDasharray="6 3"
                  strokeOpacity={0.5}
                  strokeWidth={1}
                  label={{ value: "P50", position: "right", fill: cfg.color, fontSize: 10, opacity: 0.7 }}
                />
              );
            })}
            {showPercentiles && (Object.keys(referenceLines) as MetricKey[]).map((key) => {
              const ref = referenceLines[key];
              if (!ref) return null;
              const cfg = METRIC_CONFIG[key];
              return (
                <ReferenceLine
                  key={`p90_${key}`}
                  y={ref.p90}
                  stroke={cfg.color}
                  strokeDasharray="2 4"
                  strokeOpacity={0.4}
                  strokeWidth={1}
                  label={{ value: "P90", position: "right", fill: cfg.color, fontSize: 10, opacity: 0.5 }}
                />
              );
            })}
            {(Object.keys(METRIC_CONFIG) as MetricKey[]).map((key) => {
              const cfg = METRIC_CONFIG[key];
              if (!activeMetrics.has(key)) return null;
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={cfg.label}
                  stroke={cfg.color}
                  strokeWidth={2}
                  fill={`url(#trendGrad_${key})`}
                  dot={{ r: 3, fill: cfg.color, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: cfg.color, strokeWidth: 2, stroke: "#0f172a" }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
