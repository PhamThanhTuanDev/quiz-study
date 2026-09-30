import Button from '../components/Button'
import ButtonLink from '../components/ButtonLink'

/**
 * Hiện khi một trang gặp lỗi lúc hiển thị (lỗi lập trình, không phải lỗi gọi API).
 * React Router tự ghi chi tiết lỗi ra console khi chạy dev.
 */
export default function RouteErrorPage() {
  return (
    <section className="py-8 text-center sm:py-16">
      <title>Đã có lỗi · Quiz Study</title>
      <p className="text-sm font-semibold text-danger">Lỗi</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Trang này gặp lỗi</h1>
      <p className="mt-2 text-muted">Hãy tải lại trang. Nếu vẫn lỗi, quay về trang chủ.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={() => window.location.reload()}>Tải lại trang</Button>
        <ButtonLink to="/" variant="secondary">
          Về trang chủ
        </ButtonLink>
      </div>
    </section>
  )
}
