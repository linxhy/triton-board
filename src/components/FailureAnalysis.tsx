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
import { formatPercent } from "@/utils/format";
import { XCircle, Clock, Ban } from "lucide-react";

const FAILURE_COLORS: Record<string, string> = {
  failure: "#ef4444",
  timed_out: "#f59e0b",
  cancelled: "#64748b",
};

interface FailureAnalysisProps {
  prs: PRMetrics[];
}

export default function FailureAnalysis({ prs }: FailureAnalysisProps) {
  const data = useMemo(() => {
    const checkStats = new Map<string, { failure: number; timed_out: number; cancelled: number; total: number; lastPR: number }>();

    prs.forEach((pr) => {
      pr.checks.forEach((c) => {
        if (c.conclusion === "success" || c.conclusion === null) return;
        const existing = checkStats.get(c.name) || { failure: 0, timed_out: 0, cancelled: 0, total: 0, lastPR: 0 };
        existing.total += 1;
        if (c.conclusion === "failure") existing.failure += 1;
        if (c.conclusion === "timed_out") existing.timed_out += 1;
        if (c.conclusion === "cancelled") existing.cancelled += 1;
        existing.lastPR = pr.prNumber;
        checkStats.set(c.name, existing);
      });
    });

    return Array.from(checkStats.entries())
      .map(([name, stats]) => ({
        name: name.length > 28 ? name.slice(0, 28) + "..." : name,
        fullName: name,
        failure: stats.failure,
        timed_out: stats.timed_out,
        cancelled: stats.cancelled,
        total: stats.total,
        failureRate: stats.total > 0 ? stats.failure / stats.total : 0,
        lastPR: stats.lastPR,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [prs]);

  const summary = useMemo(() => {
    let failure = 0, timedOut = 0, cancelled = 0;
    prs.forEach((pr) => {
      pr.checks.forEach((c) => {
        if (c.conclusion === "failure") failure++;
        if (c.conclusion === "timed_out") timedOut++;
        if (c.conclusion === "cancelled") cancelled++;
      });
    });
    return { failure, timedOut, cancelled, total: failure + timedOut + cancelled };
  }, [prs]);

  if (summary.total === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
        <h3 className="text-sm font-medium text-slate-300 mb-4">失败分析</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-emerald-400">当前筛选范围内无失败记录 ✓</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">失败分析</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-rose-400">
            <XCircle className="w-3 h-3" /> 失败 {summary.failure}
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <Clock className="w-3 h-3" /> 超时 {summary.timedOut}
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <Ban className="w-3 h-3" /> 取消 {summary.cancelled}
          </span>
        </div>
      </div>
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
              formatter={(_value: number, name: string, props: { payload: { fullName: string; failure: number; timed_out: number; cancelled: number; total: number; failureRate: number; lastPR: number } }) => {
                const p = props.payload;
                return [
                  <div key="tip" className="space-y-0.5">
                    <div>失败: {p.failure}次 · 超时: {p.timed_out}次 · 取消: {p.cancelled}次</div>
                    <div>失败率: {formatPercent(p.failureRate)}</div>
                    <div>最近失败: #{p.lastPR}</div>
                  </div>,
                  p.fullName,
                ];
              }}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.map((entry) => {
                const dominant = entry.failure >= entry.timed_out && entry.failure >= entry.cancelled
                  ? "failure"
                  : entry.timed_out >= entry.cancelled
                  ? "timed_out"
                  : "cancelled";
                return <Cell key={entry.fullName} fill={FAILURE_COLORS[dominant]} opacity={0.8} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
