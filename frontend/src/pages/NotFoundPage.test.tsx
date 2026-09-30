import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { createAppRoutes } from '../routes'

describe('NotFoundPage', () => {
  it('is shown for an unknown address, inside the normal page layout', () => {
    const router = createMemoryRouter(createAppRoutes(), { initialEntries: ['/khong-co-trang-nay'] })
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('navigation', { name: 'Điều hướng chính' })).toBeInTheDocument()
  })
})
