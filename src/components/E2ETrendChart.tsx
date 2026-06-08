import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDuration } from "@/utils/format";

interface E2ETrendChartProps {
  prs: PRMetrics[];
}

export default function E2ETrendChart({ prs }: E2ETrendChartProps) {
  const data = [...prs]
    .reverse()
    .filter((pr) => pr.e2eDuration !== null)
    .map((pr) => ({
      name: `#${pr.prNumber}`,
      value: pr.e2eDuration! / 3600000,
      raw: pr.e2eDuration,
      author: pr.author,
    }));

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <h3 className="text-sm font-medium text-slate-300 mb-4">E2E 时长趋势</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="e2eGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
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
              tickFormatter={(v: number) => `${v}h`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              formatter={(_value: number, _name: string, props: { payload: { raw: number | null; author: string } }) => [
                formatDuration(props.payload.raw),
                "E2E时长",
              ]}
              labelFormatter={(label: string) => `${label} by ${data.find(d => d.name === label)?.author || ""}`}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#e2eGradient)"
              dot={{ r: 3, fill: "#38bdf8", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#38bdf8", strokeWidth: 2, stroke: "#0f172a" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
