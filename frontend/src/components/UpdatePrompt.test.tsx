import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import UpdatePrompt from './UpdatePrompt'

describe('UpdatePrompt', () => {
  it('lets the user reload now or later', () => {
    const onReload = vi.fn()
    const onDismiss = vi.fn()
    render(<UpdatePrompt onReload={onReload} onDismiss={onDismiss} />)

    expect(screen.getByRole('region', { name: 'Có phiên bản mới của Quiz Study' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }))
    fireEvent.click(screen.getByRole('button', { name: 'Để sau' }))

    expect(onReload).toHaveBeenCalledOnce()
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
