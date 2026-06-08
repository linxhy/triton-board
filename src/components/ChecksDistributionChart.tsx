import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDurationShort } from "@/utils/format";

const COLORS = [
  "#38bdf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#e879f9", "#facc15", "#fb923c", "#a78bfa",
];

interface ChecksDistributionChartProps {
  prs: PRMetrics[];
}

export default function ChecksDistributionChart({ prs }: ChecksDistributionChartProps) {
  const allCheckNames = new Set<string>();
  prs.forEach((pr) => {
    pr.checks.forEach((c) => allCheckNames.add(c.name));
  });

  const topChecks = Array.from(allCheckNames)
    .map((name) => {
      const totalDuration = prs.reduce((sum, pr) => {
        const check = pr.checks.find((c) => c.name === name);
        return sum + (check?.duration || 0);
      }, 0);
      return { name, totalDuration };
    })
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .slice(0, 10)
    .map((c) => c.name);

  const data = [...prs]
    .reverse()
    .filter((pr) => pr.e2eDuration !== null)
    .map((pr) => {
      const entry: Record<string, string | number> = { name: `#${pr.prNumber}` };
      topChecks.forEach((checkName) => {
        const check = pr.checks.find((c) => c.name === checkName);
        entry[checkName] = check?.duration ? check.duration / 60000 : 0;
      });
      return entry;
    });

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <h3 className="text-sm font-medium text-slate-300 mb-4">Checks 任务时长分布</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
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
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }}
              iconSize={8}
            />
            {topChecks.map((checkName, i) => (
              <Bar
                key={checkName}
                dataKey={checkName}
                stackId="a"
                fill={COLORS[i % COLORS.length]}
                radius={i === topChecks.length - 1 ? [2, 2, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
