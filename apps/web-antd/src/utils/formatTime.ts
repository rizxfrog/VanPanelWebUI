/**
 * Format a timestamp to date-only string (e.g., "2024/1/15")
 * Handles Unix timestamps (seconds) and ISO strings.
 */
export function formatDate(timestamp: any): string {
  if (!timestamp) return '-';
  const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
  return date.toLocaleDateString('zh-CN');
}
