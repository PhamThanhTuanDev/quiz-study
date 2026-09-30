import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderRoute } from '../test/renderRoute'
import type { SubjectDetail } from '../types/subject'

const GDQP: SubjectDetail = {
  slug: 'gdqp',
  name: 'Giáo dục quốc phòng và an ninh',
  code: null,
  description: null,
  questionCount: 36,
  chapters: [
    { id: 1, code: 'Bài 1', title: 'Đối tượng, nhiệm vụ, phương pháp nghiên cứu môn học', displayOrder: 1, questionCount: 6 },
    { id: 2, code: 'Bài 2', title: 'Quan điểm cơ bản', displayOrder: 2, questionCount: 30 },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SubjectPage', () => {
  it('shows the subject with its chapters in order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(GDQP)))

    renderRoute('/subjects/gdqp')

    expect(await screen.findByRole('heading', { level: 1, name: 'Giáo dục quốc phòng và an ninh' })).toBeInTheDocument()
    expect(screen.getByText('2 bài · 36 câu hỏi')).toBeInTheDocument()
    const chapters = within(screen.getByRole('region', { name: 'Các bài' })).getAllByRole('listitem')
    expect(chapters).toHaveLength(2)
    expect(chapters[0]).toHaveTextContent('Bài 1')
    expect(chapters[0]).toHaveTextContent('6 câu')
    expect(chapters[1]).toHaveTextContent('Quan điểm cơ bản')
    expect(screen.getByRole('link', { name: '← Tất cả môn học' })).toHaveAttribute('href', '/')
    expect(fetch).toHaveBeenCalledWith('/api/v1/subjects/gdqp', expect.anything())
  })

  it('shows "not found" without a useless retry button when the subject does not exist', async () => {
    const problem = { status: 404, title: 'Not Found', detail: 'Không tìm thấy môn học này.' }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(problem, { status: 404 })))

    renderRoute('/subjects/java')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy môn học' })).toBeInTheDocument()
    expect(screen.getByText('Không tìm thấy môn học này.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về trang chủ' })).toHaveAttribute('href', '/')
  })

  it('offers a retry when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    renderRoute('/subjects/gdqp')

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được môn học')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
