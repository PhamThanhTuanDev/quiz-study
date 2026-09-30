import type { HealthResponse } from '../types/health'
import { apiGet } from './apiClient'

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiGet<HealthResponse>('/health', signal)
}
