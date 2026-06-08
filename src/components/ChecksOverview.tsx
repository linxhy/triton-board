import { useState, useMemo } from "react";
import type { PRMetrics } from "@/types";
import { formatDuration, formatDurationShort, formatPercent, percentile } from "@/utils/format";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

type SortField = "avgDuration" | "passRate" | "runs" | "flaky";
type SortDir = "asc" | "desc";

interface ChecksOverviewProps {
  prs: PRMetrics[];
}

export default function ChecksOverview({ prs }: ChecksOverviewProps) {
  const [sortField, setSortField] = useState<SortField>("avgDuration");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<string | null>(null);

  const data = useMemo(() => {
    const checkMap = new Map<string, { durations: number[]; successCount: number; failCount: number; timeoutCount: number }>();

    prs.forEach((pr) => {
      pr.checks.forEach((c) => {
        const existing = checkMap.get(c.name) || { durations: [], successCount: 0, failCount: 0, timeoutCount: 0 };
        if (c.duration) existing.durations.push(c.duration);
        if (c.conclusion === "success") existing.successCount++;
        if (c.conclusion === "failure") existing.failCount++;
        if (c.conclusion === "timed_out") existing.timeoutCount++;
        checkMap.set(c.name, existing);
      });
    });

    const maxAvg = Math.max(
      ...Array.from(checkMap.entries()).map(([, s]) =>
        s.durations.length > 0 ? s.durations.reduce((a, b) => a + b, 0) / s.durations.length : 0
      ),
      1
    );

    return Array.from(checkMap.entries())
      .map(([name, stats]) => {
        const avgDurationRaw = stats.durations.length > 0
          ? stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length
          : 0;
        const total = stats.successCount + stats.failCount + stats.timeoutCount;
        const passRate = total > 0 ? stats.successCount / total : 0;
        const isFlaky = total >= 3 && passRate > 0.5 && passRate < 0.95;

        const sparkData = [...prs]
          .reverse()
          .map((pr) => {
            const check = pr.checks.find((c) => c.name === name);
            return check?.duration ? check.duration / 60000 : null;
          });

        return {
          name,
          avgDuration: avgDurationRaw / maxAvg,
          avgDurationRaw,
          p50Duration: percentile(stats.durations, 50),
          p90Duration: percentile(stats.durations, 90),
          runs: total,
          passRate,
          failCount: stats.failCount,
          timeoutCount: stats.timeoutCount,
          isFlaky,
          durations: sparkData,
        };
      })
      .sort((a, b) => {
        const mul = sortDir === "desc" ? -1 : 1;
        switch (sortField) {
          case "avgDuration": return mul * (a.avgDurationRaw - b.avgDurationRaw);
          case "passRate": return mul * (a.passRate - b.passRate);
          case "runs": return mul * (a.runs - b.runs);
          case "flaky": return mul * ((a.isFlaky ? 0 : 1) - (b.isFlaky ? 0 : 1));
          default: return 0;
        }
      });
  }, [prs, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const barColor = (passRate: number, isFlaky: boolean) => {
    if (isFlaky) return "bg-amber-500";
    if (passRate >= 0.9) return "bg-emerald-500";
    if (passRate >= 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  const statusIcon = (passRate: number, isFlaky: boolean) => {
    if (isFlaky) return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    if (passRate >= 0.9) return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (passRate >= 0.5) return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
  };

  const SortHead = ({ field, label }: { field: SortField; label: string }) => (
    <th
      className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-2.5 h-2.5" />
      </span>
    </th>
  );

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.06]">
        <h3 className="text-sm font-medium text-slate-300">Checks 任务总览</h3>
        <div className="flex items-center gap-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-400" /> 稳定</span>
          <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-400" /> 不稳定</span>
          <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-rose-400" /> 高失败</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="px-3 py-2.5 w-8" />
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                任务名称
              </th>
              <SortHead field="avgDuration" label="平均耗时" />
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                耗时分布
              </th>
              <SortHead field="runs" label="运行次数" />
              <SortHead field="passRate" label="通过率" />
              <SortHead field="flaky" label="状态" />
              <th className="px-3 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isExpanded = expanded === row.name;
              return (
                <tbody key={row.name}>
                  <tr
                    className={cn(
                      "border-b border-white/[0.03] cursor-pointer transition-colors",
                      isExpanded ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"
                    )}
                    onClick={() => setExpanded(isExpanded ? null : row.name)}
                  >
                    <td className="px-3 py-2.5">{statusIcon(row.passRate, row.isFlaky)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs text-slate-200 font-medium truncate max-w-[240px] block" title={row.name}>
                        {row.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono text-slate-300">
                        {formatDurationShort(row.avgDurationRaw)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", barColor(row.passRate, row.isFlaky))}
                            style={{ width: `${Math.max(row.avgDuration * 100, 2)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 w-14 text-right">
                          P90 {formatDurationShort(row.p90Duration)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono text-slate-400">{row.runs}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-medium",
                        row.passRate >= 0.9 ? "bg-emerald-500/10 text-emerald-400" :
                        row.passRate >= 0.5 ? "bg-amber-500/10 text-amber-400" :
                        "bg-rose-500/10 text-rose-400"
                      )}>
                        {formatPercent(row.passRate)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {row.isFlaky ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                          <AlertTriangle className="w-3 h-3" /> Flaky
                        </span>
                      ) : row.failCount > 0 ? (
                        <span className="text-[10px] text-slate-500">
                          {row.failCount + row.timeoutCount}次失败
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500/60">稳定</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {isExpanded
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      }
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-white/[0.03] bg-white/[0.02]">
                      <td colSpan={8} className="px-5 py-3">
                        <div className="flex items-start gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2 text-[10px] text-slate-500">
                              <span>P50: <span className="text-slate-300 font-mono">{formatDuration(row.p50Duration)}</span></span>
                              <span>P90: <span className="text-slate-300 font-mono">{formatDuration(row.p90Duration)}</span></span>
                              <span>失败: <span className="text-rose-400 font-mono">{row.failCount}</span></span>
                              <span>超时: <span className="text-amber-400 font-mono">{row.timeoutCount}</span></span>
                            </div>
                            <div className="h-16 w-full max-w-md">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={row.durations.map((v, i) => ({ i, v }))}>
                                  <Line
                                    type="monotone"
                                    dataKey="v"
                                    stroke="#38bdf8"
                                    strokeWidth={1.5}
                                    dot={false}
                                    connectNulls={false}
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                            <span className="text-[9px] text-slate-600 mt-1 block">每 PR 耗时趋势（分钟）</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
