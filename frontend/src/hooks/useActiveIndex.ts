import { type RefObject, useEffect, useState } from 'react'

// Dải ngang ở khoảng 20–30% chiều cao màn hình (tính từ trên xuống): câu nào đi qua dải này là câu đang đọc.
const READING_BAND = '-20% 0px -70% 0px'

/**
 * Theo dõi phần tử nào trong danh sách đang ở vùng đọc khi cuộn, trả về vị trí của nó (bắt đầu là 0).
 * `elementsRef` giữ các phần tử theo thứ tự; `count` đổi thì theo dõi lại.
 * `setActiveIndex` cho phép đặt ngay khi người dùng bấm chọn, không đợi cuộn xong.
 * Trình duyệt không có IntersectionObserver (môi trường test) thì chỉ đổi khi gọi `setActiveIndex`.
 */
export function useActiveIndex(elementsRef: RefObject<(HTMLElement | null)[]>, count: number) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const elements = elementsRef.current.slice(0, count)
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const index = elements.indexOf(entry.target as HTMLElement)
          if (index !== -1) setActiveIndex(index)
        }
      },
      { rootMargin: READING_BAND },
    )
    for (const element of elements) {
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [elementsRef, count])

  return { activeIndex, setActiveIndex }
}
