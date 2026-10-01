import { fireEvent, screen, within } from '@testing-library/react'
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

describe('HomePage – lượt làm gần đây', () => {
  it('lists the recent attempts of this browser and lets the user clear them', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([GDQP])))
    window.localStorage.setItem(
      'quiz-study.recent-attempts',
      JSON.stringify([
        { id: 'b', quizTitle: 'Thi thử: GDQP', subjectName: GDQP.name, mode: 'EXAM', status: 'SUBMITTED', startedAt: '2026-10-01T02:00:00Z', score: 7.5 },
        { id: 'a', quizTitle: 'Luyện tập: Bài 1', subjectName: GDQP.name, mode: 'PRACTICE', status: 'IN_PROGRESS', startedAt: '2026-10-01T01:00:00Z', score: null },
      ]),
    )

    renderRoute('/')

    const recent = await screen.findByRole('region', { name: 'Lượt làm gần đây' })
    const links = within(recent).getAllByRole('link')
    expect(links[0]).toHaveAttribute('href', '/attempts/b')
    expect(links[0]).toHaveTextContent('Thi thử: GDQP')
    expect(links[0]).toHaveTextContent('7,50 điểm')
    expect(links[1]).toHaveTextContent('Luyện tập')
    fireEvent.click(within(recent).getByRole('button', { name: 'Xoá danh sách' }))
    expect(screen.queryByRole('region', { name: 'Lượt làm gần đây' })).not.toBeInTheDocument()
    expect(window.localStorage.getItem('quiz-study.recent-attempts')).toBeNull()
  })

  it('shows nothing when there is no recent attempt', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([GDQP])))

    renderRoute('/')

    await screen.findByRole('link', { name: /Giáo dục quốc phòng và an ninh/ })
    expect(screen.queryByRole('region', { name: 'Lượt làm gần đây' })).not.toBeInTheDocument()
  })
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
