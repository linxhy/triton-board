import { useEffect, useMemo } from "react";
import { Clock, Timer, GitPullRequest, CheckCircle2 } from "lucide-react";
import { useAppStore, TIME_RANGE_CONFIG } from "@/store/useAppStore";
import KPICard from "@/components/KPICard";
import CIHealthScore from "@/components/CIHealthScore";
import DurationTrendChart from "@/components/DurationTrendChart";
import ChecksOverview from "@/components/ChecksOverview";
import FailureAnalysis from "@/components/FailureAnalysis";
import AuthorDistribution from "@/components/AuthorDistribution";
import TokenConfig from "@/components/TokenConfig";
import { formatDuration, formatPercent, percentile, formatChangePercent } from "@/utils/format";

export default function Dashboard() {
  const { prs, prevPRs, loading, error, fetchPRData, timeRange, branch, autoRefresh, lastUpdated } = useAppStore();
  const rangeLabel = TIME_RANGE_CONFIG[timeRange].label;

  useEffect(() => {
    if (prs.length === 0) {
      fetchPRData();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchPRData();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchPRData]);

  const kpis = useMemo(() => {
    const withE2E = prs.filter((p) => p.e2eDuration !== null);
    const withQueue = prs.filter((p) => p.queueDuration !== null);

    const e2eDurations = withE2E.map((p) => p.e2eDuration!);
    const queueDurations = withQueue.map((p) => p.queueDuration!);

    const p50E2E = percentile(e2eDurations, 50);
    const p90E2E = percentile(e2eDurations, 90);
    const avgE2E = e2eDurations.length > 0 ? e2eDurations.reduce((s, v) => s + v, 0) / e2eDurations.length : 0;

    const p50Queue = percentile(queueDurations, 50);
    const p90Queue = percentile(queueDurations, 90);
    const avgQueue = queueDurations.length > 0 ? queueDurations.reduce((s, v) => s + v, 0) / queueDurations.length : 0;

    const totalChecks = prs.reduce((s, p) => s + p.checks.length, 0);
    const successChecks = prs.reduce(
      (s, p) => s + p.checks.filter((c) => c.conclusion === "success").length,
      0
    );
    const checksPassRate = totalChecks > 0 ? successChecks / totalChecks : 0;

    const prevWithE2E = prevPRs.filter((p) => p.e2eDuration !== null);
    const prevAvgE2E = prevWithE2E.length > 0
      ? prevWithE2E.reduce((s, p) => s + (p.e2eDuration || 0), 0) / prevWithE2E.length
      : 0;
    const prevWithQueue = prevPRs.filter((p) => p.queueDuration !== null);
    const prevAvgQueue = prevWithQueue.length > 0
      ? prevWithQueue.reduce((s, p) => s + (p.queueDuration || 0), 0) / prevWithQueue.length
      : 0;
    const prevTotalChecks = prevPRs.reduce((s, p) => s + p.checks.length, 0);
    const prevSuccessChecks = prevPRs.reduce(
      (s, p) => s + p.checks.filter((c) => c.conclusion === "success").length,
      0
    );
    const prevPassRate = prevTotalChecks > 0 ? prevSuccessChecks / prevTotalChecks : 0;

    return {
      avgE2E, p50E2E, p90E2E,
      avgQueue, p50Queue, p90Queue,
      totalPRs: prs.length,
      checksPassRate,
      e2eChange: formatChangePercent(avgE2E, prevAvgE2E),
      queueChange: formatChangePercent(avgQueue, prevAvgQueue),
      passRateChange: formatChangePercent(checksPassRate, prevPassRate),
    };
  }, [prs, prevPRs]);

  if (loading && prs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">正在从 GitHub 获取 PR 数据...</p>
          <p className="text-xs text-slate-600">首次加载可能需要较长时间</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-6 max-w-md text-center">
          <p className="text-sm text-rose-300 mb-3">{error}</p>
          <TokenConfig />
        </div>
      </div>
    );
  }

  const invertTrend = (trend: "up" | "down" | "neutral") => {
    if (trend === "up") return "down";
    if (trend === "down") return "up";
    return "neutral";
  };

  return (
    <div className="space-y-6">
      <TokenConfig />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="E2E 时长"
          value={formatDuration(kpis.avgE2E)}
          subtitle={`P50: ${formatDuration(kpis.p50E2E)} · P90: ${formatDuration(kpis.p90E2E)}（${rangeLabel}）`}
          icon={<Clock className="w-4 h-4" />}
          accentColor="#38bdf8"
          trend={invertTrend(kpis.e2eChange.trend)}
          trendValue={kpis.e2eChange.value}
        />
        <KPICard
          title="排队时长"
          value={formatDuration(kpis.avgQueue)}
          subtitle={`P50: ${formatDuration(kpis.p50Queue)} · P90: ${formatDuration(kpis.p90Queue)}（环境排队）`}
          icon={<Timer className="w-4 h-4" />}
          accentColor="#f59e0b"
          trend={invertTrend(kpis.queueChange.trend)}
          trendValue={kpis.queueChange.value}
        />
        <KPICard
          title="PR 总数"
          value={String(kpis.totalPRs)}
          subtitle={`${rangeLabel}已合并的 PR`}
          icon={<GitPullRequest className="w-4 h-4" />}
          accentColor="#8b5cf6"
        />
        <KPICard
          title="Checks 通过率"
          value={formatPercent(kpis.checksPassRate)}
          subtitle="所有 Check Run 的通过比例"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="#10b981"
          trend={kpis.passRateChange.trend}
          trendValue={kpis.passRateChange.value}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <DurationTrendChart prs={prs} />
        </div>
        <div>
          <CIHealthScore prs={prs} />
        </div>
      </div>

      <ChecksOverview prs={prs} key={`checks-${timeRange}-${branch}`} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FailureAnalysis prs={prs} />
        <AuthorDistribution prs={prs} />
      </div>

      {lastUpdated && (
        <div className="text-center text-[10px] text-slate-600">
          上次更新: {lastUpdated.toLocaleTimeString("zh-CN")} · 每5分钟自动刷新 · {autoRefresh ? "自动刷新已开启" : "自动刷新已关闭"}
        </div>
      )}
    </div>
  );
}
