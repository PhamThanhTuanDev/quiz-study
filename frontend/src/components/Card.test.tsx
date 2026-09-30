import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Card from './Card'

describe('Card', () => {
  it('is a region named by its title, so screen readers can jump to it', () => {
    render(<Card title="Trạng thái hệ thống">Nội dung</Card>)

    const region = screen.getByRole('region', { name: 'Trạng thái hệ thống' })
    expect(region).toHaveTextContent('Nội dung')
  })

  it('is not a named region when it has no title', () => {
    render(<Card>Nội dung</Card>)

    expect(screen.queryByRole('region')).not.toBeInTheDocument()
    expect(screen.getByText('Nội dung')).toBeInTheDocument()
  })
})
