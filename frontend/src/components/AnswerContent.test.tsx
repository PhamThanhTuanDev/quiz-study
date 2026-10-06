import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import AnswerContent from './AnswerContent'

describe('AnswerContent', () => {
  it('shows an ordinary answer as plain text', () => {
    const { container } = render(<AnswerContent content="Hiển thị chú thích" blanks={null} />)

    expect(container).toHaveTextContent('Hiển thị chú thích')
    expect(container.querySelectorAll('.border')).toHaveLength(0)
  })

  it('shows each blank of a fill-in answer in its own box, in order', () => {
    render(<AnswerContent content="(1) if · (2) == · (3) :" blanks={['if', '==', ':']} />)

    const boxes = [screen.getByText('if'), screen.getByText('=='), screen.getByText(':')]
    boxes.forEach((box) => expect(box).toHaveClass('border', 'font-mono'))
    // Thứ tự chỗ trống chỉ đọc cho trình đọc màn hình, không hiện trên màn hình.
    expect(screen.getByText('(2)')).toHaveClass('sr-only')
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
  })

  it('keeps brackets inside a single blank as they are', () => {
    render(<AnswerContent content="[0]" blanks={['[0]']} />)

    expect(screen.getByText('[0]')).toHaveClass('border')
    expect(screen.queryByText('(1)')).not.toBeInTheDocument()
  })
})
