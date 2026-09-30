import { useId, type ReactNode } from 'react'

interface CardProps {
  /** Tiêu đề thẻ; khi có, thẻ trở thành một vùng (region) mang tên này cho trình đọc màn hình. */
  title?: string
  children: ReactNode
  className?: string
}

export default function Card({ title, children, className }: CardProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={['rounded-xl border border-line bg-surface p-4 shadow-sm sm:p-6', className]
        .filter(Boolean)
        .join(' ')}
    >
      {title && (
        <h2 id={titleId} className="text-base font-semibold sm:text-lg">
          {title}
        </h2>
      )}
      <div className={title ? 'mt-3' : undefined}>{children}</div>
    </section>
  )
}
