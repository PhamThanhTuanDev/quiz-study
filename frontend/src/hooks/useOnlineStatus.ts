import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/**
 * Trình duyệt có đang kết nối mạng không (cập nhật ngay khi mất / có lại mạng).
 * `navigator.onLine = true` chưa chắc đã vào được server, nhưng `false` thì chắc chắn đang mất mạng.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine)
}
