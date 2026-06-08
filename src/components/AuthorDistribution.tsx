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
import { formatDurationShort, formatPercent } from "@/utils/format";

interface AuthorDistributionProps {
  prs: PRMetrics[];
}

export default function AuthorDistribution({ prs }: AuthorDistributionProps) {
  const data = useMemo(() => {
    const authorMap = new Map<string, {
      prCount: number;
      totalE2E: number;
      e2eCount: number;
      totalPassRate: number;
      passCount: number;
      totalQueue: number;
      queueCount: number;
    }>();

    prs.forEach((pr) => {
      const existing = authorMap.get(pr.author) || {
        prCount: 0, totalE2E: 0, e2eCount: 0,
        totalPassRate: 0, passCount: 0,
        totalQueue: 0, queueCount: 0,
      };
      existing.prCount += 1;
      if (pr.e2eDuration !== null) {
        existing.totalE2E += pr.e2eDuration;
        existing.e2eCount += 1;
      }
      if (pr.checks.length > 0) {
        existing.totalPassRate += pr.checksPassRate;
        existing.passCount += 1;
      }
      if (pr.queueDuration !== null) {
        existing.totalQueue += pr.queueDuration;
        existing.queueCount += 1;
      }
      authorMap.set(pr.author, existing);
    });

    return Array.from(authorMap.entries())
      .map(([author, stats]) => ({
        author,
        prCount: stats.prCount,
        avgE2E: stats.e2eCount > 0 ? stats.totalE2E / stats.e2eCount / 3600000 : 0,
        avgE2ERaw: stats.e2eCount > 0 ? stats.totalE2E / stats.e2eCount : 0,
        avgPassRate: stats.passCount > 0 ? stats.totalPassRate / stats.passCount : 0,
        avgQueue: stats.queueCount > 0 ? stats.totalQueue / stats.queueCount / 60000 : 0,
        avgQueueRaw: stats.queueCount > 0 ? stats.totalQueue / stats.queueCount : 0,
        hasData: stats.e2eCount > 0 || stats.passCount > 0,
      }))
      .filter((d) => d.hasData);
  }, [prs]);

  if (data.length < 2) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
        <h3 className="text-sm font-medium text-slate-300 mb-4">贡献者效能分布</h3>
        <div className="flex items-center justify-center h-48">
          <p className="text-sm text-slate-500">数据不足，至少需要2位贡献者</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">贡献者效能分布</h3>
        <span className="text-[10px] text-slate-500">X: PR数 · Y: 平均排队时长 · 大小: 通过率</span>
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
              allowDecimals={false}
            />
            <YAxis
              type="number"
              dataKey="avgQueue"
              name="平均排队"
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
                if (name === "平均排队") return [null, name];
                return [_value, name];
              }}
              labelFormatter={(_label: string, payload: Array<{ payload: { author: string; prCount: number; avgE2ERaw: number; avgPassRate: number; avgQueueRaw: number } }>) => {
                if (!payload || payload.length === 0) return "";
                const d = payload[0].payload;
                return `${d.author} · ${d.prCount}个PR · 平均E2E: ${formatDurationShort(d.avgE2ERaw)} · 平均排队: ${formatDurationShort(d.avgQueueRaw)} · 通过率: ${formatPercent(d.avgPassRate)}`;
              }}
            />
            <Scatter data={data} fill="#38bdf8" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-1.5">
        {data
          .sort((a, b) => b.prCount - a.prCount)
          .slice(0, 8)
          .map((d) => (
            <div key={d.author} className="flex items-center gap-3 text-[11px]">
              <span className="w-24 shrink-0 text-slate-300 truncate" title={d.author}>{d.author}</span>
              <span className="text-slate-500 w-14 shrink-0">{d.prCount} PR</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-500/60"
                  style={{ width: `${d.avgPassRate * 100}%` }}
                />
              </div>
              <span className="text-slate-400 font-mono w-12 text-right shrink-0">{formatPercent(d.avgPassRate)}</span>
              <span className="text-slate-500 font-mono w-20 text-right shrink-0">
                E2E {formatDurationShort(d.avgE2ERaw)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}
