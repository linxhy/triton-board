import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from "recharts";
import type { PRMetrics } from "@/types";
import { formatDurationShort } from "@/utils/format";

interface AuthorDistributionProps {
  prs: PRMetrics[];
}

export default function AuthorDistribution({ prs }: AuthorDistributionProps) {
  const data = useMemo(() => {
    const authorMap = new Map<string, { prCount: number; totalE2E: number; e2eCount: number; totalPassRate: number; passCount: number }>();

    prs.forEach((pr) => {
      const existing = authorMap.get(pr.author) || { prCount: 0, totalE2E: 0, e2eCount: 0, totalPassRate: 0, passCount: 0 };
      existing.prCount += 1;
      if (pr.e2eDuration !== null) {
        existing.totalE2E += pr.e2eDuration;
        existing.e2eCount += 1;
      }
      if (pr.checks.length > 0) {
        existing.totalPassRate += pr.checksPassRate;
        existing.passCount += 1;
      }
      authorMap.set(pr.author, existing);
    });

    return Array.from(authorMap.entries())
      .map(([author, stats]) => ({
        author,
        prCount: stats.prCount,
        e2eCount: stats.e2eCount,
        avgE2E: stats.e2eCount > 0 ? stats.totalE2E / stats.e2eCount / 60000 : 0,
        avgE2ERaw: stats.e2eCount > 0 ? stats.totalE2E / stats.e2eCount : 0,
        avgPassRate: stats.passCount > 0 ? stats.totalPassRate / stats.passCount : 0,
      }))
      .filter((d) => d.e2eCount > 0);
  }, [prs]);

  if (data.length < 2) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">贡献者效能分布</h3>
        <span className="text-[10px] text-slate-500">X: PR数 · Y: 平均E2E时长 · 大小: 通过率</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              dataKey="prCount"
              name="PR数"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              label={{ value: "PR 数", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 10 }}
            />
            <YAxis
              type="number"
              dataKey="avgE2E"
              name="平均E2E"
              tick={{ fill: "#64748b", fontSize: 11 }}
              axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}m`}
            />
            <ZAxis type="number" dataKey="avgPassRate" range={[80, 400]} name="通过率" />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#e2e8f0",
              }}
              formatter={(_value: number, name: string) => {
                if (name === "平均E2E") return [null, name];
                return [_value, name];
              }}
              labelFormatter={(_label: string, payload: Array<{ payload: { author: string; prCount: number; avgE2ERaw: number; avgPassRate: number } }>) => {
                if (!payload || payload.length === 0) return "";
                const d = payload[0].payload;
                return `${d.author} · ${d.prCount}个PR · 平均E2E: ${formatDurationShort(d.avgE2ERaw)} · 通过率: ${(d.avgPassRate * 100).toFixed(0)}%`;
              }}
            />
            <Scatter data={data} fill="#38bdf8" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
