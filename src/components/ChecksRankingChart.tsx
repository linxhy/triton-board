import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDuration } from "@/utils/format";

const COLORS = [
  "#38bdf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

interface ChecksRankingChartProps {
  prs: PRMetrics[];
}

export default function ChecksRankingChart({ prs }: ChecksRankingChartProps) {
  const checkStats = new Map<string, { totalDuration: number; count: number; successCount: number }>();

  prs.forEach((pr) => {
    pr.checks.forEach((check) => {
      const existing = checkStats.get(check.name) || { totalDuration: 0, count: 0, successCount: 0 };
      existing.count += 1;
      if (check.duration) existing.totalDuration += check.duration;
      if (check.conclusion === "success") existing.successCount += 1;
      checkStats.set(check.name, existing);
    });
  });

  const data = Array.from(checkStats.entries())
    .map(([name, stats]) => ({
      name: name.length > 30 ? name.slice(0, 30) + "..." : name,
      fullName: name,
      avgDuration: stats.count > 0 ? stats.totalDuration / stats.count / 60000 : 0,
      avgDurationRaw: stats.count > 0 ? stats.totalDuration / stats.count : 0,
      count: stats.count,
      successRate: stats.count > 0 ? stats.successCount / stats.count : 0,
    }))
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 12);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Checks 任务平均耗时排行</h3>
      <div className="h-80">
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
              width={160}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              formatter={(_value: number, _name: string, props: { payload: { avgDurationRaw: number; count: number; successRate: number; fullName: string } }) => {
                const p = props.payload;
                return [
                  `${formatDuration(p.avgDurationRaw)} (运行${p.count}次, 通过率${(p.successRate * 100).toFixed(0)}%)`,
                  p.fullName,
                ];
              }}
            />
            <Bar
              dataKey="avgDuration"
              radius={[0, 4, 4, 0]}
              shape={(props: { x: number; y: number; width: number; height: number; index: number }) => {
                const { x, y, width, height, index } = props;
                const color = COLORS[(index || 0) % COLORS.length];
                return (
                  <rect x={x} y={y} width={width} height={height} fill={color} rx={4} opacity={0.8} />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
