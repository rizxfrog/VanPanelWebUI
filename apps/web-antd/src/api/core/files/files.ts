import { requestClient } from '#/api/request';

export interface FileRoot {
  name: string;
  path: string;
}

export interface FileRootsResponse {
  enabled: boolean;
  allow_full_disk: boolean;
  os: string;
  path_separator: string;
  roots: FileRoot[];
}

export interface FileTargetRequest {
  target_type?: 'local';
  node_id?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  is_dir: boolean;
  is_symlink: boolean;
  is_hidden: boolean;
  mode: string;
  user: string;
  group: string;
  mod_time: string;
  mime_type: string;
  editable: boolean;
  previewable: boolean;
  content?: string;
}

export interface FileListRequest extends FileTargetRequest {
  path: string;
  page: number;
  size: number;
  search?: string;
  show_hidden?: boolean;
  sort_by?: string;
  sort_order?: string;
}

export interface FileListResponse {
  path: string;
  items: FileInfo[];
  total: number;
}

export interface FileContentRequest extends FileTargetRequest {
  path: string;
}

export interface FileSaveRequest extends FileTargetRequest {
  path: string;
  content: string;
}

export function getFileRootsApi() {
  return requestClient.get<FileRootsResponse>('/files/roots');
}

export function listFilesApi(data: FileListRequest) {
  return requestClient.post<FileListResponse>('/files/list', data);
}

export function getFileContentApi(data: FileContentRequest) {
  return requestClient.post<FileInfo>('/files/content', data);
}

export function saveFileContentApi(data: FileSaveRequest) {
  return requestClient.post('/files/save', data);
}

export function createFileApi(
  data: FileTargetRequest & { is_dir: boolean; path: string },
) {
  return requestClient.post('/files/create', data);
}

export function renameFileApi(
  data: FileTargetRequest & { new_name: string; path: string },
) {
  return requestClient.post('/files/rename', data);
}

export function deleteFileApi(data: FileTargetRequest & { path: string }) {
  return requestClient.post('/files/delete', data);
}

export function moveFileApi(
  data: FileTargetRequest & {
    operation: 'copy' | 'move';
    overwrite: boolean;
    paths: string[];
    target_path: string;
  },
) {
  return requestClient.post('/files/move', data);
}

export function downloadFileUrl(path: string) {
  return `/api/files/download?path=${encodeURIComponent(path)}`;
}
