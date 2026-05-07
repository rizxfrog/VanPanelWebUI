import { requestClient } from '#/api/request';

export interface FileShare {
  id: number;
  share_code: string;
  access_code: string;
  creator_id: number;
  access_level: 'public' | 'login_required';
  max_downloads: number;
  download_count: number;
  expire_at: string | null;
  status: 'active' | 'cancelled' | 'expired' | 'merged';
  created_at: string;
  updated_at: string;
}

export interface FileShareItem {
  id: number;
  share_id: number;
  file_path: string;
  file_type: 'file' | 'directory';
  file_name: string;
}

export interface ShareItemReq {
  file_path: string;
  file_type: 'file' | 'directory';
  file_name: string;
}

export interface CreateShareRequest {
  access_level: 'public' | 'login_required';
  max_downloads?: number;
  expire_at?: string | null;
  items: ShareItemReq[];
}

export interface CreateShareResponse {
  share_id: number;
  share_code: string;
  access_code: string;
}

export interface UpdateShareRequest {
  access_level?: 'public' | 'login_required';
  max_downloads?: number;
  expire_at?: string | null;
  status?: 'active' | 'cancelled';
}

export interface MergeSharesRequest {
  share_ids: number[];
}

export interface VerifyAccessRequest {
  access_code: string;
}

export interface VerifyAccessResponse {
  valid: boolean;
  share_id?: number;
  share_code?: string;
  access_level?: string;
  error_msg?: string;
}

export interface ShareListRequest {
  page?: number;
  size?: number;
  search?: string;
  status?: string;
  creator_id?: number;
  access_level?: string;
}

export interface ShareListResponse {
  items: FileShare[];
  total: number;
}

export interface ShareInfoResponse {
  share_code: string;
  access_level: string;
  creator_id: number;
  file_count: number;
  download_count: number;
  max_downloads: number;
  expire_at: string | null;
  status: string;
  created_at: string;
}

export interface ShareDetailResponse extends ShareInfoResponse {
  items: FileShareItem[];
}

// 管理接口 (需要登录)
export function createShareApi(data: CreateShareRequest) {
  return requestClient.post<CreateShareResponse>('/files/share', data);
}

export function listSharesApi(data: ShareListRequest) {
  return requestClient.get<ShareListResponse>('/files/shares', { params: data });
}

export function getShareApi(id: number) {
  return requestClient.get<ShareDetailResponse>(`/files/share/${id}`);
}

export function updateShareApi(id: number, data: UpdateShareRequest) {
  return requestClient.put(`/files/share/${id}`, data);
}

export function deleteShareApi(id: number) {
  return requestClient.delete(`/files/share/${id}`);
}

export function mergeSharesApi(data: MergeSharesRequest) {
  return requestClient.post<CreateShareResponse>('/files/share/merge', data);
}

// 访问接口 (公开)
export function getShareInfoApi(code: string) {
  return requestClient.get<ShareInfoResponse>(`/share/${code}`);
}

export function verifyShareAccessApi(code: string, data: VerifyAccessRequest) {
  return requestClient.post<VerifyAccessResponse>(`/share/${code}/verify`, data);
}

export function getShareFilesApi(code: string) {
  return requestClient.get<FileShareItem[]>(`/share/${code}/files`);
}

export function downloadShareFileUrl(code: string, accessCode: string, filePath: string) {
  return `/api/share/${code}/download?access_code=${encodeURIComponent(accessCode)}&file_path=${encodeURIComponent(filePath)}`;
}
