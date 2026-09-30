import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('is a plain button by default so it never submits a form by accident', () => {
    render(<Button>Lưu</Button>)

    expect(screen.getByRole('button', { name: 'Lưu' })).toHaveAttribute('type', 'button')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Lưu</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(
      <Button onClick={onClick} disabled>
        Lưu
      </Button>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
