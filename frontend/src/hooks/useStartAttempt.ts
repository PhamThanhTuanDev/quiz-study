import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import { startAttempt } from '../services/quizService'
import { toUserMessage } from './useAsync'

export interface StartAttemptControls {
  /** Tạo lượt làm mới cho đề rồi chuyển tới trang làm bài. */
  start: (quizId: number) => Promise<void>
  /** Đề đang được tạo lượt làm (để hiện "Đang tạo…" và khoá các nút); null nếu không có. */
  pendingQuizId: number | null
  /** Thông điệp lỗi tiếng Việt khi không tạo được lượt làm. */
  error: string | null
}

export function useStartAttempt(): StartAttemptControls {
  const navigate = useNavigate()
  const [pendingQuizId, setPendingQuizId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const start = useCallback(
    async (quizId: number) => {
      setPendingQuizId(quizId)
      setError(null)
      try {
        const attempt = await startAttempt(quizId)
        navigate(`/attempts/${attempt.id}`)
      } catch (startError) {
        setError(toUserMessage(startError))
        setPendingQuizId(null)
      }
    },
    [navigate],
  )

  return { start, pendingQuizId, error }
}
