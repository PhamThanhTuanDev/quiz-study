import { useEffect, useState } from 'react'
import { useIsScrolling } from '../hooks/useIsScrolling'
import { floatingButtonClassName } from './floatingButtonStyles'
import { scrollBehavior } from './scrollBehavior'

// Cuộn quá khoảng này (≈ 1,5 màn hình điện thoại) mới hiện nút, để không che nội dung ở đầu trang.
const SHOW_AFTER_PX = 600

/** Nút nổi góc dưới bên phải, đưa người học về đầu trang khi đang ở xa phía dưới (D-050); đứng yên thì mờ đi (D-052). */
export default function BackToTop() {
  const [visible, setVisible] = useState(false)
  const scrolling = useIsScrolling()

  useEffect(() => {
    const update = () => setVisible(window.scrollY > SHOW_AFTER_PX)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  if (!visible) return null

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: scrollBehavior() })

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      className={floatingButtonClassName('bottomOrAboveMenu', scrolling)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
