import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, problem } from '../test/mockApi'
import { renderRoute } from '../test/renderRoute'
import type { Attempt, QuizSummary } from '../types/quiz'
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

const QUIZZES: QuizSummary[] = [
  { id: 30, title: 'Thi thử: GDQP', mode: 'EXAM', chapterId: null, chapterTitle: null, chapterOrder: null, questionCount: 36, timeLimitMinutes: 45 },
  { id: 31, title: 'Luyện tập: Bài 1', mode: 'PRACTICE', chapterId: 1, chapterTitle: 'Bài 1', chapterOrder: 1, questionCount: 6, timeLimitMinutes: null },
  { id: 32, title: 'Luyện tập: Bài 2', mode: 'PRACTICE', chapterId: 2, chapterTitle: 'Bài 2', chapterOrder: 2, questionCount: 20, timeLimitMinutes: null },
]

const NEW_ATTEMPT: Attempt = {
  id: 'lan-lam-1',
  quizId: 32,
  quizTitle: 'Luyện tập: Bài 2',
  mode: 'PRACTICE',
  subjectSlug: 'gdqp',
  subjectName: GDQP.name,
  status: 'IN_PROGRESS',
  startedAt: '2026-10-01T03:00:00Z',
  expiresAt: null,
  remainingSeconds: null,
  questions: [
    { questionId: 9, order: 1, content: 'Câu hỏi đầu tiên', codeSnippet: null, answers: [{ id: 1, content: 'A' }, { id: 2, content: 'B' }], selectedAnswerId: null, feedback: null },
  ],
  result: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SubjectPage', () => {
  it('shows the subject with its chapters in order', async () => {
    const fetchMock = mockApi({ 'GET /api/v1/subjects/gdqp': GDQP, 'GET /api/v1/subjects/gdqp/quizzes': QUIZZES })

    renderRoute('/subjects/gdqp')

    expect(await screen.findByRole('heading', { level: 1, name: 'Giáo dục quốc phòng và an ninh' })).toBeInTheDocument()
    expect(screen.getByText('2 bài · 36 câu hỏi')).toBeInTheDocument()
    const chapters = within(screen.getByRole('region', { name: 'Các bài' })).getAllByRole('listitem')
    expect(chapters).toHaveLength(2)
    expect(chapters[0]).toHaveTextContent('Bài 1')
    expect(chapters[0]).toHaveTextContent('6 câu')
    expect(chapters[1]).toHaveTextContent('Quan điểm cơ bản')
    expect(screen.getByRole('link', { name: '← Tất cả môn học' })).toHaveAttribute('href', '/')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/subjects/gdqp', expect.anything())
  })

  it('offers a whole-subject exam and a practice button for every chapter', async () => {
    mockApi({ 'GET /api/v1/subjects/gdqp': GDQP, 'GET /api/v1/subjects/gdqp/quizzes': QUIZZES })

    renderRoute('/subjects/gdqp')

    const exam = await screen.findByRole('region', { name: 'Thi thử cả môn' })
    expect(exam).toHaveTextContent('36 câu ngẫu nhiên · 45 phút')
    expect(within(exam).getByRole('button', { name: 'Bắt đầu thi thử' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Luyện tập Đối tượng, nhiệm vụ, phương pháp nghiên cứu môn học' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Luyện tập Quan điểm cơ bản' })).toBeEnabled()
  })

  it('starts a practice attempt and opens it', async () => {
    const fetchMock = mockApi({
      'GET /api/v1/subjects/gdqp': GDQP,
      'GET /api/v1/subjects/gdqp/quizzes': QUIZZES,
      'POST /api/v1/quizzes/32/attempts': NEW_ATTEMPT,
      'GET /api/v1/attempts/lan-lam-1': NEW_ATTEMPT,
    })
    renderRoute('/subjects/gdqp')

    fireEvent.click(await screen.findByRole('button', { name: 'Luyện tập Quan điểm cơ bản' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Luyện tập: Bài 2' })).toBeInTheDocument()
    expect(screen.getByText('Câu hỏi đầu tiên')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/quizzes/32/attempts', expect.objectContaining({ method: 'POST' }))
  })

  it('tells the user when the attempt cannot be started', async () => {
    mockApi({
      'GET /api/v1/subjects/gdqp': GDQP,
      'GET /api/v1/subjects/gdqp/quizzes': QUIZZES,
      'POST /api/v1/quizzes/30/attempts': problem(409, 'Đề này chưa có câu hỏi nào để làm.'),
    })
    renderRoute('/subjects/gdqp')

    fireEvent.click(await screen.findByRole('button', { name: 'Bắt đầu thi thử' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Đề này chưa có câu hỏi nào để làm.')
    expect(screen.getByRole('button', { name: 'Bắt đầu thi thử' })).toBeEnabled()
  })

  it('shows "not found" without a useless retry button when the subject does not exist', async () => {
    mockApi({
      'GET /api/v1/subjects/java': problem(404, 'Không tìm thấy môn học này.'),
      'GET /api/v1/subjects/java/quizzes': problem(404, 'Không tìm thấy môn học này.'),
    })

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
