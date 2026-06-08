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

function applyFilters(allPRs: PRMetrics[], timeRange: TimeRange, branch: string): PRMetrics[] {
  const start = getTimeRangeStart(timeRange);
  return allPRs.filter((pr) => {
    if (pr.createdAt < start) return false;
    if (branch !== "all" && pr.branch !== branch) return false;
    return true;
  });
}

function extractBranches(prs: PRMetrics[]): string[] {
  const branchSet = new Set<string>();
  prs.forEach((pr) => branchSet.add(pr.branch));
  return Array.from(branchSet).sort();
}

interface AppStore {
  token: string;
  setToken: (token: string) => void;
  allPRs: PRMetrics[];
  prs: PRMetrics[];
  prevPRs: PRMetrics[];
  branches: string[];
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  branch: string;
  setBranch: (branch: string) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  lastUpdated: Date | null;
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
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
  prevPRs: [],
  branches: [],
  timeRange: (sessionStorage.getItem("time_range") as TimeRange) || "month",
  setTimeRange: (range: TimeRange) => {
    sessionStorage.setItem("time_range", range);
    const { allPRs, branch, prs } = get();
    const filtered = applyFilters(allPRs, range, branch);
    set({ timeRange: range, prevPRs: prs, prs: filtered });
  },
  branch: sessionStorage.getItem("branch") || "all",
  setBranch: (branch: string) => {
    sessionStorage.setItem("branch", branch);
    const { allPRs, timeRange, prs } = get();
    const filtered = applyFilters(allPRs, timeRange, branch);
    set({ branch, prevPRs: prs, prs: filtered });
  },
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  error: null,
  setError: (error: string | null) => set({ error }),
  lastUpdated: null,
  autoRefresh: true,
  setAutoRefresh: (v: boolean) => set({ autoRefresh: v }),
  fetchPRData: async () => {
    const { token, timeRange, branch, prs } = get();
    set({ loading: true, error: null });
    try {
      const allPRs = await fetchAllPRMetrics(token || undefined, 100);
      const branches = extractBranches(allPRs);
      const filtered = applyFilters(allPRs, timeRange, branch);
      set({ allPRs, prs: filtered, prevPRs: prs, branches, loading: false, lastUpdated: new Date() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取数据失败";
      set({ error: message, loading: false });
    }
  },
}));
