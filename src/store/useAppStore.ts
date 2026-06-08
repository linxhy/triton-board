import { create } from "zustand";
import type { PRMetrics } from "@/types";
import { fetchAllPRMetrics } from "@/utils/github-api";

export type TimeRange = "today" | "week" | "month" | "3months";

export const TIME_RANGE_CONFIG: Record<TimeRange, { label: string; days: number }> = {
  today: { label: "当天", days: 1 },
  week: { label: "近一周", days: 7 },
  month: { label: "近一个月", days: 30 },
  "3months": { label: "近三个月", days: 90 },
};

function getTimeRangeStart(range: TimeRange): Date {
  const now = new Date();
  const days = TIME_RANGE_CONFIG[range].days;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

interface AppStore {
  token: string;
  setToken: (token: string) => void;
  allPRs: PRMetrics[];
  prs: PRMetrics[];
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fetchPRData: () => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  token: sessionStorage.getItem("github_token") || "",
  setToken: (token: string) => {
    sessionStorage.setItem("github_token", token);
    set({ token });
  },
  allPRs: [],
  prs: [],
  timeRange: (sessionStorage.getItem("time_range") as TimeRange) || "month",
  setTimeRange: (range: TimeRange) => {
    sessionStorage.setItem("time_range", range);
    const { allPRs } = get();
    const start = getTimeRangeStart(range);
    const filtered = allPRs.filter((pr) => pr.createdAt >= start);
    set({ timeRange: range, prs: filtered });
  },
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  error: null,
  setError: (error: string | null) => set({ error }),
  fetchPRData: async () => {
    const { token, timeRange } = get();
    set({ loading: true, error: null });
    try {
      const allPRs = await fetchAllPRMetrics(token || undefined, 100);
      const start = getTimeRangeStart(timeRange);
      const prs = allPRs.filter((pr) => pr.createdAt >= start);
      set({ allPRs, prs, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取数据失败";
      set({ error: message, loading: false });
    }
  },
}));
