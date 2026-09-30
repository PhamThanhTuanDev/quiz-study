interface LetterBadgeProps {
  letter: string
}

/**
 * Huy hiệu một chữ cái: dấu nhận diện của Quiz Study (D-028). Dùng cho logo "Q",
 * sau này cho nhãn phương án A/B/C/D. Chỉ để trang trí, nên ẩn với trình đọc màn hình.
 */
export default function LetterBadge({ letter }: LetterBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-white"
    >
      {letter}
    </span>
  )
}
