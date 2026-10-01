interface CodeBlockProps {
  code: string
}

/**
 * Đoạn code của câu hỏi: font monospace, giữ nguyên thụt lề, cuộn ngang khi dòng dài (không làm vỡ khung
 * trên điện thoại). tabIndex={0}: người dùng bàn phím cũng cuộn ngang được bằng phím mũi tên.
 */
export default function CodeBlock({ code }: CodeBlockProps) {
  return (
    <pre
      tabIndex={0}
      role="region"
      aria-label="Đoạn code"
      className="overflow-x-auto rounded-lg border border-line bg-canvas p-4 text-sm leading-relaxed"
    >
      <code className="font-mono">{code}</code>
    </pre>
  )
}
