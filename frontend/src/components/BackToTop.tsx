import { useEffect, useState } from 'react'

// Cuộn quá khoảng này (≈ 1,5 màn hình điện thoại) mới hiện nút, để không che nội dung ở đầu trang.
const SHOW_AFTER_PX = 600

/** Nút nổi góc dưới bên phải, đưa người học về đầu trang khi đang ở xa phía dưới (D-050). */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!visible) return null

  const scrollToTop = () => {
    // Tôn trọng cài đặt "giảm chuyển động" của hệ điều hành: nhảy thẳng lên thay vì cuộn mượt.
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      className="fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-md transition-colors hover:bg-primary-hover sm:right-6 sm:bottom-6"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
