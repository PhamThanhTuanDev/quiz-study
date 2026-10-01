import { useEffect, useId, useRef } from 'react'
import Button from './Button'

interface SubmitConfirmProps {
  unansweredCount: number
  submitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Hỏi lại trước khi nộp bài thi thử, nhắc số câu chưa làm (bỏ trống tính là sai). */
export default function SubmitConfirm({ unansweredCount, submitting, onConfirm, onCancel }: SubmitConfirmProps) {
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Đưa focus tới câu hỏi xác nhận, để người dùng bàn phím / trình đọc màn hình biết ngay phải chọn gì.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-warning bg-warning-soft p-4">
      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="font-semibold focus:outline-none">
        Nộp bài?
      </h2>
      <p className="mt-1 text-sm">
        {unansweredCount > 0
          ? `Bạn còn ${unansweredCount} câu chưa trả lời; câu bỏ trống tính là sai. `
          : 'Bạn đã trả lời tất cả các câu. '}
        Nộp rồi thì không sửa được nữa.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Đang nộp…' : 'Nộp bài'}
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Làm tiếp
        </Button>
      </div>
    </section>
  )
}
