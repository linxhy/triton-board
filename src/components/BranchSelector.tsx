import { useAppStore } from "@/store/useAppStore";
import { GitBranch } from "lucide-react";

export default function BranchSelector() {
  const { branches, branch, setBranch } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <GitBranch className="w-3.5 h-3.5 text-slate-500" />
      <select
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        className="h-7 rounded-md border border-white/[0.08] bg-white/[0.04] px-2 text-xs text-slate-300 outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all cursor-pointer appearance-none pr-6"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 6px center",
        }}
      >
        <option value="all" className="bg-[#1e293b] text-slate-200">
          所有分支
        </option>
        {branches.map((b) => (
          <option key={b} value={b} className="bg-[#1e293b] text-slate-200">
            {b}
          </option>
        ))}
      </select>
    </div>
  );
}
