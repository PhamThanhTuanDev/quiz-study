import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsync } from '../hooks/useAsync'
import { ApiError } from '../services/apiClient'
import AsyncContent from './AsyncContent'

function Harness({ load }: { load: () => Promise<string> }) {
  const { state, reload } = useAsync(load)
  return (
    <AsyncContent state={state} onRetry={reload} loadingMessage="Đang tải môn học…" errorTitle="Không tải được">
      {(name) => <p>Môn: {name}</p>}
    </AsyncContent>
  )
}

describe('AsyncContent', () => {
  it('shows the loading message, then the content built from the data', async () => {
    render(<Harness load={vi.fn(async () => 'Python')} />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải môn học…')
    expect(await screen.findByText('Môn: Python')).toBeInTheDocument()
  })

  it('shows the error with a retry button', async () => {
    const load = vi.fn(async (): Promise<string> => {
      throw new ApiError(500, 'Máy chủ đang gặp sự cố.')
    })
    render(<Harness load={load} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được')
    expect(alert).toHaveTextContent('Máy chủ đang gặp sự cố.')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })

  it('keeps keyboard focus inside the content after retry, when the button disappears', async () => {
    const load = vi
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(new ApiError(0, 'Không kết nối được máy chủ.'))
      .mockReturnValueOnce(new Promise<string>(() => {}))
    render(<Harness load={load} />)
    const retryButton = await screen.findByRole('button', { name: 'Thử lại' })
    retryButton.focus()

    fireEvent.click(retryButton)

    const loading = await screen.findByRole('status')
    expect(document.activeElement).not.toBe(document.body)
    expect(document.activeElement).toContainElement(loading)
  })
})
