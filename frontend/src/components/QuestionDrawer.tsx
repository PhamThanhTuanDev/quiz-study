import { useEffect, useId, useRef } from 'react'
import { useIsScrolling } from '../hooks/useIsScrolling'
import { floatingButtonClassName } from './floatingButtonStyles'

export interface DrawerQuestion {
  questionId: number
  order: number
  content: string
}

interface QuestionDrawerProps {
  questions: DrawerQuestion[]
  activeIndex: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Chọn một câu: trang tự cuộn tới câu đó (và tự đóng danh sách qua `onOpenChange`). */
  onSelect: (index: number) => void
}

// Chiều rộng danh sách; trang Học đẩy khối câu hỏi sang trái đúng bằng chừng này (DRAWER_PUSH).
const DRAWER_WIDTH = 'w-[min(16rem,80vw)]'
export const DRAWER_PUSH = '-translate-x-[min(16rem,80vw)]'

const SLIDE = 'transition-transform duration-300 ease-out motion-reduce:transition-none'

/**
 * Danh sách câu dạng ngăn kéo cho điện thoại (D-052): nút nổi phía trên nút "Lên đầu trang";
 * bấm thì danh sách một cột trượt ra từ bên phải, cuộn được khi nhiều câu. Màn hình lớn không dùng (có lưới bên phải).
 */
export default function QuestionDrawer({ questions, activeIndex, open, onOpenChange, onSelect }: QuestionDrawerProps) {
  const panelId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const currentRef = useRef<HTMLButtonElement>(null)
  const scrolling = useIsScrolling()

  // Mở: đưa câu đang đọc ra giữa danh sách và đặt focus vào đó, để chọn tiếp bằng bàn phím được ngay.
  useEffect(() => {
    if (!open) return
    const list = listRef.current
    const current = currentRef.current
    if (list && current) list.scrollTop = current.offsetTop - list.clientHeight / 2 + current.offsetHeight / 2
    current?.focus({ preventScroll: true })
  }, [open])

  // Đóng mà không chọn câu (nút ×, Esc, chạm ra ngoài): trả focus về nút mở.
  const close = () => {
    onOpenChange(false)
    toggleRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className="lg:hidden">
      <button
        ref={toggleRef}
        type="button"
        onClick={() => onOpenChange(true)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Danh sách câu"
        title="Danh sách câu"
        inert={open}
        className={floatingButtonClassName('aboveBottom', scrolling, open ? 'pointer-events-none scale-75 opacity-0!' : '')}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Lớp nền mờ: chạm ra ngoài danh sách để đóng. Trình đọc màn hình dùng nút × hoặc Esc. */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`fixed inset-0 z-40 bg-ink/20 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id={panelId}
        aria-label="Danh sách câu"
        inert={!open}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
        className={`fixed inset-y-0 right-0 z-50 flex ${DRAWER_WIDTH} flex-col border-l border-line bg-surface shadow-xl ${SLIDE} ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line py-1 pr-1 pl-4">
          <p className="font-semibold">Danh sách câu</p>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng danh sách câu"
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav aria-label="Chọn câu hỏi" className="min-h-0 flex-1">
          <ol ref={listRef} className="h-full overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            {questions.map((question, index) => {
              const current = index === activeIndex
              return (
                <li key={question.questionId}>
                  <button
                    ref={current ? currentRef : undefined}
                    type="button"
                    onClick={() => onSelect(index)}
                    aria-current={current ? 'step' : undefined}
                    className={`flex min-h-11 w-full items-baseline gap-3 border-l-4 px-4 py-2.5 text-left ${
                      current ? 'border-primary bg-primary-soft text-primary' : 'border-transparent hover:bg-canvas'
                    }`}
                  >
                    <span className="shrink-0 text-sm font-semibold">Câu {question.order}</span>
                    {/* Vài chữ đầu của đề để nhận ra câu; aria-hidden vì tên nút chỉ cần "Câu 5". */}
                    <span aria-hidden="true" className="truncate text-sm text-muted">
                      {question.content}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>
      </aside>
    </div>
  )
}
