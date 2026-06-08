import { create } from "zustand";
import type { PRMetrics } from "@/types";
import { fetchAllPRMetrics } from "@/utils/github-api";

interface AppStore {
  token: string;
  setToken: (token: string) => void;
  prs: PRMetrics[];
  setPRs: (prs: PRMetrics[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  fetchPRData: (perPage?: number) => Promise<void>;
}

export const useAppStore = create<AppStore>((set, get) => ({
  token: sessionStorage.getItem("github_token") || "",
  setToken: (token: string) => {
    sessionStorage.setItem("github_token", token);
    set({ token });
  },
  prs: [],
  setPRs: (prs: PRMetrics[]) => set({ prs }),
  loading: false,
  setLoading: (loading: boolean) => set({ loading }),
  error: null,
  setError: (error: string | null) => set({ error }),
  fetchPRData: async (perPage: number = 30) => {
    const { token } = get();
    set({ loading: true, error: null });
    try {
      const prs = await fetchAllPRMetrics(token || undefined, perPage);
      set({ prs, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : "获取数据失败";
      set({ error: message, loading: false });
    }
  },
}));
