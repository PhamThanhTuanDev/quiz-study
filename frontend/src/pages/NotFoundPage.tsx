import ButtonLink from '../components/ButtonLink'

interface NotFoundPageProps {
  title?: string
  message?: string
}

/** Trang 404. Dùng cho URL lạ, và cho dữ liệu không tồn tại (ví dụ môn học không có). */
export default function NotFoundPage({
  title = 'Không tìm thấy trang',
  message = 'Địa chỉ này không tồn tại hoặc đã bị thay đổi.',
}: NotFoundPageProps) {
  return (
    <section className="py-8 text-center sm:py-16">
      <title>{`${title} · Quiz Study`}</title>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
      <p className="mt-2 text-muted">{message}</p>
      <ButtonLink to="/" className="mt-6">
        Về trang chủ
      </ButtonLink>
    </section>
  )
}
