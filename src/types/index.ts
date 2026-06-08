export interface GitHubPR {
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  merge_commit_sha: string;
  head: { sha: string; ref: string };
  user: { login: string; avatar_url: string };
}

export interface GitHubCheckRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: "success" | "failure" | "cancelled" | "timed_out" | null;
  started_at: string | null;
  completed_at: string | null;
  head_sha: string;
}

export interface PRMetrics {
  prNumber: number;
  title: string;
  author: string;
  avatarUrl: string;
  state: "open" | "merged" | "closed";
  createdAt: Date;
  mergedAt: Date | null;
  closedAt: Date | null;
  headSha: string;
  branch: string;
  e2eDuration: number | null;
  queueDuration: number | null;
  checks: CheckMetrics[];
  checksPassRate: number;
}

export interface CheckMetrics {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: string | null;
  duration: number | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface DashboardKPIs {
  avgE2EDuration: number;
  avgQueueDuration: number;
  totalPRs: number;
  checksPassRate: number;
}
