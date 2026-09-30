import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAppRoutes, pageRoutes } from '../routes'

function BrokenPage(): never {
  throw new Error('Lỗi giả lập khi hiển thị trang')
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('RouteErrorPage', () => {
  it('replaces a page that crashes while rendering, keeping the site header', () => {
    // React và React Router ghi lỗi ra console; ở test này lỗi là cố ý nên tắt để output gọn.
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const routes = createAppRoutes([...pageRoutes, { path: 'trang-loi', element: <BrokenPage /> }])
    const router = createMemoryRouter(routes, { initialEntries: ['/trang-loi'] })

    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Trang này gặp lỗi' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tải lại trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument()
  })
})
