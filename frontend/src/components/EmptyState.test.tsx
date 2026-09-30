import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Button from './Button'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('shows the title, the description and the suggested action', () => {
    render(
      <EmptyState
        title="Chưa có môn học nào"
        description="Môn học sẽ xuất hiện ở đây khi được thêm."
        action={<Button>Tải lại</Button>}
      />,
    )

    expect(screen.getByText('Chưa có môn học nào')).toBeInTheDocument()
    expect(screen.getByText('Môn học sẽ xuất hiện ở đây khi được thêm.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tải lại' })).toBeInTheDocument()
  })
})
