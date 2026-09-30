import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/apiClient'

export type AsyncState<T> =
  | { kind: 'loading' }
  | { kind: 'success'; data: T }
  | { kind: 'error'; message: string }

export interface AsyncResult<T> {
  state: AsyncState<T>
  /** Gọi lại `load`, ví dụ khi người dùng bấm "Thử lại". */
  reload: () => void
}

type Loader<T> = (signal: AbortSignal) => Promise<T>

/** Kết quả đã có của một lần tải, kèm thông tin lần tải đó để biết kết quả còn đúng không. */
interface Settled<T> {
  load: Loader<T>
  attempt: number
  state: AsyncState<T>
}

const LOADING: AsyncState<never> = { kind: 'loading' }

export const UNKNOWN_ERROR_MESSAGE = 'Đã có lỗi không xác định. Hãy thử lại.'

/**
 * Chỉ `ApiError` mang thông điệp dành cho người dùng (tiếng Việt). Lỗi khác là lỗi lập trình:
 * ghi chi tiết ra console cho lập trình viên, người dùng chỉ thấy thông điệp chung.
 */
function toUserMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  console.error(error)
  return UNKNOWN_ERROR_MESSAGE
}

/**
 * Gọi một hàm tải dữ liệu (thường là hàm trong `services/`) khi component hiện ra,
 * và trả về trạng thái loading / lỗi / dữ liệu. Request tự huỷ khi component bị gỡ.
 *
 * `load` phải **ổn định** giữa các lần render: khai báo ngoài component, hoặc bọc bằng
 * `useCallback`. Nếu mỗi lần render tạo hàm mới, hook sẽ gọi API liên tục.
 */
export function useAsync<T>(load: Loader<T>): AsyncResult<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    const settle = (state: AsyncState<T>) => {
      if (!controller.signal.aborted) setSettled({ load, attempt, state })
    }

    load(controller.signal)
      .then((data) => settle({ kind: 'success', data }))
      .catch((error: unknown) => {
        // Request bị huỷ (rời trang, tải lại): không phải lỗi, bỏ qua.
        if (controller.signal.aborted) return
        settle({ kind: 'error', message: toUserMessage(error) })
      })

    return () => controller.abort()
  }, [load, attempt])

  const reload = useCallback(() => setAttempt((count) => count + 1), [])

  // Kết quả cũ không còn đúng khi vừa bấm tải lại hoặc `load` đã đổi (ví dụ sang môn khác):
  // khi đó coi là đang tải, thay vì hiện dữ liệu cũ.
  const isCurrent = settled !== null && settled.load === load && settled.attempt === attempt
  return { state: isCurrent ? settled.state : LOADING, reload }
}
