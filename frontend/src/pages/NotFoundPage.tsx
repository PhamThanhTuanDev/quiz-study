import ButtonLink from '../components/ButtonLink'

export default function NotFoundPage() {
  return (
    <section className="py-8 text-center sm:py-16">
      <title>Không tìm thấy trang · Quiz Study</title>
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Không tìm thấy trang</h1>
      <p className="mt-2 text-muted">Địa chỉ này không tồn tại hoặc đã bị thay đổi.</p>
      <ButtonLink to="/" className="mt-6">
        Về trang chủ
      </ButtonLink>
    </section>
  )
}
