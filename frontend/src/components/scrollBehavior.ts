/**
 * Cuộn mượt, trừ khi hệ điều hành bật "giảm chuyển động" (người dễ chóng mặt khi màn hình trôi):
 * khi đó nhảy thẳng tới chỗ cần đến.
 */
export function scrollBehavior(): ScrollBehavior {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  return reduceMotion ? 'auto' : 'smooth'
}
