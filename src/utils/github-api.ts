import type { GitHubPR, GitHubCheckRun, GitHubWorkflowRun, PRMetrics, CheckMetrics } from "@/types";

const REPO_OWNER = "triton-lang";
const REPO_NAME = "triton-ascend";
const BASE_URL = "https://api.github.com";

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchJSON<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, { headers: getHeaders(token) });
  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("API 请求频率已达上限，请配置 GitHub Token 以提升配额");
    }
    throw new Error(`GitHub API 请求失败: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function fetchPRs(
  token?: string,
  perPage: number = 30,
  page: number = 1
): Promise<GitHubPR[]> {
  const url = `${BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/pulls?state=closed&sort=updated&direction=desc&per_page=${perPage}&page=${page}`;
  const prs = await fetchJSON<GitHubPR[]>(url, token);
  return prs.filter((pr) => pr.merged_at !== null);
}

export async function fetchCheckRuns(
  sha: string,
  token?: string
): Promise<GitHubCheckRun[]> {
  const url = `${BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/commits/${sha}/check-runs?per_page=100`;
  const data = await fetchJSON<{ check_runs: GitHubCheckRun[] }>(url, token);
  return data.check_runs;
}

export async function fetchWorkflowRuns(
  sha: string,
  token?: string
): Promise<GitHubWorkflowRun[]> {
  const url = `${BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?head_sha=${sha}&per_page=100`;
  const data = await fetchJSON<{ workflow_runs: GitHubWorkflowRun[] }>(url, token);
  return data.workflow_runs;
}

function parseDuration(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const duration = new Date(end).getTime() - new Date(start).getTime();
  return duration > 0 ? duration : null;
}

export function computePRMetrics(
  pr: GitHubPR,
  checkRuns: GitHubCheckRun[],
  workflowRuns: GitHubWorkflowRun[]
): PRMetrics {
  const createdAt = new Date(pr.created_at);
  const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
  const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;

  const e2eDuration = mergedAt
    ? mergedAt.getTime() - createdAt.getTime()
    : closedAt
    ? closedAt.getTime() - createdAt.getTime()
    : null;

  const workflowQueueMap = new Map<string, number>();
  workflowRuns.forEach((wr) => {
    if (wr.run_started_at && wr.created_at) {
      const queueTime = new Date(wr.run_started_at).getTime() - new Date(wr.created_at).getTime();
      if (queueTime > 0) {
        workflowQueueMap.set(wr.name, queueTime);
      }
    }
  });

  const checks: CheckMetrics[] = checkRuns.map((cr) => {
    const checkQueueDuration = workflowQueueMap.get(cr.name) || null;
    return {
      name: cr.name,
      status: cr.status,
      conclusion: cr.conclusion,
      duration: parseDuration(cr.started_at, cr.completed_at),
      queueDuration: checkQueueDuration,
      startedAt: cr.started_at ? new Date(cr.started_at) : null,
      completedAt: cr.completed_at ? new Date(cr.completed_at) : null,
    };
  });

  const checksWithQueue = checks.filter((c) => c.queueDuration !== null);
  const queueDuration = checksWithQueue.length > 0
    ? checksWithQueue.reduce((sum, c) => sum + (c.queueDuration || 0), 0) / checksWithQueue.length
    : null;

  const totalChecks = checkRuns.length;
  const successChecks = checkRuns.filter(
    (cr) => cr.conclusion === "success"
  ).length;
  const checksPassRate = totalChecks > 0 ? successChecks / totalChecks : 0;

  return {
    prNumber: pr.number,
    title: pr.title,
    author: pr.user.login,
    avatarUrl: pr.user.avatar_url,
    state: pr.merged_at ? "merged" : pr.state === "closed" ? "closed" : "open",
    createdAt,
    mergedAt,
    closedAt,
    headSha: pr.head.sha,
    branch: pr.head.ref,
    e2eDuration,
    queueDuration,
    checks,
    checksPassRate,
  };
}

export async function fetchAllPRMetrics(
  token?: string,
  perPage: number = 30
): Promise<PRMetrics[]> {
  const prs = await fetchPRs(token, perPage);
  const metrics: PRMetrics[] = [];

  for (const pr of prs) {
    try {
      const [checkRuns, workflowRuns] = await Promise.all([
        fetchCheckRuns(pr.head.sha, token),
        fetchWorkflowRuns(pr.head.sha, token),
      ]);
      const prMetrics = computePRMetrics(pr, checkRuns, workflowRuns);
      metrics.push(prMetrics);
    } catch {
      const prMetrics = computePRMetrics(pr, [], []);
      metrics.push(prMetrics);
    }
  }

  return metrics;
}
