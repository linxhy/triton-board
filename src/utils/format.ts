export function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return "<1秒";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}天${remainHours}小时` : `${days}天`;
  }
  if (hours > 0) {
    const remainMinutes = minutes % 60;
    return remainMinutes > 0 ? `${hours}小时${remainMinutes}分钟` : `${hours}小时`;
  }
  if (minutes > 0) {
    return `${minutes}分钟`;
  }
  const seconds = Math.floor(ms / 1000);
  return `${seconds}秒`;
}

export function formatDurationShort(ms: number | null): string {
  if (ms === null) return "—";
  const minutes = ms / 60000;
  const hours = minutes / 60;
  const days = hours / 24;

  if (days >= 1) return `${days.toFixed(1)}d`;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  if (minutes >= 1) return `${minutes.toFixed(0)}m`;
  const seconds = Math.floor(ms / 1000);
  return `${seconds}s`;
}

export function formatDurationHours(ms: number | null): number {
  if (ms === null) return 0;
  return ms / 3600000;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function truncateTitle(title: string, maxLength: number = 50): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength) + "...";
}

export function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

export function formatChangePercent(current: number, previous: number): { trend: "up" | "down" | "neutral"; value: string } {
  if (previous === 0) return { trend: "neutral", value: "—" };
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) return { trend: "neutral", value: "持平" };
  return {
    trend: change > 0 ? "up" : "down",
    value: `${Math.abs(change).toFixed(0)}% vs 上周`,
  };
}
