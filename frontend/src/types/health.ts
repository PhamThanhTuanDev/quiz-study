/** Trạng thái một thành phần của hệ thống. */
export type HealthStatus = 'UP' | 'DOWN'

/** Kết quả của GET /api/v1/health (khớp HealthResponse ở backend). */
export interface HealthResponse {
  status: HealthStatus
  database: HealthStatus
}
