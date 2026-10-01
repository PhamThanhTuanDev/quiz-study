import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import OfflineBanner from './OfflineBanner'

function setOnline(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'))
  })
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OfflineBanner', () => {
  it('shows nothing while online', () => {
    render(<OfflineBanner />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('appears when the connection drops and disappears when it comes back', () => {
    render(<OfflineBanner />)

    setOnline(false)
    expect(screen.getByRole('status')).toHaveTextContent('Bạn đang offline.')

    setOnline(true)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
