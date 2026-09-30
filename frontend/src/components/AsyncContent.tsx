import { useRef, type ReactNode } from 'react'
import type { AsyncState } from '../hooks/useAsync'
import ErrorState from './ErrorState'
import LoadingState from './LoadingState'

interface AsyncContentProps<T> {
  /** Trạng thái lấy từ `useAsync`. */
  state: AsyncState<T>
  onRetry: () => void
  loadingMessage?: string
  errorTitle?: string
  /** Nội dung khi tải xong, nhận dữ liệu đã tải. */
  children: (data: T) => ReactNode
}

/**
 * Hiển thị đúng một trong ba trạng thái: đang tải / lỗi (có nút "Thử lại") / dữ liệu.
 * Dùng cùng `useAsync` cho mọi phần của trang cần tải dữ liệu.
 */
export default function AsyncContent<T>({ state, onRetry, loadingMessage, errorTitle, children }: AsyncContentProps<T>) {
  const regionRef = useRef<HTMLDivElement>(null)

  // Nút "Thử lại" biến mất khi chuyển sang đang tải. Đưa focus vào vùng nội dung trước,
  // để người dùng bàn phím / trình đọc màn hình không bị mất vị trí.
  const retry = () => {
    regionRef.current?.focus()
    onRetry()
  }

  return (
    // aria-live + aria-busy: khi tải xong, trình đọc màn hình đọc nội dung mới (dữ liệu hoặc lỗi).
    <div
      ref={regionRef}
      tabIndex={-1}
      aria-live="polite"
      aria-busy={state.kind === 'loading'}
      className="focus:outline-none"
    >
      {state.kind === 'loading' && <LoadingState message={loadingMessage} />}
      {state.kind === 'error' && <ErrorState title={errorTitle} message={state.message} onRetry={retry} />}
      {state.kind === 'success' && children(state.data)}
    </div>
  )
}
