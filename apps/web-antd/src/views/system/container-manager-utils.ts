export function formatBytes(value?: number) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let current = bytes / 1024;
  let unit = 0;
  while (current >= 1024 && unit < units.length - 1) {
    current /= 1024;
    unit += 1;
  }
  return `${current.toFixed(1)} ${units[unit]}`;
}

export function formatPercent(value?: number) {
  return `${Number(value || 0).toFixed(2)}%`;
}

export function stateTone(state: string) {
  if (state === 'running') return 'success';
  if (state === 'exited' || state === 'created') return 'default';
  if (state === 'paused') return 'warning';
  return 'error';
}
