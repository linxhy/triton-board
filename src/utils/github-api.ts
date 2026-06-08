import type { GitHubPR, GitHubCheckRun, GitHubWorkflowRun, GitHubWorkflowJob, PRMetrics, CheckMetrics, WorkflowMetrics } from "@/types";

const REPO_OWNER = "triton-lang";
const REPO_NAME = "triton-ascend";
const BASE_URL = "https://api.github.com";

const MAX_QUEUE_TIME_MS = 30 * 60 * 1000;

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
  const allRuns: GitHubCheckRun[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const url = `${BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/commits/${sha}/check-runs?per_page=100&page=${page}`;
    const data = await fetchJSON<{ check_runs: GitHubCheckRun[] }>(url, token);
    allRuns.push(...data.check_runs);
    hasMore = data.check_runs.length === 100;
    page++;
  }
  return allRuns;
}

export async function fetchWorkflowRuns(
  sha: string,
  token?: string
): Promise<GitHubWorkflowRun[]> {
  const allRuns: GitHubWorkflowRun[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const url = `${BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs?head_sha=${sha}&per_page=100&page=${page}`;
    const data = await fetchJSON<{ workflow_runs: GitHubWorkflowRun[] }>(url, token);
    allRuns.push(...data.workflow_runs);
    hasMore = data.workflow_runs.length === 100;
    page++;
  }
  return allRuns.filter((wr) => wr.run_attempt === 1);
}

export async function fetchWorkflowJobs(
  runId: number,
  token?: string
): Promise<GitHubWorkflowJob[]> {
  const allJobs: GitHubWorkflowJob[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const url = `${BASE_URL}/repos/${REPO_OWNER}/${REPO_NAME}/actions/runs/${runId}/jobs?per_page=100&page=${page}`;
    const data = await fetchJSON<{ jobs: GitHubWorkflowJob[] }>(url, token);
    allJobs.push(...data.jobs);
    hasMore = data.jobs.length === 100;
    page++;
  }
  return allJobs;
}

function parseDuration(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const duration = new Date(end).getTime() - new Date(start).getTime();
  return duration > 0 ? duration : null;
}

function computeQueueTime(startedAt: string | null, createdAt: string | null): number | null {
  if (!startedAt || !createdAt) return null;
  const qt = new Date(startedAt).getTime() - new Date(createdAt).getTime();
  if (qt <= 0) return null;
  if (qt > MAX_QUEUE_TIME_MS) return null;
  return qt;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computePRMetrics(
  pr: GitHubPR,
  checkRuns: GitHubCheckRun[],
  workflowRuns: GitHubWorkflowRun[],
  workflowJobsMap: Map<number, GitHubWorkflowJob[]> = new Map()
): PRMetrics {
  const createdAt = new Date(pr.created_at);
  const mergedAt = pr.merged_at ? new Date(pr.merged_at) : null;
  const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;

  const e2eDuration = mergedAt
    ? mergedAt.getTime() - createdAt.getTime()
    : closedAt
    ? closedAt.getTime() - createdAt.getTime()
    : null;

  const completedWorkflows = workflowRuns.filter(
    (wr) => wr.status === "completed" && wr.run_started_at
  );

  const workflowQueueTimes: number[] = [];
  completedWorkflows.forEach((wr) => {
    const qt = computeQueueTime(wr.run_started_at, wr.created_at);
    if (qt !== null) {
      workflowQueueTimes.push(qt);
    }
  });

  const prQueueDuration = workflowQueueTimes.length > 0
    ? median(workflowQueueTimes)
    : null;

  const checks: CheckMetrics[] = checkRuns.map((cr) => {
    let checkQueueDuration: number | null = null;
    const matchingWr = workflowRuns.find((wr) => wr.name === cr.name);
    if (matchingWr) {
      checkQueueDuration = computeQueueTime(matchingWr.run_started_at, matchingWr.created_at);
    }
    if (checkQueueDuration === null && cr.started_at) {
      const matchingWrForJob = workflowRuns.find(
        (wr) => wr.name === cr.name || wr.id === cr.id
      );
      if (matchingWrForJob) {
        const jobs = workflowJobsMap.get(matchingWrForJob.id);
        if (jobs) {
          const matchingJob = jobs.find((j) => j.name === cr.name);
          if (matchingJob?.started_at) {
            checkQueueDuration = computeQueueTime(matchingJob.started_at, matchingWrForJob.created_at);
          }
        }
      }
    }
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

  const workflows: WorkflowMetrics[] = completedWorkflows.map((wr) => {
    const wfDuration = wr.run_started_at && wr.updated_at
      ? new Date(wr.updated_at).getTime() - new Date(wr.run_started_at).getTime()
      : null;
    const wfQueueDuration = computeQueueTime(wr.run_started_at, wr.created_at);

    const jobs = workflowJobsMap.get(wr.id);
    const jobQueueTimes: number[] = [];
    if (jobs) {
      jobs.forEach((job) => {
        if (job.started_at) {
          const jt = computeQueueTime(job.started_at, wr.created_at);
          if (jt !== null) jobQueueTimes.push(jt);
        }
      });
    }

    return {
      name: wr.name,
      status: wr.status,
      conclusion: wr.conclusion,
      duration: wfDuration && wfDuration > 0 ? wfDuration : null,
      queueDuration: wfQueueDuration,
      jobQueueDuration: jobQueueTimes.length > 0 ? median(jobQueueTimes) : wfQueueDuration,
      startedAt: wr.run_started_at ? new Date(wr.run_started_at) : null,
      completedAt: wr.updated_at ? new Date(wr.updated_at) : null,
    };
  });

  const queueDuration = prQueueDuration;

  const totalChecks = checkRuns.length;
  const successChecks = checkRuns.filter(
    (cr) => cr.conclusion === "success"
  ).length;
  const checksPassRate = totalChecks > 0 ? successChecks / totalChecks : 0;

  const totalWorkflows = workflows.length;
  const successWorkflows = workflows.filter(
    (wf) => wf.conclusion === "success"
  ).length;
  const workflowPassRate = totalWorkflows > 0 ? successWorkflows / totalWorkflows : 0;

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
    workflows,
    checksPassRate,
    workflowPassRate,
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

      const workflowJobsMap = new Map<number, GitHubWorkflowJob[]>();
      const jobPromises = workflowRuns
        .filter((wr) => wr.status === "completed")
        .map(async (wr) => {
          try {
            const jobs = await fetchWorkflowJobs(wr.id, token);
            workflowJobsMap.set(wr.id, jobs);
          } catch { /* skip failed job fetches */ }
        });

      await Promise.all(jobPromises);

      const prMetrics = computePRMetrics(pr, checkRuns, workflowRuns, workflowJobsMap);
      metrics.push(prMetrics);
    } catch {
      const prMetrics = computePRMetrics(pr, [], []);
      metrics.push(prMetrics);
    }
  }

  return metrics;
}
