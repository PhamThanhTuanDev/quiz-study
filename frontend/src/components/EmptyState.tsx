import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  /** Hành động gợi ý, ví dụ một nút hoặc link. */
  action?: ReactNode
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-line-strong p-6 text-center">
      <p className="font-semibold">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
