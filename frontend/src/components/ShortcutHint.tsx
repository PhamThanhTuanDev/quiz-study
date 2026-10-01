import type { ReactNode } from 'react'

interface ShortcutHintProps {
  /** Chữ hiện trong gợi ý, ví dụ "Enter", "←". */
  keys: string
  children: ReactNode
}

/**
 * Bọc một nút để hiện gợi ý "Phím tắt: …" khi rê chuột hoặc focus bằng bàn phím (giống F8).
 * Gợi ý chỉ để nhìn (aria-hidden); nút tự khai báo phím tắt cho trình đọc màn hình bằng `aria-keyshortcuts`.
 * Trên màn hình cảm ứng không có bàn phím nên không hiện.
 */
export default function ShortcutHint({ keys, children }: ShortcutHintProps) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded-md bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-has-focus-visible:opacity-100 pointer-coarse:hidden"
      >
        Phím tắt: {keys}
      </span>
    </span>
  )
}
