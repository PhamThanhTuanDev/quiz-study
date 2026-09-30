import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NETWORK_ERROR_MESSAGE } from '../services/apiClient'
import { renderRoute } from '../test/renderRoute'
import type { SubjectSummary } from '../types/subject'

const GDQP: SubjectSummary = {
  slug: 'gdqp',
  name: 'Giáo dục quốc phòng và an ninh',
  code: null,
  description: null,
  chapterCount: 11,
  questionCount: 230,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HomePage', () => {
  it('lists the subjects, each linking to its own page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([GDQP])))

    renderRoute('/')

    const link = await screen.findByRole('link', { name: /Giáo dục quốc phòng và an ninh/ })
    expect(link).toHaveAttribute('href', '/subjects/gdqp')
    expect(link).toHaveTextContent('11 bài · 230 câu hỏi')
    expect(fetch).toHaveBeenCalledWith('/api/v1/subjects', expect.anything())
  })

  it('says so when there is no subject yet', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([])))

    renderRoute('/')

    expect(await screen.findByText('Chưa có môn học nào')).toBeInTheDocument()
  })

  it('shows a loading message while the subjects are loading', () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})))

    renderRoute('/')

    expect(screen.getByRole('status')).toHaveTextContent('Đang tải danh sách môn')
  })

  it('explains the problem and loads again when the user clicks retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(Response.json([GDQP])),
    )
    renderRoute('/')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Không tải được danh sách môn')
    expect(alert).toHaveTextContent(NETWORK_ERROR_MESSAGE)

    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    expect(await screen.findByRole('link', { name: /Giáo dục quốc phòng và an ninh/ })).toBeInTheDocument()
  })
})
