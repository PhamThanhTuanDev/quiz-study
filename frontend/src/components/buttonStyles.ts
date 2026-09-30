export type ButtonVariant = 'primary' | 'secondary' | 'ghost'

// min-h-11 = 44px: vùng bấm đủ lớn cho ngón tay trên điện thoại.
const BASE =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ' +
  'transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:text-base'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:not-disabled:bg-primary-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:not-disabled:bg-canvas',
  ghost: 'text-primary hover:not-disabled:bg-primary-soft',
}

/** Class Tailwind cho nút, dùng chung cho `Button` (thẻ button) và `ButtonLink` (link điều hướng). */
export function buttonClassName(variant: ButtonVariant, className?: string): string {
  return [BASE, VARIANTS[variant], className].filter(Boolean).join(' ')
}
