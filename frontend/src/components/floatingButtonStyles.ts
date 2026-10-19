/**
 * Vị trí nút nổi ở góc dưới bên phải. Nút danh sách câu (trang Học, điện thoại) nằm dưới cùng;
 * nút "Lên đầu trang" nằm ngay phía trên khi trang có nút danh sách, còn không thì xuống dưới cùng (D-052).
 */
export const FLOATING_SLOT = {
  bottom: 'right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6',
  // Trang có nút danh sách câu (đánh dấu data-floating-menu) và màn hình nhỏ hơn lg (nút đó chỉ hiện ở đây):
  // nhích lên 1rem lề + 3rem nút dưới + 0.75rem khoảng cách.
  bottomOrAboveMenu:
    'right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:right-6 sm:bottom-6 ' +
    'max-lg:[body:has([data-floating-menu])_&]:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] ' +
    'max-lg:sm:[body:has([data-floating-menu])_&]:bottom-[5.25rem]',
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
