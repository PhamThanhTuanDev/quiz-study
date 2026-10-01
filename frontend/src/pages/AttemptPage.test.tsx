import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockApi, problem } from '../test/mockApi'
import { renderRoute } from '../test/renderRoute'
import type { Attempt, AttemptQuestion } from '../types/quiz'

function question(questionId: number, order: number, extra: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId,
    order,
    content: `Nội dung câu ${order}`,
    codeSnippet: null,
    answers: [
      { id: questionId * 10 + 1, content: `Phương án 1 của câu ${order}` },
      { id: questionId * 10 + 2, content: `Phương án 2 của câu ${order}` },
    ],
    selectedAnswerId: null,
    feedback: null,
    ...extra,
  }
}

function attempt(extra: Partial<Attempt>): Attempt {
  return {
    id: 'luot-1',
    quizId: 7,
    quizTitle: 'Luyện tập: Hàm',
    mode: 'PRACTICE',
    subjectSlug: 'python',
    subjectName: 'Nhập môn lập trình Python',
    status: 'IN_PROGRESS',
    startedAt: '2026-10-01T03:00:00Z',
    expiresAt: null,
    remainingSeconds: null,
    questions: [
      question(1, 1, { content: 'Kết quả của đoạn code sau?\n1) dòng một\n2) dòng hai', codeSnippet: 'def f(x):\n    return x * 2' }),
      question(2, 2),
    ],
    result: null,
    ...extra,
  }
}

const EXAM = attempt({
  quizTitle: 'Thi thử: Python',
  mode: 'EXAM',
  expiresAt: '2026-10-01T03:45:00Z',
  remainingSeconds: 2700,
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('AttemptPage – luyện tập', () => {
  it('shows the question text with its line breaks and the code with its indentation', async () => {
    mockApi({ 'GET /api/v1/attempts/luot-1': attempt({}) })

    renderRoute('/attempts/luot-1')

    expect(await screen.findByRole('heading', { level: 1, name: 'Luyện tập: Hàm' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Câu 1/2' })).toBeInTheDocument()
    expect(screen.getByText(/Kết quả của đoạn code sau\?/)).toHaveTextContent('1) dòng một 2) dòng hai')
    expect(screen.getByRole('region', { name: 'Đoạn code' }).textContent).toBe('def f(x):\n    return x * 2')
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nộp bài' })).not.toBeInTheDocument()
  })

  it('checks the picked answer, shows the correct one, and locks the question', async () => {
    const fetchMock = mockApi({
      'GET /api/v1/attempts/luot-1': attempt({}),
      'PUT /api/v1/attempts/luot-1/answers/1': {
        questionId: 1,
        selectedAnswerId: 12,
        feedback: { correct: false, correctAnswerId: 11, explanation: null },
      },
    })
    renderRoute('/attempts/luot-1')

    const check = await screen.findByRole('button', { name: 'Kiểm tra' })
    expect(check).toBeDisabled()
    fireEvent.click(screen.getByRole('radio', { name: /Phương án 2 của câu 1/ }))
    fireEvent.click(check)

    expect(await screen.findByRole('status')).toHaveTextContent('✗ Chưa đúng. Đáp án đúng là A.')
    expect(screen.getByRole('radio', { name: /Phương án 1 của câu 1/ })).toBeDisabled()
    expect(screen.getByText('✓ Đáp án đúng')).toBeInTheDocument()
    expect(screen.getByText('✗ Bạn chọn')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kiểm tra' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Câu 1, sai' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/attempts/luot-1/answers/1',
      expect.objectContaining({ method: 'PUT', body: '{"answerId":12}' }),
    )
  })

  it('offers another round when every question has been answered, without any score', async () => {
    const answered = (id: number, order: number) =>
      question(id, order, { selectedAnswerId: id * 10 + 1, feedback: { correct: true, correctAnswerId: id * 10 + 1, explanation: null } })
    const done = attempt({ questions: [answered(1, 1), answered(2, 2)] })
    const next = attempt({ id: 'luot-2', questions: [question(5, 1, { content: 'Câu của lượt mới' })] })
    mockApi({
      'GET /api/v1/attempts/luot-1': done,
      'POST /api/v1/quizzes/7/attempts': next,
      'GET /api/v1/attempts/luot-2': next,
    })
    renderRoute('/attempts/luot-1')

    const outcome = await screen.findByRole('region', { name: 'Đã làm hết lượt này' })
    expect(outcome).not.toHaveTextContent('điểm')
    fireEvent.click(within(outcome).getByRole('button', { name: 'Luyện tiếp' }))

    expect(await screen.findByText('Câu của lượt mới')).toBeInTheDocument()
  })
})

describe('AttemptPage – thi thử', () => {
  it('saves a choice right away without revealing whether it is correct', async () => {
    const fetchMock = mockApi({
      'GET /api/v1/attempts/luot-1': EXAM,
      'PUT /api/v1/attempts/luot-1/answers/1': { questionId: 1, selectedAnswerId: 11, feedback: null },
    })
    renderRoute('/attempts/luot-1')

    fireEvent.click(await screen.findByRole('radio', { name: /Phương án 1 của câu 1/ }))

    expect(screen.getByRole('radio', { name: /Phương án 1 của câu 1/ })).toBeChecked()
    expect(await screen.findByText('Đã trả lời 1/2 câu')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/attempts/luot-1/answers/1', expect.objectContaining({ method: 'PUT' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByText(/Đáp án đúng/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Câu 1, đã trả lời' })).toBeInTheDocument()
  })

  it('moves between questions and puts the focus on the new question', async () => {
    mockApi({ 'GET /api/v1/attempts/luot-1': EXAM })
    renderRoute('/attempts/luot-1')

    fireEvent.click(await screen.findByRole('button', { name: 'Câu sau →' }))

    expect(screen.getByRole('heading', { name: 'Câu 2/2' })).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Câu sau →' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Câu 1, chưa trả lời' }))
    expect(screen.getByRole('heading', { name: 'Câu 1/2' })).toHaveFocus()
  })

  it('asks for confirmation, then submits and shows the score out of 10', async () => {
    const submitted = attempt({
      ...EXAM,
      status: 'SUBMITTED',
      remainingSeconds: null,
      result: { correctCount: 1, totalQuestions: 2, score: 5, submittedAt: '2026-10-01T03:10:00Z' },
    })
    const fetchMock = mockApi({ 'GET /api/v1/attempts/luot-1': EXAM, 'POST /api/v1/attempts/luot-1/submit': submitted })
    renderRoute('/attempts/luot-1')

    fireEvent.click(await screen.findByRole('button', { name: 'Nộp bài' }))
    const confirm = screen.getByRole('region', { name: 'Nộp bài?' })
    expect(confirm).toHaveTextContent('Bạn còn 2 câu chưa trả lời')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Nộp bài' }))

    const result = await screen.findByRole('region', { name: 'Kết quả' })
    expect(result).toHaveTextContent('5,00 / 10 điểm')
    expect(result).toHaveTextContent('Đúng 1/2 câu.')
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Phương án 1 của câu 1/ })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/attempts/luot-1/submit', expect.objectContaining({ method: 'POST' }))
  })

  it('submits by itself when the countdown reaches zero', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const expired = attempt({
      ...EXAM,
      status: 'EXPIRED',
      remainingSeconds: null,
      result: { correctCount: 0, totalQuestions: 2, score: 0, submittedAt: '2026-10-01T03:45:00Z' },
    })
    const fetchMock = mockApi({
      'GET /api/v1/attempts/luot-1': { ...EXAM, remainingSeconds: 2 },
      'POST /api/v1/attempts/luot-1/submit': expired,
    })
    renderRoute('/attempts/luot-1')

    expect(await screen.findByRole('timer')).toHaveTextContent('Còn lại 00:02')
    await act(() => vi.advanceTimersByTimeAsync(3000))

    expect(await screen.findByRole('region', { name: 'Kết quả' })).toHaveTextContent('Đã hết giờ')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/attempts/luot-1/submit', expect.objectContaining({ method: 'POST' }))
  })

  it('explains the problem and shows the real state when the time ran out while saving', async () => {
    const expired = attempt({
      ...EXAM,
      status: 'EXPIRED',
      remainingSeconds: null,
      result: { correctCount: 0, totalQuestions: 2, score: 0, submittedAt: '2026-10-01T03:45:10Z' },
    })
    let reads = 0
    mockApi({
      'GET /api/v1/attempts/luot-1': () => (reads++ === 0 ? EXAM : expired),
      'PUT /api/v1/attempts/luot-1/answers/1': problem(409, 'Đã hết giờ làm bài. Bài đã được chấm với các câu đã lưu.'),
    })
    renderRoute('/attempts/luot-1')

    fireEvent.click(await screen.findByRole('radio', { name: /Phương án 1 của câu 1/ }))

    expect(await screen.findByRole('region', { name: 'Kết quả' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Đã hết giờ làm bài.')
    expect(screen.getByRole('radio', { name: /Phương án 1 của câu 1/ })).not.toBeChecked()
  })
})

describe('AttemptPage – không tìm thấy', () => {
  it('shows a not-found page for an unknown attempt', async () => {
    mockApi({ 'GET /api/v1/attempts/khong-co': problem(404, 'Không tìm thấy lượt làm bài này.') })

    renderRoute('/attempts/khong-co')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy lượt làm bài' })).toBeInTheDocument()
    expect(screen.getByText('Không tìm thấy lượt làm bài này.')).toBeInTheDocument()
  })
})
