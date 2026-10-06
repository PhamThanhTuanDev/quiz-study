import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CodeBlock from './CodeBlock'

describe('CodeBlock', () => {
  it('shows the code unchanged, with keywords, names and strings colored', () => {
    const code = 'def greet(name):\n    print("Xin chào", name)'

    render(<CodeBlock code={code} />)

    const block = screen.getByRole('region', { name: 'Đoạn code' })
    expect(block.textContent).toBe(code)
    expect(within(block).getByText('def')).toHaveClass('text-code-keyword')
    expect(within(block).getByText('greet')).toHaveClass('text-code-function')
    expect(within(block).getByText('"Xin chào"')).toHaveClass('text-code-string')
  })
})
