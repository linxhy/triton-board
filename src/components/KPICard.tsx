import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: ReactNode;
  accentColor: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export default function KPICard({
  title,
  value,
  subtitle,
  icon,
  accentColor,
  trend,
  trendValue,
}: KPICardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.05]",
        "group"
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
        style={{
          background: `radial-gradient(ellipse at 30% 20%, ${accentColor}, transparent 70%)`,
        }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 tracking-wide uppercase">
            {title}
          </span>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
          >
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white font-mono tracking-tight">
            {value}
          </span>
          {trend && trendValue && (
            <span
              className={cn(
                "text-xs font-medium",
                trend === "down" && "text-emerald-400",
                trend === "up" && "text-rose-400",
                trend === "neutral" && "text-slate-400"
              )}
            >
              {trend === "down" ? "↓" : trend === "up" ? "↑" : "→"} {trendValue}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)`,
        }}
      />
    </div>
  );
}
