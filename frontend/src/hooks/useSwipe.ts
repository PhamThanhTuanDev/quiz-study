import { useRef, type TouchEvent } from 'react'

interface SwipeOptions {
  /** Vuốt sang trái (ngón tay đi từ phải qua trái), ví dụ sang câu sau như lật trang. */
  onSwipeLeft: () => void
  /** Vuốt sang phải, ví dụ về câu trước. */
  onSwipeRight: () => void
}

/** Khoảng vuốt ngang tối thiểu (px): ngắn hơn coi là chạm nhầm. */
export const MIN_SWIPE_DISTANCE = 60
/** Vuốt chậm hơn thế này (ms) thường là đang kéo chọn chữ, không phải vuốt. */
const MAX_SWIPE_DURATION = 600

/**
 * Nhận cử chỉ vuốt trái / phải trên màn hình cảm ứng; trả về các handler gắn vào phần tử.
 * Dùng touch event thay vì pointer event: khi trình duyệt bắt đầu cuộn trang, pointer event bị huỷ
 * (pointercancel) còn touchend vẫn tới, nên đo được cả cú vuốt hơi chéo.
 * Bỏ qua: cú vuốt chủ yếu theo chiều dọc (đang cuộn trang), nhiều ngón (phóng to), vuốt trong ô code
 * (đang cuộn ngang đoạn code).
 */
export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeOptions) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null)

  const onTouchStart = (event: TouchEvent) => {
    const insideCode = event.target instanceof Element && event.target.closest('pre') !== null
    if (event.touches.length !== 1 || insideCode) {
      start.current = null
      return
    }
    const touch = event.touches[0]
    start.current = { x: touch.clientX, y: touch.clientY, time: event.timeStamp }
  }

  const onTouchEnd = (event: TouchEvent) => {
    const begin = start.current
    start.current = null
    const touch = event.changedTouches[0]
    if (!begin || !touch) return
    const dx = touch.clientX - begin.x
    const dy = touch.clientY - begin.y
    const mostlyHorizontal = Math.abs(dx) > 2 * Math.abs(dy)
    if (Math.abs(dx) < MIN_SWIPE_DISTANCE || !mostlyHorizontal || event.timeStamp - begin.time > MAX_SWIPE_DURATION) {
      return
    }
    if (dx < 0) onSwipeLeft()
    else onSwipeRight()
  }

  return { onTouchStart, onTouchEnd }
}
