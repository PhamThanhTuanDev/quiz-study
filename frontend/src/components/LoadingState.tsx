interface LoadingStateProps {
  message?: string
}

export default function LoadingState({ message = 'Đang tải…' }: LoadingStateProps) {
  return (
    <div role="status" className="flex items-center gap-3 text-muted">
      <span
        aria-hidden="true"
        className="size-5 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-primary motion-reduce:animate-none"
      />
      <span>{message}</span>
    </div>
  )
}
