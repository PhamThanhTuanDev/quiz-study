import { useMemo } from 'react'
import { highlightCode, type CodeTokenKind } from './codeHighlight'

interface CodeBlockProps {
  code: string
}

// Viết đủ tên class (không ghép chuỗi) để Tailwind tìm thấy khi build.
const TOKEN_CLASS: Record<CodeTokenKind, string> = {
  plain: '',
  comment: 'text-code-comment',
  string: 'text-code-string',
  number: 'text-code-number',
  keyword: 'text-code-keyword',
  control: 'text-code-control',
  function: 'text-code-function',
  class: 'text-code-class',
  constant: 'text-code-constant',
  variable: 'text-code-variable',
}

/**
 * Đoạn code của câu hỏi: font monospace, giữ nguyên thụt lề, cuộn ngang khi dòng dài (không làm vỡ khung
 * trên điện thoại), tô màu cú pháp giống VS Code (D-047). tabIndex={0}: người dùng bàn phím cũng cuộn ngang
 * được bằng phím mũi tên.
 */
export default function CodeBlock({ code }: CodeBlockProps) {
  const tokens = useMemo(() => highlightCode(code), [code])
  return (
    <pre
      tabIndex={0}
      role="region"
      aria-label="Đoạn code"
      className="overflow-x-auto rounded-lg bg-code-bg p-4 text-sm leading-relaxed text-code-text"
    >
      <code className="font-mono">
        {tokens.map((token, index) =>
          token.kind === 'plain' ? (
            token.text
          ) : (
            <span key={index} className={TOKEN_CLASS[token.kind]}>
              {token.text}
            </span>
          ),
        )}
      </code>
    </pre>
  )
}
