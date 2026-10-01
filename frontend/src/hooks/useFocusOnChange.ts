import { useEffect, useRef } from 'react'

/**
 * Chuyển focus tới phần tử gắn `ref` mỗi khi `value` đổi so với lúc hiện ra (không làm gì ở lần hiện đầu
 * tiên, để mở trang không bị giật focus). Dùng khi nội dung đổi do thao tác của người dùng (sang câu khác,
 * hiện kết quả), để người dùng bàn phím và trình đọc màn hình biết ngay có nội dung mới.
 */
export function useFocusOnChange<T extends HTMLElement>(value: unknown) {
  const ref = useRef<T>(null)
  const initialValue = useRef(value)
  const changed = useRef(false)

  useEffect(() => {
    // So với giá trị ban đầu thay vì đếm số lần chạy: chế độ StrictMode chạy effect hai lần khi mới hiện ra.
    if (!changed.current && Object.is(value, initialValue.current)) return
    changed.current = true
    ref.current?.focus()
  }, [value])

  return ref
}
