/** Generic API response envelope from the Go backend */
export interface ApiEnvelope<T> {
  code: number;
  data: T;
  message?: string;
}
