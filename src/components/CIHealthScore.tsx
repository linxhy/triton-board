import type { PRMetrics } from "@/types";
import { percentile } from "@/utils/format";
import { Activity, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

interface CIHealthScoreProps {
  prs: PRMetrics[];
}

function computeHealthScore(prs: PRMetrics[]): {
  score: number;
  passRateScore: number;
  durationScore: number;
  stabilityScore: number;
  queueScore: number;
  flakyCount: number;
} {
  if (prs.length === 0) {
    return { score: 0, passRateScore: 0, durationScore: 0, stabilityScore: 0, queueScore: 0, flakyCount: 0 };
  }

  const totalWorkflows = prs.reduce((s, p) => s + p.workflows.length, 0);
  const successWorkflows = prs.reduce(
    (s, p) => s + p.workflows.filter((w) => w.conclusion === "success").length,
    0
  );
  const passRate = totalWorkflows > 0 ? successWorkflows / totalWorkflows : 0;
  const passRateScore = passRate * 100;

  const e2eDurations = prs.filter((p) => p.e2eDuration !== null).map((p) => p.e2eDuration!);
  const p90Duration = percentile(e2eDurations, 90);
  const targetDuration = 4 * 3600000;
  const durationScore = p90Duration > 0 ? Math.max(0, Math.min(100, (1 - p90Duration / targetDuration / 2) * 100)) : 50;

  const wfStats = new Map<string, { success: number; total: number }>();
  prs.forEach((pr) => {
    pr.workflows.forEach((wf) => {
      const existing = wfStats.get(wf.name) || { success: 0, total: 0 };
      existing.total += 1;
      if (wf.conclusion === "success") existing.success += 1;
      wfStats.set(wf.name, existing);
    });
  });
  const flakyWorkflows = Array.from(wfStats.entries()).filter(
    ([, stats]) => stats.total >= 3 && stats.success / stats.total > 0.5 && stats.success / stats.total < 0.95
  );
  const flakyRate = wfStats.size > 0 ? flakyWorkflows.length / wfStats.size : 0;
  const stabilityScore = Math.max(0, (1 - flakyRate * 3) * 100);

  const queueDurations = prs.filter((p) => p.queueDuration !== null).map((p) => p.queueDuration!);
  const p90Queue = percentile(queueDurations, 90);
  const targetQueue = 30 * 60000;
  const queueScore = p90Queue > 0 ? Math.max(0, Math.min(100, (1 - p90Queue / targetQueue / 2) * 100)) : 50;

  const score = Math.round(
    passRateScore * 0.3 + durationScore * 0.25 + stabilityScore * 0.25 + queueScore * 0.2
  );

  return { score, passRateScore: Math.round(passRateScore), durationScore: Math.round(durationScore), stabilityScore: Math.round(stabilityScore), queueScore: Math.round(queueScore), flakyCount: flakyWorkflows.length };
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[10px] text-slate-500">/ 100</span>
      </div>
    </div>
  );
}

function DimensionBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-24 text-xs text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-mono text-slate-400">{score}</span>
    </div>
  );
}

export default function CIHealthScore({ prs }: CIHealthScoreProps) {
  const health = computeHealthScore(prs);
  const level = health.score >= 80 ? "优秀" : health.score >= 60 ? "一般" : "需改进";
  const levelColor = health.score >= 80 ? "text-emerald-400" : health.score >= 60 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">CI 健康评分</h3>
        <span className={`text-xs font-medium ${levelColor}`}>{level}</span>
      </div>
      <div className="flex items-start gap-6">
        <ScoreRing score={health.score} />
        <div className="flex-1 space-y-3 pt-2">
          <DimensionBar label="通过率" score={health.passRateScore} icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
          <DimensionBar label="时长" score={health.durationScore} icon={<Clock className="w-3.5 h-3.5" />} />
          <DimensionBar label="稳定性" score={health.stabilityScore} icon={<Activity className="w-3.5 h-3.5" />} />
          <DimensionBar label="排队" score={health.queueScore} icon={<AlertTriangle className="w-3.5 h-3.5" />} />
        </div>
      </div>
      {health.flakyCount > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-amber-300">
            检测到 {health.flakyCount} 个疑似 Flaky Workflow（通过率 50%-95%）
          </span>
        </div>
      )}
    </div>
  );
}
