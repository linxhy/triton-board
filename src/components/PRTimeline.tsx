import type { PRMetrics } from "@/types";
import { formatDuration } from "@/utils/format";
import { cn } from "@/lib/utils";

interface PRTimelineProps {
  pr: PRMetrics;
}

export default function PRTimeline({ pr }: PRTimelineProps) {
  const completedChecks = pr.checks.filter(
    (c) => c.startedAt && c.completedAt
  );

  if (completedChecks.length === 0 && !pr.queueDuration) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
        <p className="text-sm text-slate-500">暂无 Checks 数据</p>
      </div>
    );
  }

  const allTimes: number[] = [pr.createdAt.getTime()];
  if (pr.mergedAt) allTimes.push(pr.mergedAt.getTime());
  completedChecks.forEach((c) => {
    if (c.startedAt) allTimes.push(c.startedAt.getTime());
    if (c.completedAt) allTimes.push(c.completedAt.getTime());
  });

  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  const totalSpan = maxTime - minTime || 1;

  const toPercent = (time: number) => ((time - minTime) / totalSpan) * 100;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">
          #{pr.prNumber} 耗时分解
        </h3>
        <span className="text-xs text-slate-500 font-mono">
          E2E: {formatDuration(pr.e2eDuration)} | 排队: {formatDuration(pr.queueDuration)}
        </span>
      </div>

      <div className="space-y-2">
        {pr.queueDuration !== null && pr.queueDuration > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-32 text-xs text-slate-500 text-right shrink-0">排队等待</span>
            <div className="flex-1 h-6 relative">
              <div
                className="absolute top-0 h-full rounded bg-amber-500/30 border border-amber-500/40 flex items-center justify-center"
                style={{
                  left: `${toPercent(pr.createdAt.getTime())}%`,
                  width: `${Math.max(toPercent(pr.createdAt.getTime() + pr.queueDuration) - toPercent(pr.createdAt.getTime()), 1)}%`,
                }}
              >
                <span className="text-[10px] text-amber-300 font-mono whitespace-nowrap px-1">
                  {formatDuration(pr.queueDuration)}
                </span>
              </div>
            </div>
          </div>
        )}

        {completedChecks.map((check, i) => {
          if (!check.startedAt || !check.completedAt) return null;
          const width = toPercent(check.completedAt.getTime()) - toPercent(check.startedAt.getTime());
          const conclusionColor = check.conclusion === "success"
            ? "bg-emerald-500/30 border-emerald-500/40"
            : check.conclusion === "failure"
            ? "bg-rose-500/30 border-rose-500/40"
            : "bg-slate-500/30 border-slate-500/40";

          return (
            <div key={check.name + i} className="flex items-center gap-3">
              <span className="w-32 text-xs text-slate-500 text-right shrink-0 truncate" title={check.name}>
                {check.name.length > 18 ? check.name.slice(0, 18) + "..." : check.name}
              </span>
              <div className="flex-1 h-6 relative">
                <div
                  className={cn(
                    "absolute top-0 h-full rounded border flex items-center justify-center",
                    conclusionColor
                  )}
                  style={{
                    left: `${toPercent(check.startedAt.getTime())}%`,
                    width: `${Math.max(width, 0.5)}%`,
                  }}
                >
                  {width > 8 && (
                    <span className="text-[10px] font-mono whitespace-nowrap px-1 text-slate-300">
                      {formatDuration(check.duration)}
                    </span>
                  )}
                </div>
              </div>
              <span className="w-16 text-xs text-slate-500 font-mono shrink-0">
                {check.conclusion === "success" ? "✓" : check.conclusion === "failure" ? "✗" : "—"}
              </span>
            </div>
          );
        })}

        {pr.mergedAt && (
          <div className="flex items-center gap-3">
            <span className="w-32 text-xs text-slate-500 text-right shrink-0">合并</span>
            <div className="flex-1 h-6 relative">
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-purple-300"
                style={{ left: `${toPercent(pr.mergedAt.getTime())}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500/60" /> 排队
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" /> 成功
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500/60" /> 失败
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" /> 合并
        </span>
      </div>
    </div>
  );
}
