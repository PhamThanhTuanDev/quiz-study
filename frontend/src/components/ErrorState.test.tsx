import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ErrorState from './ErrorState'

describe('ErrorState', () => {
  it('announces the error with its title and message', () => {
    render(<ErrorState title="Không tải được môn học" message="Máy chủ đang gặp sự cố." />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Không tải được môn học')
    expect(alert).toHaveTextContent('Máy chủ đang gặp sự cố.')
  })

  it('calls onRetry when the retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorState message="Lỗi" onRetry={onRetry} />)

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('has no retry button when retrying is not possible', () => {
    render(<ErrorState message="Lỗi" />)

    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })
})
