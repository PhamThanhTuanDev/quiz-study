import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LoadingState from './LoadingState'

describe('LoadingState', () => {
  it('announces a default loading message', () => {
    render(<LoadingState />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải…')
  })

  it('announces a custom message', () => {
    render(<LoadingState message="Đang tải danh sách môn…" />)

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh sách môn…')
  })
})
