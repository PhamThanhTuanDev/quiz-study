import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HomePage from './HomePage'

function mockFetchJson(body: unknown, status = 200) {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('shows backend and database as working when the health check succeeds', async () => {
    mockFetchJson({ status: 'UP', database: 'UP' })

    render(<HomePage />)

    expect(await screen.findByText('Backend: hoạt động')).toBeInTheDocument()
    expect(screen.getByText('Database: hoạt động')).toBeInTheDocument()
  })

  it('shows that the database is down when the backend reports it', async () => {
    mockFetchJson({ status: 'UP', database: 'DOWN' })

    render(<HomePage />)

    expect(await screen.findByText('Database: không hoạt động')).toBeInTheDocument()
  })

  it('shows an error message when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<HomePage />)

    expect(await screen.findByText(/Không kết nối được backend/)).toHaveTextContent('Failed to fetch')
  })

  it('shows a loading message before the health check finishes', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    render(<HomePage />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra kết nối backend')
  })
})
