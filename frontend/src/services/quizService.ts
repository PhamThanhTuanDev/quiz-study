import type { Attempt, QuizSummary, SaveAnswerResult } from '../types/quiz'
import { apiGet, apiPost, apiPut } from './apiClient'

export function getQuizzes(subjectSlug: string, signal?: AbortSignal): Promise<QuizSummary[]> {
  return apiGet<QuizSummary[]>(`/subjects/${encodeURIComponent(subjectSlug)}/quizzes`, signal)
}

/** Bắt đầu một lượt làm mới: server rút câu và trả về câu hỏi (không kèm đáp án đúng). */
export function startAttempt(quizId: number): Promise<Attempt> {
  return apiPost<Attempt>(`/quizzes/${quizId}/attempts`)
}

export function getAttempt(attemptId: string, signal?: AbortSignal): Promise<Attempt> {
  // attemptId lấy từ URL người dùng gõ: mã hoá để ký tự lạ không làm sai đường dẫn API.
  return apiGet<Attempt>(`/attempts/${encodeURIComponent(attemptId)}`, signal)
}

export function saveAnswer(attemptId: string, questionId: number, answerId: number): Promise<SaveAnswerResult> {
  return apiPut<SaveAnswerResult>(`/attempts/${encodeURIComponent(attemptId)}/answers/${questionId}`, { answerId })
}

/** Nộp bài thi thử; trả về lượt làm đã chấm. */
export function submitAttempt(attemptId: string): Promise<Attempt> {
  return apiPost<Attempt>(`/attempts/${encodeURIComponent(attemptId)}/submit`)
}
