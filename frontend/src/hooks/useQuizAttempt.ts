import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../services/apiClient'
import { getAttempt, saveAnswer, submitAttempt } from '../services/quizService'
import { rememberAttempt } from '../services/recentAttempts'
import type { Attempt, AttemptQuestion } from '../types/quiz'
import { toUserMessage } from './useAsync'

export interface QuizAttemptControls {
  attempt: Attempt
  /** Vị trí câu đang xem (0 = câu đầu). */
  currentIndex: number
  goTo: (index: number) => void
  /**
   * Chọn phương án. Thi thử: lưu ngay, đổi được tới khi nộp.
   * Luyện tập: kiểm tra câu và nhận đúng/sai ngay; câu đã kiểm tra thì khoá (D-037).
   */
  choose: (questionId: number, answerId: number) => Promise<void>
  /** Các câu luyện tập đang chờ server kiểm tra (có thể nhiều câu nếu người dùng chuyển câu khi đang chờ). */
  checkingQuestionIds: ReadonlySet<number>
  /** Nộp bài thi thử (cũng được gọi khi hết giờ). Gọi khi đang nộp thì bỏ qua. */
  submit: () => Promise<void>
  submitting: boolean
  /** Thông điệp lỗi tiếng Việt của thao tác gần nhất; null nếu không có lỗi. */
  error: string | null
}

/** Trạng thái một lượt làm bài trên trang làm bài. Server là nơi chấm điểm; hook chỉ gửi lựa chọn và hiển thị. */
export function useQuizAttempt(initial: Attempt): QuizAttemptControls {
  const [attempt, setAttempt] = useState(initial)
  const [currentIndex, setCurrentIndex] = useState(() => firstUnansweredIndex(initial))
  const [checkingQuestionIds, setCheckingQuestionIds] = useState<ReadonlySet<number>>(() => new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Các lần lưu được gửi lần lượt: lựa chọn sau luôn tới server sau lựa chọn trước, nên server giữ đúng
  // lựa chọn cuối cùng. Nộp bài và đọc lại từ server cũng chờ các lần lưu đang chạy xong.
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve())
  // Chặn nộp hai lần (ví dụ đồng hồ về 0 đúng lúc người dùng bấm "Nộp bài"). Dùng ref vì hai lần gọi có thể
  // xảy ra trước khi React kịp render lại với `submitting = true`.
  const submittingRef = useRef(false)
  // Bản mới nhất của lượt làm, để đọc lựa chọn cũ khi cần trả lại (lưu thất bại) mà không phải đưa
  // `attempt` vào danh sách phụ thuộc của các hàm bên dưới.
  const latest = useRef(attempt)
  useEffect(() => {
    latest.current = attempt
    // Ghi vào "Lượt làm gần đây" (trình duyệt này) mỗi khi mở / trả lời / nộp, để danh sách luôn đúng trạng thái.
    rememberAttempt(attempt)
  }, [attempt])

  const { id: attemptId, mode } = attempt

  const updateQuestion = useCallback((questionId: number, change: Partial<AttemptQuestion>) => {
    setAttempt((current) => ({
      ...current,
      questions: current.questions.map((question) =>
        question.questionId === questionId ? { ...question, ...change } : question,
      ),
    }))
  }, [])

  /** Báo lỗi, rồi đọc lại lượt làm từ server để màn hình khớp với dữ liệu thật (ví dụ bài vừa hết giờ). */
  const failAndResync = useCallback(
    async (failure: unknown) => {
      setError(toUserMessage(failure))
      if (failure instanceof ApiError && failure.status === 0) return // mất mạng: đọc lại cũng sẽ lỗi
      try {
        // Chờ các lựa chọn đang xếp hàng lưu xong, để dữ liệu đọc về không thiếu lựa chọn mới hơn.
        await saveQueue.current
        setAttempt(await getAttempt(attemptId))
      } catch (resyncError) {
        setError(toUserMessage(resyncError))
      }
    },
    [attemptId],
  )

  const setChecking = useCallback((questionId: number, checking: boolean) => {
    setCheckingQuestionIds((current) => {
      const next = new Set(current)
      if (checking) next.add(questionId)
      else next.delete(questionId)
      return next
    })
  }, [])

  const choose = useCallback(
    async (questionId: number, answerId: number) => {
      setError(null)
      if (mode === 'PRACTICE') {
        setChecking(questionId, true)
        try {
          const result = await saveAnswer(attemptId, questionId, answerId)
          updateQuestion(questionId, { selectedAnswerId: result.selectedAnswerId, feedback: result.feedback })
        } catch (saveError) {
          await failAndResync(saveError)
        } finally {
          setChecking(questionId, false)
        }
        return
      }

      // Thi thử: hiện lựa chọn ngay, lưu phía sau. Lưu lỗi thì trả lại lựa chọn cũ rồi đọc lại từ server.
      const previous = latest.current.questions.find((question) => question.questionId === questionId)
      updateQuestion(questionId, { selectedAnswerId: answerId })
      const save = saveQueue.current.then(() => saveAnswer(attemptId, questionId, answerId))
      // Hàng đợi chỉ dùng để giữ thứ tự; lỗi của từng lần lưu được xử lý ngay bên dưới.
      saveQueue.current = save.catch(() => undefined)
      try {
        await save
      } catch (saveError) {
        updateQuestion(questionId, { selectedAnswerId: previous?.selectedAnswerId ?? null })
        await failAndResync(saveError)
      }
    },
    [attemptId, mode, updateQuestion, failAndResync, setChecking],
  )

  const submit = useCallback(async () => {
    if (submittingRef.current || latest.current.status !== 'IN_PROGRESS') return
    submittingRef.current = true
    setSubmitting(true)
    setError(null)
    try {
      await saveQueue.current
      setAttempt(await submitAttempt(attemptId))
    } catch (submitError) {
      await failAndResync(submitError)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [attemptId, failAndResync])

  const goTo = useCallback(
    (index: number) => setCurrentIndex(Math.min(Math.max(index, 0), attempt.questions.length - 1)),
    [attempt.questions.length],
  )

  return { attempt, currentIndex, goTo, choose, checkingQuestionIds, submit, submitting, error }
}

/**
 * Mở lại lượt đang làm thì nhảy tới câu đầu tiên chưa trả lời (làm tiếp chỗ đang dở);
 * bài đã nộp thì xem lại từ câu 1.
 */
function firstUnansweredIndex(attempt: Attempt): number {
  if (attempt.status !== 'IN_PROGRESS') return 0
  const index = attempt.questions.findIndex((question) => question.selectedAnswerId === null)
  return index === -1 ? 0 : index
}
