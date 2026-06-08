import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import PRTable from "@/components/PRTable";
import PRTimeline from "@/components/PRTimeline";
import TokenConfig from "@/components/TokenConfig";
import type { PRMetrics } from "@/types";

export default function PRList() {
  const { prs, loading, error, fetchPRData } = useAppStore();
  const [selectedPR, setSelectedPR] = useState<PRMetrics | null>(null);

  useEffect(() => {
    if (prs.length === 0) {
      fetchPRData();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading && prs.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">正在从 GitHub 获取 PR 数据...</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">PR 列表</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            共 {prs.length} 个已合并 PR · 点击查看耗时分解
          </p>
        </div>
      </div>

      <PRTable prs={prs} onSelectPR={setSelectedPR} selectedPR={selectedPR} />

      {selectedPR && (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PRTimeline pr={selectedPR} />
        </div>
      )}
    </div>
  );
}
