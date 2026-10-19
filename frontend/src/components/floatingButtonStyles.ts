/** Vị trí nút nổi ở góc dưới bên phải: nút "Lên đầu trang" ở dưới cùng, nút danh sách câu ngay phía trên. */
export const FLOATING_SLOT = {
  bottom: 'right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6',
  // 1rem lề + 3rem nút dưới + 0.75rem khoảng cách.
  aboveBottom: 'right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-[5.25rem]',
} as const

/**
 * Class cho nút tròn nổi (D-050, D-052). Đứng yên thì mờ đi một chút để bớt che chữ;
 * đang cuộn, rê chuột hoặc focus bằng bàn phím thì hiện rõ.
 */
export function floatingButtonClassName(slot: keyof typeof FLOATING_SLOT, scrolling: boolean, className?: string): string {
  return [
    'fixed z-40 inline-flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-md',
    'transition-[opacity,background-color,transform] duration-300 ease-out motion-reduce:transition-none',
    'hover:bg-primary-hover hover:opacity-100 focus-visible:opacity-100',
    FLOATING_SLOT[slot],
    scrolling ? 'opacity-100' : 'opacity-60',
    className,
  ]
    .filter(Boolean)
    .join(' ')
}
