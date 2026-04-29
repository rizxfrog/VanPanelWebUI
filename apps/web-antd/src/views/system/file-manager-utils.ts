import type { FileInfo } from '#/api/core/files/files';

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function canEditFile(file: FileInfo | null): boolean {
  return Boolean(file && !file.is_dir && file.editable && file.previewable);
}

export function joinPath(base: string, name: string, separator = '/'): string {
  const trimmed = base.endsWith(separator) ? base.slice(0, -1) : base;
  return `${trimmed}${separator}${name}`;
}
