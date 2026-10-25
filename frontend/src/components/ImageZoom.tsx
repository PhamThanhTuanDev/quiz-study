import { useId, useRef } from 'react'

interface ImageZoomProps {
  src: string
  alt: string
  /** Hình của cái gì, viết thường, ví dụ "phương án B": nút là "Phóng to hình phương án B", hộp là "Hình phương án B". */
  label: string
  className?: string
}

/**
 * Nút phóng to hình (phương án là biểu đồ, D-055) và hộp xem hình lớn. Dùng `<dialog>` của trình duyệt
 * (showModal): tự giữ focus bên trong, Esc để đóng, trang phía sau không bấm được, đóng xong focus về lại nút.
 * Nút nằm ngoài ô chọn phương án, nên bấm phóng to không làm chọn phương án đó.
 */
export default function ImageZoom({ src, alt, label, className = '' }: ImageZoomProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const close = () => dialogRef.current?.close()

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`Phóng to hình ${label}`}
        title="Phóng to"
        className={`inline-flex size-11 items-center justify-center rounded-lg border border-line bg-surface/90 text-muted shadow-sm hover:border-primary hover:text-primary ${className}`}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5M11 8v6M8 11h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Chạm ra ngoài hình (vùng nền tối thuộc về chính <dialog>) cũng đóng. */}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] overflow-auto rounded-xl bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/60"
      >
        <div className="flex items-center justify-between border-b border-line py-1 pr-1 pl-4">
          <p id={titleId} className="font-semibold">
            Hình {label}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label="Đóng"
            className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <img src={src} alt={alt} className="block h-auto w-full" />
      </dialog>
    </>
  )
}
