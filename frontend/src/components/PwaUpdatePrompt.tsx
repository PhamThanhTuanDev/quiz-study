import { useRegisterSW } from 'virtual:pwa-register/react'
import UpdatePrompt from './UpdatePrompt'

/**
 * Đăng ký service worker (vite-plugin-pwa, D-040) và hiện {@link UpdatePrompt} khi có phiên bản mới.
 * Chỉ dùng trong ứng dụng thật (App.tsx); test dùng thẳng UpdatePrompt vì module ảo của plugin
 * và service worker không có trong môi trường test.
 */
export default function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      // Không đăng ký được (ví dụ trình duyệt chặn): app vẫn chạy bình thường, chỉ không cài / offline được.
      console.error('Không đăng ký được service worker', error)
    },
  })

  if (!needRefresh) return null
  return <UpdatePrompt onReload={() => void updateServiceWorker(true)} onDismiss={() => setNeedRefresh(false)} />
}
