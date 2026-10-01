import { useEffect, useRef, useState } from 'react'

interface CountdownTimerProps {
  /** Số giây còn lại theo đồng hồ server lúc tải trang (không dùng giờ máy người dùng để tính hạn). */
  remainingSeconds: number
  /** Gọi một lần khi về 0, ví dụ để tự nộp bài. */
  onExpire: () => void
}

const WARNING_SECONDS = 5 * 60

/** Đồng hồ đếm ngược của bài thi thử. Dưới 5 phút thì đổi màu cảnh báo. */
export default function CountdownTimer({ remainingSeconds, onExpire }: CountdownTimerProps) {
  // Hạn tính một lần lúc hiện ra; mỗi giây tính lại từ hạn này để không bị trôi khi trình duyệt chạy chậm.
  const [deadline] = useState(() => Date.now() + remainingSeconds * 1000)
  const [secondsLeft, setSecondsLeft] = useState(remainingSeconds)
  // Luôn gọi bản onExpire mới nhất mà không phải khởi động lại bộ đếm mỗi khi trang render lại.
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) {
        clearInterval(timer)
        onExpireRef.current()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  const warning = secondsLeft <= WARNING_SECONDS
  return (
    // role="timer" mặc định không đọc to mỗi giây (aria-live="off"), người dùng tự nghe khi cần.
    <p role="timer" className={`text-lg font-semibold tabular-nums ${warning ? 'text-warning' : 'text-ink'}`}>
      <span className="text-sm font-normal text-muted">Còn lại </span>
      {formatDuration(secondsLeft)}
    </p>
  )
}

/** 125 → "02:05"; từ 1 giờ trở lên → "1:02:05". */
function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}
