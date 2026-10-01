import { useId } from 'react'
import Button from './Button'

interface UpdatePromptProps {
  onReload: () => void
  onDismiss: () => void
}

/**
 * Hỏi người dùng có tải lại để dùng phiên bản mới không (D-040). Không tự tải lại: người dùng có thể đang làm
 * bài dở (lựa chọn đã chọn mà chưa bấm "Kiểm tra" sẽ mất).
 */
export default function UpdatePrompt({ onReload, onDismiss }: UpdatePromptProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="fixed inset-x-4 bottom-4 z-20 mx-auto max-w-md rounded-xl border border-line bg-surface p-4 shadow-lg"
    >
      <h2 id={titleId} className="font-semibold">
        Có phiên bản mới của Quiz Study
      </h2>
      <p className="mt-1 text-sm text-muted">Tải lại trang để dùng bản mới.</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={onReload}>Tải lại</Button>
        <Button variant="secondary" onClick={onDismiss}>
          Để sau
        </Button>
      </div>
    </section>
  )
}
