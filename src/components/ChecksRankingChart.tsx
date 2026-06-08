import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDuration, formatPercent } from "@/utils/format";

const COLORS = [
  "#38bdf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e879f9", "#facc15", "#fb923c", "#a78bfa",
];

interface ChecksRankingChartProps {
  prs: PRMetrics[];
}

export default function ChecksRankingChart({ prs }: ChecksRankingChartProps) {
  const data = useMemo(() => {
    const checkStats = new Map<string, { totalDuration: number; count: number; successCount: number; failCount: number }>();

    prs.forEach((pr) => {
      pr.checks.forEach((check) => {
        const existing = checkStats.get(check.name) || { totalDuration: 0, count: 0, successCount: 0, failCount: 0 };
        existing.count += 1;
        if (check.duration) existing.totalDuration += check.duration;
        if (check.conclusion === "success") existing.successCount += 1;
        if (check.conclusion === "failure") existing.failCount += 1;
        checkStats.set(check.name, existing);
      });
    });

    return Array.from(checkStats.entries())
      .map(([name, stats]) => ({
        name: name.length > 28 ? name.slice(0, 28) + "..." : name,
        fullName: name,
        avgDuration: stats.count > 0 ? stats.totalDuration / stats.count / 60000 : 0,
        avgDurationRaw: stats.count > 0 ? stats.totalDuration / stats.count : 0,
        maxDuration: 0,
        count: stats.count,
        successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
        failCount: stats.failCount,
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 15);
  }, [prs]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Checks 任务平均耗时排行</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500/60" /> 通过
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500/60" /> 失败
          </span>
        </div>
      </div>
      <div className="h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v}m`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              width={150}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              formatter={(_value: number, _name: string, props: { payload: { avgDurationRaw: number; count: number; successRate: number; fullName: string; failCount: number } }) => {
                const p = props.payload;
                return [
                  <div key="tip" className="space-y-0.5">
                    <div>平均耗时: {formatDuration(p.avgDurationRaw)}</div>
                    <div>运行次数: {p.count}次</div>
                    <div>通过率: {formatPercent(p.successRate)}</div>
                    <div>失败次数: {p.failCount}次</div>
                  </div>,
                  p.fullName,
                ];
              }}
            />
            <Bar dataKey="avgDuration" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={entry.fullName}
                  fill={COLORS[index % COLORS.length]}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
