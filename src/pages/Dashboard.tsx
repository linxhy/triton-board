import { useEffect, useMemo } from "react";
import { Clock, Timer, GitPullRequest, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import KPICard from "@/components/KPICard";
import E2ETrendChart from "@/components/E2ETrendChart";
import QueueTrendChart from "@/components/QueueTrendChart";
import ChecksDistributionChart from "@/components/ChecksDistributionChart";
import ChecksRankingChart from "@/components/ChecksRankingChart";
import TokenConfig from "@/components/TokenConfig";
import { formatDuration, formatPercent } from "@/utils/format";

export default function Dashboard() {
  const { prs, loading, error, fetchPRData } = useAppStore();

  useEffect(() => {
    if (prs.length === 0) {
      fetchPRData(30);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const withE2E = prs.filter((p) => p.e2eDuration !== null);
    const withQueue = prs.filter((p) => p.queueDuration !== null);
    const avgE2E =
      withE2E.length > 0
        ? withE2E.reduce((s, p) => s + (p.e2eDuration || 0), 0) / withE2E.length
        : 0;
    const avgQueue =
      withQueue.length > 0
        ? withQueue.reduce((s, p) => s + (p.queueDuration || 0), 0) / withQueue.length
        : 0;
    const totalChecks = prs.reduce((s, p) => s + p.checks.length, 0);
    const successChecks = prs.reduce(
      (s, p) => s + p.checks.filter((c) => c.conclusion === "success").length,
      0
    );
    const checksPassRate = totalChecks > 0 ? successChecks / totalChecks : 0;

    return { avgE2E, avgQueue, totalPRs: prs.length, checksPassRate };
  }, [prs]);

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

  return (
    <div className="space-y-6">
      <TokenConfig />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="平均 E2E 时长"
          value={formatDuration(kpis.avgE2E)}
          subtitle={`${kpis.totalPRs} 个 PR 的平均值`}
          icon={<Clock className="w-4 h-4" />}
          accentColor="#38bdf8"
        />
        <KPICard
          title="平均排队时长"
          value={formatDuration(kpis.avgQueue)}
          subtitle="首个 Check 启动前的等待"
          icon={<Timer className="w-4 h-4" />}
          accentColor="#f59e0b"
        />
        <KPICard
          title="PR 总数"
          value={String(kpis.totalPRs)}
          subtitle="最近已合并的 PR"
          icon={<GitPullRequest className="w-4 h-4" />}
          accentColor="#8b5cf6"
        />
        <KPICard
          title="Checks 通过率"
          value={formatPercent(kpis.checksPassRate)}
          subtitle="所有 Check Run 的通过比例"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accentColor="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <E2ETrendChart prs={prs} />
        <QueueTrendChart prs={prs} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChecksDistributionChart prs={prs} />
        <ChecksRankingChart prs={prs} />
      </div>
    </div>
  );
}
