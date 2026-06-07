import type { ApiEnvelope } from './types';

/**
 * Unwrap a Go-backend ApiEnvelope response or pass through raw data.
 * Throws on non-zero code with the backend's error message.
 */
export function normalizeResponse<T>(
  payload: ApiEnvelope<T> | T,
  errorContext?: string,
): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'code' in payload &&
    'data' in payload
  ) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.code === 0) {
      return envelope.data;
    }
    throw new Error(envelope.message || `${errorContext || 'API'} request failed`);
  }
  return payload as T;
}
