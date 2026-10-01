import { useEffect, useRef } from 'react'

export type HotkeyKey = 'Enter' | 'ArrowLeft' | 'ArrowRight'

/**
 * Phím tắt trên cả trang (ví dụ Enter để kiểm tra, ← → để chuyển câu), song song với bấm chuột.
 * Không chạy phím tắt khi:
 * - có giữ Ctrl / Alt / Shift / Meta (không chặn phím tắt của trình duyệt, ví dụ Alt + ← là quay lại trang trước);
 * - đang gõ chữ (ô nhập), hoặc đang gõ tiếng Việt chưa xong (bộ gõ đang ghép dấu);
 * - Enter khi focus đang ở nút / link: trình duyệt đã tự bấm nút đó, chạy thêm phím tắt là bấm hai lần;
 * - ← → trong ô code: người dùng bàn phím đang cuộn ngang đoạn code.
 * Trên ô chọn đáp án (radio), ← → chuyển câu thay cho việc đổi lựa chọn; ↑ ↓ vẫn dùng để chọn đáp án.
 */
export function useHotkey(key: HotkeyKey, onPress: () => void, enabled = true) {
  // Luôn gọi bản onPress mới nhất mà không phải gắn lại listener mỗi lần render.
  const handlerRef = useRef(onPress)
  useEffect(() => {
    handlerRef.current = onPress
  })

  useEffect(() => {
    if (!enabled) return
    const listener = (event: KeyboardEvent) => {
      if (event.key !== key || event.defaultPrevented || event.isComposing) return
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      if (shouldLeaveToBrowser(event.target, key)) return
      event.preventDefault()
      handlerRef.current()
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [key, enabled])
}

function shouldLeaveToBrowser(target: EventTarget | null, key: HotkeyKey): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
    return true
  }
  if (target instanceof HTMLInputElement && target.type !== 'radio' && target.type !== 'checkbox') return true
  if (key === 'Enter') return target.closest('button, a[href], summary') !== null
  return target.closest('pre') !== null
}
