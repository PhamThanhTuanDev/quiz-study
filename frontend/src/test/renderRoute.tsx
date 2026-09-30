import { render } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { createAppRoutes } from '../routes'

/** Render ứng dụng tại một đường dẫn, dùng đúng cấu hình route thật (layout, trang lỗi…). */
export function renderRoute(path: string) {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}
