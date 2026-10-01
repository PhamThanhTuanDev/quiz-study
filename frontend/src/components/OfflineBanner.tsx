import { useOnlineStatus } from '../hooks/useOnlineStatus'

/**
 * Báo đang mất mạng (D-040): giao diện vẫn mở được nhờ service worker, nhưng câu hỏi, kiểm tra đáp án
 * và nộp bài đều cần server.
 */
export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return (
    <div role="status" className="border-b border-warning bg-warning-soft">
      <p className="mx-auto max-w-5xl px-4 py-2 text-sm sm:px-6">
        <span className="font-semibold">Bạn đang offline.</span> Cần có mạng để tải câu hỏi, kiểm tra đáp án và nộp
        bài.
      </p>
    </div>
  )
}
