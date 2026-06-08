import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDurationShort } from "@/utils/format";
import { cn } from "@/lib/utils";
import { Layers, TrendingUp } from "lucide-react";

const COLORS = [
  "#38bdf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e879f9", "#facc15", "#fb923c", "#a78bfa",
];

type ViewMode = "stacked" | "individual";

interface ChecksDetailChartProps {
  prs: PRMetrics[];
}

export default function ChecksDetailChart({ prs }: ChecksDetailChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("stacked");
  const [selectedChecks, setSelectedChecks] = useState<Set<string>>(new Set());

  const allCheckNames = useMemo(() => {
    const names = new Set<string>();
    prs.forEach((pr) => pr.checks.forEach((c) => names.add(c.name)));
    return Array.from(names);
  }, [prs]);

  const topChecks = useMemo(() => {
    return allCheckNames
      .map((name) => {
        const totalDuration = prs.reduce((sum, pr) => {
          const check = pr.checks.find((c) => c.name === name);
          return sum + (check?.duration || 0);
        }, 0);
        return { name, totalDuration };
      })
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 15)
      .map((c) => c.name);
  }, [allCheckNames, prs]);

  const checkStats = useMemo(() => {
    const stats = new Map<string, { totalDuration: number; count: number; successCount: number }>();
    prs.forEach((pr) => {
      pr.checks.forEach((check) => {
        const existing = stats.get(check.name) || { totalDuration: 0, count: 0, successCount: 0 };
        existing.count += 1;
        if (check.duration) existing.totalDuration += check.duration;
        if (check.conclusion === "success") existing.successCount += 1;
        stats.set(check.name, existing);
      });
    });
    return stats;
  }, [prs]);

  const displayChecks = viewMode === "stacked" ? topChecks.slice(0, 10) : topChecks;

  const toggleCheck = (name: string) => {
    setSelectedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelectedChecks(new Set(displayChecks));
  const selectNone = () => setSelectedChecks(new Set());

  const stackedData = useMemo(() => {
    return [...prs]
      .reverse()
      .filter((pr) => pr.e2eDuration !== null)
      .map((pr) => {
        const entry: Record<string, string | number> = { name: `#${pr.prNumber}` };
        topChecks.slice(0, 10).forEach((checkName) => {
          const check = pr.checks.find((c) => c.name === checkName);
          entry[checkName] = check?.duration ? check.duration / 60000 : 0;
        });
        return entry;
      });
  }, [prs, topChecks]);

  const individualData = useMemo(() => {
    const checksToShow = selectedChecks.size > 0 ? displayChecks.filter((n) => selectedChecks.has(n)) : displayChecks.slice(0, 5);
    return [...prs]
      .reverse()
      .filter((pr) => pr.e2eDuration !== null)
      .map((pr) => {
        const entry: Record<string, string | number | null> = { name: `#${pr.prNumber}` };
        checksToShow.forEach((checkName) => {
          const check = pr.checks.find((c) => c.name === checkName);
          entry[checkName] = check?.duration ? check.duration / 60000 : null;
        });
        return entry;
      });
  }, [prs, displayChecks, selectedChecks]);

  const activeChecks = selectedChecks.size > 0
    ? displayChecks.filter((n) => selectedChecks.has(n))
    : displayChecks.slice(0, 5);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Checks 任务时长</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("stacked")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
              viewMode === "stacked"
                ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                : "border-transparent bg-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            总体
          </button>
          <button
            onClick={() => setViewMode("individual")}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
              viewMode === "individual"
                ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                : "border-transparent bg-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            分任务
          </button>
        </div>
      </div>

      {viewMode === "stacked" && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stackedData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                tickFormatter={(v: number) => `${v}m`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#e2e8f0",
                }}
                formatter={(value: number, name: string) => [
                  formatDurationShort(value * 60000),
                  name.length > 35 ? name.slice(0, 35) + "..." : name,
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }}
                iconSize={8}
                formatter={(value: string) =>
                  value.length > 20 ? value.slice(0, 20) + "..." : value
                }
              />
              {topChecks.slice(0, 10).map((checkName, i) => (
                <Bar
                  key={checkName}
                  dataKey={checkName}
                  stackId="a"
                  fill={COLORS[i % COLORS.length]}
                  radius={i === Math.min(topChecks.length, 10) - 1 ? [2, 2, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewMode === "individual" && (
        <>
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <button
              onClick={selectAll}
              className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              全选
            </button>
            <button
              onClick={selectNone}
              className="px-2 py-0.5 rounded text-[10px] font-medium text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
            >
              清空
            </button>
            <span className="text-[10px] text-slate-600">|</span>
            {displayChecks.map((checkName, i) => {
              const active = selectedChecks.has(checkName) || selectedChecks.size === 0;
              const stats = checkStats.get(checkName);
              const avgDur = stats && stats.count > 0 ? stats.totalDuration / stats.count : 0;
              return (
                <button
                  key={checkName}
                  onClick={() => toggleCheck(checkName)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all border",
                    active
                      ? "border-white/[0.1] bg-white/[0.06]"
                      : "border-transparent bg-transparent opacity-40 hover:opacity-70"
                  )}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-slate-300 truncate max-w-[120px]">
                    {checkName.length > 20 ? checkName.slice(0, 20) + "..." : checkName}
                  </span>
                  <span className="text-slate-600 font-mono">
                    {formatDurationShort(avgDur)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={individualData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                  tickFormatter={(v: number) => `${v}m`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#e2e8f0",
                  }}
                  formatter={(value: number | null, name: string) => {
                    if (value === null) return ["—", name];
                    return [formatDurationShort(value * 60000), name.length > 35 ? name.slice(0, 35) + "..." : name];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }}
                  iconSize={8}
                  formatter={(value: string) =>
                    value.length > 25 ? value.slice(0, 25) + "..." : value
                  }
                />
                {activeChecks.map((checkName) => (
                  <Line
                    key={checkName}
                    type="monotone"
                    dataKey={checkName}
                    stroke={COLORS[displayChecks.indexOf(checkName) % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS[displayChecks.indexOf(checkName) % COLORS.length], strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: "#0f172a" }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
