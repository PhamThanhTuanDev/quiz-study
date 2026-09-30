import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAppRoutes } from '../routes'

function renderAt(path: string) {
  const router = createMemoryRouter(createAppRoutes(), { initialEntries: [path] })
  render(<RouterProvider router={router} />)
}

beforeEach(() => {
  // Trang chủ gọi API health; test này chỉ quan tâm khung trang nên để request treo.
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('MainLayout', () => {
  it('links the logo to the home page', () => {
    renderAt('/')

    expect(screen.getByRole('link', { name: 'Quiz Study' })).toHaveAttribute('href', '/')
  })

  it('marks the current page in the main navigation', () => {
    renderAt('/')

    const nav = screen.getByRole('navigation', { name: 'Điều hướng chính' })
    expect(within(nav).getByRole('link', { name: 'Trang chủ' })).toHaveAttribute('aria-current', 'page')
  })

  it('offers a skip link that jumps to the main content', () => {
    renderAt('/')

    expect(screen.getByRole('link', { name: 'Bỏ qua điều hướng' })).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })
})
