import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NETWORK_ERROR_MESSAGE } from '../services/apiClient'
import HomePage from './HomePage'

function healthResponse(body: unknown) {
  return Response.json(body)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('shows backend and database as working when the health check succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(healthResponse({ status: 'UP', database: 'UP' })))

    render(<HomePage />)

    expect(await screen.findByText('Backend: hoạt động')).toBeInTheDocument()
    expect(screen.getByText('Database: hoạt động')).toBeInTheDocument()
  })

  it('shows that the database is down when the backend reports it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(healthResponse({ status: 'UP', database: 'DOWN' })))

    render(<HomePage />)

    expect(await screen.findByText('Database: không hoạt động')).toBeInTheDocument()
  })

  it('shows a loading message before the health check finishes', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    render(<HomePage />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang kiểm tra kết nối backend')
  })

  it('explains the problem when the backend cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    render(<HomePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không kiểm tra được trạng thái hệ thống')
    expect(alert).toHaveTextContent(NETWORK_ERROR_MESSAGE)
  })

  it('checks again when the user clicks retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(healthResponse({ status: 'UP', database: 'UP' })),
    )
    render(<HomePage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByText('Backend: hoạt động')).toBeInTheDocument()
  })
})
