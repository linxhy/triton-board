import { useState } from "react";
import type { PRMetrics } from "@/types";
import { formatDuration, formatPercent, formatDate, truncateTitle } from "@/utils/format";
import { ChevronRight, GitMerge, GitPullRequest, XCircle, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

interface PRTableProps {
  prs: PRMetrics[];
  onSelectPR: (pr: PRMetrics) => void;
  selectedPR: PRMetrics | null;
}

export default function PRTable({ prs, onSelectPR, selectedPR }: PRTableProps) {
  const [sortField, setSortField] = useState<"prNumber" | "e2eDuration" | "queueDuration" | "checksPassRate">("prNumber");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...prs].sort((a, b) => {
    const aVal = a[sortField] ?? 0;
    const bVal = b[sortField] ?? 0;
    return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIndicator = ({ field }: { field: typeof sortField }) => (
    <span className={cn("ml-1 text-[10px]", sortField === field ? "text-sky-400" : "text-slate-600")}>
      {sortField === field ? (sortDir === "desc" ? "▼" : "▲") : "▼"}
    </span>
  );

  const stateIcon = (state: PRMetrics["state"]) => {
    switch (state) {
      case "merged":
        return <GitMerge className="w-4 h-4 text-purple-400" />;
      case "closed":
        return <XCircle className="w-4 h-4 text-rose-400" />;
      default:
        return <GitPullRequest className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                状态
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                PR
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => toggleSort("e2eDuration")}
              >
                E2E时长 <SortIndicator field="e2eDuration" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => toggleSort("queueDuration")}
              >
                排队时长 <SortIndicator field="queueDuration" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-200 transition-colors"
                onClick={() => toggleSort("checksPassRate")}
              >
                Checks通过率 <SortIndicator field="checksPassRate" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                创建时间
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                作者
              </th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((pr) => (
              <tr
                key={pr.prNumber}
                className={cn(
                  "border-b border-white/[0.04] cursor-pointer transition-colors",
                  selectedPR?.prNumber === pr.prNumber
                    ? "bg-sky-500/10"
                    : "hover:bg-white/[0.03]"
                )}
                onClick={() => onSelectPR(pr)}
              >
                <td className="px-4 py-3">{stateIcon(pr.state)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-sky-400 font-mono text-xs">#{pr.prNumber}</span>
                    <span className="text-slate-300 text-xs mt-0.5">{truncateTitle(pr.title, 40)}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-200">
                  {formatDuration(pr.e2eDuration)}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-200">
                  {formatDuration(pr.queueDuration)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-mono",
                      pr.checksPassRate >= 0.9
                        ? "bg-emerald-500/15 text-emerald-400"
                        : pr.checksPassRate >= 0.5
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-rose-500/15 text-rose-400"
                    )}
                  >
                    {formatPercent(pr.checksPassRate)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <GitBranch className="w-3 h-3" />
                    <span className="font-mono truncate max-w-[120px]" title={pr.branch}>
                      {pr.branch.length > 20 ? pr.branch.slice(0, 20) + "..." : pr.branch}
                    </span>
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {formatDate(pr.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={pr.avatarUrl}
                      alt={pr.author}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-xs text-slate-300">{pr.author}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
