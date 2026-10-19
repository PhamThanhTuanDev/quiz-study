import { useEffect, useState } from 'react'

/**
 * true trong lúc trang đang cuộn và thêm `idleMs` sau lần cuộn cuối; sau đó trở về false.
 * Dùng để làm mờ các nút nổi khi người đọc đứng yên (D-052), cho chúng bớt che nội dung.
 */
export function useIsScrolling(idleMs = 1200): boolean {
  const [scrolling, setScrolling] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onScroll = () => {
      setScrolling(true)
      clearTimeout(timer)
      timer = setTimeout(() => setScrolling(false), idleMs)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [idleMs])

  return scrolling
}
