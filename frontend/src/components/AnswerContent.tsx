interface AnswerContentProps {
  content: string
  /** Câu điền khuyết: giá trị từng chỗ trống theo thứ tự (D-048); null với phương án thường. */
  blanks: string[] | null
}

/**
 * Nội dung một phương án. Câu điền khuyết: mỗi chỗ trống một ô viền riêng, chữ monospace, cách nhau rõ ràng
 * (giống cách slide ghi [if] [==] [:], nhưng dễ nhìn hơn), theo đúng thứ tự các dấu … trong code.
 */
export default function AnswerContent({ content, blanks }: AnswerContentProps) {
  if (!blanks || blanks.length === 0) {
    return <span className="min-w-0 flex-1 wrap-break-word whitespace-pre-wrap">{content}</span>
  }
  return (
    <span className="flex min-w-0 flex-1 flex-wrap gap-2">
      {blanks.map((value, index) => (
        <span
          key={index}
          className="rounded-md border border-line-strong bg-surface px-2 py-0.5 font-mono text-sm whitespace-pre-wrap"
        >
          {/* Trình đọc màn hình đọc thứ tự chỗ trống; trên màn hình thứ tự đã rõ theo vị trí các ô. */}
          {blanks.length > 1 && <span className="sr-only">({index + 1}) </span>}
          {value}
        </span>
      ))}
    </span>
  )
}
