import type { RouteObject } from 'react-router'
import MainLayout from './layouts/MainLayout'
import AttemptPage from './pages/AttemptPage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import RouteErrorPage from './pages/RouteErrorPage'
import SubjectPage from './pages/SubjectPage'

/** Các trang hiển thị bên trong layout chung. Thêm trang mới: thêm một mục vào đây. */
export const pageRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'subjects/:slug', element: <SubjectPage /> },
  { path: 'attempts/:attemptId', element: <AttemptPage /> },
  { path: '*', element: <NotFoundPage /> },
]

/**
 * Dựng cây route của ứng dụng: layout chung + trang báo lỗi.
 * Nhận danh sách trang làm tham số để test thêm được trang giả mà vẫn dùng đúng cấu trúc thật.
 */
export function createAppRoutes(pages: RouteObject[] = pageRoutes): RouteObject[] {
  return [
    {
      path: '/',
      element: <MainLayout />,
      // Dự phòng khi chính layout gặp lỗi: không còn header/<main> của layout nên tự bọc <main>.
      errorElement: (
        <main className="mx-auto max-w-5xl px-4 sm:px-6">
          <RouteErrorPage />
        </main>
      ),
      children: [
        // Route không có path, chỉ để bắt lỗi của các trang con mà vẫn giữ header/footer.
        { errorElement: <RouteErrorPage />, children: pages },
      ],
    },
  ]
}
