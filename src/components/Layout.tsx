import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, List, RefreshCw, Github } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import TimeRangeSelector from "@/components/TimeRangeSelector";
import BranchSelector from "@/components/BranchSelector";
import { cn } from "@/lib/utils";

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { loading, fetchPRData } = useAppStore();

  const navItems = [
    { path: "/", label: "概览看板", icon: LayoutDashboard },
    { path: "/prs", label: "PR 列表", icon: List },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-200">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.06),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_80%_80%,rgba(139,92,246,0.04),transparent_50%)] pointer-events-none" />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-purple-500 flex items-center justify-center">
                <Github className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white tracking-tight">
                triton-ascend
              </span>
              <span className="text-xs text-slate-500 font-mono">PR 看板</span>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      active
                        ? "bg-white/[0.08] text-white"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <BranchSelector />
            <TimeRangeSelector />
            <button
              onClick={() => fetchPRData()}
              disabled={loading}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                loading
                  ? "bg-white/[0.02] text-slate-600 border-white/[0.04] cursor-not-allowed"
                  : "bg-sky-500/10 text-sky-300 border-sky-500/20 hover:bg-sky-500/20"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              {loading ? "加载中..." : "刷新数据"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}
