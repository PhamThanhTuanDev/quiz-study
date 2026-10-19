import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BackToTop from './BackToTop'

function scrollTo(y: number) {
  act(() => {
    window.scrollY = y
    window.dispatchEvent(new Event('scroll'))
  })
}

afterEach(() => {
  scrollTo(0)
  vi.restoreAllMocks()
})

describe('BackToTop', () => {
  it('stays hidden near the top of the page', () => {
    render(<BackToTop />)

    scrollTo(100)
    expect(screen.queryByRole('button', { name: 'Lên đầu trang' })).not.toBeInTheDocument()
  })

  it('appears after scrolling down and scrolls back to the top when clicked', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(<BackToTop />)

    scrollTo(1200)
    fireEvent.click(screen.getByRole('button', { name: 'Lên đầu trang' }))

    expect(scrollSpy).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
  })
})
