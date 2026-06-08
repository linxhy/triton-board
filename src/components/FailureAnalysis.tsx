import { useMemo, useState } from "react";
import type { PRMetrics } from "@/types";
import { formatPercent } from "@/utils/format";
import { cn } from "@/lib/utils";
import { XCircle, Clock, Ban, CheckCircle2, ArrowUpDown } from "lucide-react";

type SortField = "failRate" | "failCount" | "runs";
type SortDir = "asc" | "desc";

interface FailureAnalysisProps {
  prs: PRMetrics[];
}

export default function FailureAnalysis({ prs }: FailureAnalysisProps) {
  const [sortField, setSortField] = useState<SortField>("failRate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const data = useMemo(() => {
    const checkStats = new Map<string, { success: number; failure: number; timed_out: number; cancelled: number; lastPR: number }>();

    prs.forEach((pr) => {
      pr.checks.forEach((c) => {
        const existing = checkStats.get(c.name) || { success: 0, failure: 0, timed_out: 0, cancelled: 0, lastPR: 0 };
        if (c.conclusion === "success") existing.success++;
        else if (c.conclusion === "failure") { existing.failure++; existing.lastPR = pr.prNumber; }
        else if (c.conclusion === "timed_out") { existing.timed_out++; existing.lastPR = pr.prNumber; }
        else if (c.conclusion === "cancelled") { existing.cancelled++; }
        checkStats.set(c.name, existing);
      });
    });

    return Array.from(checkStats.entries())
      .map(([name, stats]) => {
        const total = stats.success + stats.failure + stats.timed_out + stats.cancelled;
        const failTotal = stats.failure + stats.timed_out + stats.cancelled;
        return {
          name: name.length > 25 ? name.slice(0, 25) + "..." : name,
          fullName: name,
          success: stats.success,
          failure: stats.failure,
          timed_out: stats.timed_out,
          cancelled: stats.cancelled,
          total,
          failTotal,
          failRate: total > 0 ? failTotal / total : 0,
          lastPR: stats.lastPR,
        };
      })
      .filter((d) => d.failTotal > 0)
      .sort((a, b) => {
        const mul = sortDir === "desc" ? -1 : 1;
        switch (sortField) {
          case "failRate": return mul * (a.failRate - b.failRate);
          case "failCount": return mul * (a.failTotal - b.failTotal);
          case "runs": return mul * (a.total - b.total);
          default: return 0;
        }
      })
      .slice(0, 15);
  }, [prs, sortField, sortDir]);

  const summary = useMemo(() => {
    let success = 0, failure = 0, timedOut = 0, cancelled = 0;
    prs.forEach((pr) => {
      pr.checks.forEach((c) => {
        if (c.conclusion === "success") success++;
        else if (c.conclusion === "failure") failure++;
        else if (c.conclusion === "timed_out") timedOut++;
        else if (c.conclusion === "cancelled") cancelled++;
      });
    });
    const total = success + failure + timedOut + cancelled;
    return { success, failure, timedOut, cancelled, total, failRate: total > 0 ? (failure + timedOut + cancelled) / total : 0 };
  }, [prs]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  if (summary.total === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
        <h3 className="text-sm font-medium text-slate-300 mb-4">失败分析</h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-slate-500">暂无 Check 数据</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">失败分析</h3>
          <span className="text-xs text-emerald-400 font-medium">全部通过 ✓</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">总运行次数</span>
            <span className="font-mono text-slate-300">{summary.total}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">通过率</span>
            <span className="font-mono text-emerald-400">{formatPercent(summary.success / summary.total)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(summary.success / summary.total) * 100}%` }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">失败分析</h3>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> 通过 {summary.success}
          </span>
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

      <div className="mb-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-slate-500">总体通过率</span>
            <span className={cn(
              "font-mono font-medium",
              summary.failRate <= 0.1 ? "text-emerald-400" : summary.failRate <= 0.3 ? "text-amber-400" : "text-rose-400"
            )}>
              {formatPercent(1 - summary.failRate)}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden flex">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(summary.success / summary.total) * 100}%` }} />
            <div className="h-full bg-rose-500 transition-all" style={{ width: `${(summary.failure / summary.total) * 100}%` }} />
            <div className="h-full bg-amber-500 transition-all" style={{ width: `${(summary.timedOut / summary.total) * 100}%` }} />
            <div className="h-full bg-slate-500 transition-all" style={{ width: `${(summary.cancelled / summary.total) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-slate-500">排序:</span>
        {([
          { field: "failRate" as SortField, label: "失败率" },
          { field: "failCount" as SortField, label: "失败次数" },
          { field: "runs" as SortField, label: "运行次数" },
        ]).map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all border",
              sortField === field
                ? "border-white/[0.1] bg-white/[0.06] text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            {label}
            <ArrowUpDown className="w-2.5 h-2.5" />
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {data.map((row) => {
          const passWidth = (row.success / row.total) * 100;
          const failWidth = (row.failure / row.total) * 100;
          const timeoutWidth = (row.timed_out / row.total) * 100;
          const cancelWidth = (row.cancelled / row.total) * 100;

          return (
            <div key={row.fullName} className="group">
              <div className="flex items-center gap-3">
                <div className="w-[140px] shrink-0">
                  <span className="text-[11px] text-slate-300 truncate block" title={row.fullName}>
                    {row.name}
                  </span>
                </div>
                <div className="flex-1 h-5 rounded-sm bg-white/[0.04] overflow-hidden flex relative">
                  <div className="h-full bg-emerald-500/70 transition-all" style={{ width: `${passWidth}%` }} />
                  <div className="h-full bg-rose-500/80 transition-all" style={{ width: `${failWidth}%` }} />
                  <div className="h-full bg-amber-500/70 transition-all" style={{ width: `${timeoutWidth}%` }} />
                  <div className="h-full bg-slate-500/50 transition-all" style={{ width: `${cancelWidth}%` }} />
                  {row.failRate > 0.15 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white/80">
                      {formatPercent(row.failRate)}
                    </span>
                  )}
                </div>
                <div className="w-20 shrink-0 text-right">
                  <span className={cn(
                    "text-[10px] font-mono",
                    row.failRate <= 0.1 ? "text-emerald-400" : row.failRate <= 0.3 ? "text-amber-400" : "text-rose-400"
                  )}>
                    {row.failTotal}/{row.total}
                  </span>
                </div>
              </div>
              <div className="hidden group-hover:flex items-center gap-3 mt-0.5 pl-[140px]">
                <span className="text-[9px] text-slate-600">
                  成功 {row.success} · 失败 <span className="text-rose-400">{row.failure}</span> · 超时 <span className="text-amber-400">{row.timed_out}</span> · 取消 <span className="text-slate-400">{row.cancelled}</span>
                  {row.lastPR > 0 && <span> · 最近失败 #{row.lastPR}</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
