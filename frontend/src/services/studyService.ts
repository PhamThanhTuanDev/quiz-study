import type { StudyChapter } from '../types/study'
import { apiGet } from './apiClient'

/** Câu hỏi của một bài kèm đáp án đúng, để học (D-044). Không phải bài làm: không chấm, không lưu. */
export function getStudyChapter(subjectSlug: string, chapterId: string, signal?: AbortSignal): Promise<StudyChapter> {
  // Cả hai lấy từ URL người dùng gõ: mã hoá để ký tự lạ không làm sai đường dẫn API.
  return apiGet<StudyChapter>(
    `/subjects/${encodeURIComponent(subjectSlug)}/chapters/${encodeURIComponent(chapterId)}/study`,
    signal,
  )
}
