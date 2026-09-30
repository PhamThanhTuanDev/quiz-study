import type { SubjectDetail, SubjectSummary } from '../types/subject'
import { apiGet } from './apiClient'

export function getSubjects(signal?: AbortSignal): Promise<SubjectSummary[]> {
  return apiGet<SubjectSummary[]>('/subjects', signal)
}

export function getSubject(slug: string, signal?: AbortSignal): Promise<SubjectDetail> {
  // slug lấy từ URL người dùng gõ: mã hoá để ký tự lạ không làm sai đường dẫn API.
  return apiGet<SubjectDetail>(`/subjects/${encodeURIComponent(slug)}`, signal)
}
