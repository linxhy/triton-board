import { useAppStore, TIME_RANGE_CONFIG, type TimeRange } from "@/store/useAppStore";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

const RANGES: TimeRange[] = ["today", "week", "month", "3months"];

export default function TimeRangeSelector() {
  const { timeRange, setTimeRange } = useAppStore();

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-3.5 h-3.5 text-slate-500" />
      <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-0.5">
        {RANGES.map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
              timeRange === range
                ? "bg-sky-500/15 text-sky-300 shadow-sm"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]"
            )}
          >
            {TIME_RANGE_CONFIG[range].label}
          </button>
        ))}
      </div>
    </div>
  );
}
