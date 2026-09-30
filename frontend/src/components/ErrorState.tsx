import Button from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  /** Khi có, hiện nút "Thử lại" gọi hàm này. */
  onRetry?: () => void
}

export default function ErrorState({ title = 'Đã có lỗi xảy ra', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-4">
      <p className="font-semibold text-danger">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  )
}
