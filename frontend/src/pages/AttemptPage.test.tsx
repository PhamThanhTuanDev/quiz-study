import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getRecentAttempts, rememberAttempt } from '../services/recentAttempts'
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
    // Mở bài là được ghi vào "Lượt làm gần đây" của trình duyệt.
    await waitFor(() =>
      expect(getRecentAttempts()).toMatchObject([{ id: 'luot-1', quizTitle: 'Luyện tập: Hàm', status: 'IN_PROGRESS' }]),
    )
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
    await waitFor(() => expect(screen.getByRole('status')).toHaveFocus())
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

  it('asks for confirmation, submits, then lets the user review every question', async () => {
    // Sau khi nộp, server trả đúng/sai và đáp án đúng của mọi câu (D-038): câu 1 đúng, câu 2 bỏ trống.
    const submitted = attempt({
      ...EXAM,
      status: 'SUBMITTED',
      remainingSeconds: null,
      questions: [
        question(1, 1, { selectedAnswerId: 11, feedback: { correct: true, correctAnswerId: 11, explanation: null } }),
        question(2, 2, { feedback: { correct: false, correctAnswerId: 22, explanation: 'Vì lý do X.' } }),
      ],
      result: { correctCount: 1, unansweredCount: 1, totalQuestions: 2, score: 5, submittedAt: '2026-10-01T03:10:00Z' },
    })
    const fetchMock = mockApi({
      'GET /api/v1/attempts/luot-1': EXAM,
      'PUT /api/v1/attempts/luot-1/answers/1': { questionId: 1, selectedAnswerId: 11, feedback: null },
      'POST /api/v1/attempts/luot-1/submit': submitted,
    })
    renderRoute('/attempts/luot-1')
    fireEvent.click(await screen.findByRole('radio', { name: /Phương án 1 của câu 1/ }))

    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }))
    const confirm = screen.getByRole('region', { name: 'Nộp bài?' })
    expect(confirm).toHaveTextContent('Bạn còn 1 câu chưa trả lời')
    fireEvent.click(within(confirm).getByRole('button', { name: 'Nộp bài' }))

    const result = await screen.findByRole('region', { name: 'Kết quả' })
    await waitFor(() => expect(result.parentElement).toHaveFocus())
    expect(result).toHaveTextContent('5,00 / 10 điểm')
    expect(result).toHaveTextContent('Đúng 1/2 câu · Sai 0 · Bỏ trống 1')
    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Phương án 1 của câu 1/ })).toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('✓ Chính xác!')
    expect(screen.getByRole('button', { name: 'Câu 2, bỏ trống' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/attempts/luot-1/submit', expect.objectContaining({ method: 'POST' }))

    fireEvent.click(within(result).getByRole('button', { name: 'Xem câu sai tiếp theo' }))

    expect(screen.getByRole('heading', { name: 'Câu 2/2' })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('– Bạn bỏ trống câu này. Đáp án đúng là B.')
    expect(screen.getByRole('status')).toHaveTextContent('Vì lý do X.')
    expect(screen.getByText('✓ Đáp án đúng')).toBeInTheDocument()
    // Câu đang xem là câu sai duy nhất: không còn câu sai nào khác để nhảy tới.
    expect(screen.queryByRole('button', { name: 'Xem câu sai tiếp theo' })).not.toBeInTheDocument()
  })

  it('reopens a submitted exam at the first question', async () => {
    const submitted = attempt({
      ...EXAM,
      status: 'SUBMITTED',
      remainingSeconds: null,
      questions: [
        question(1, 1, { feedback: { correct: false, correctAnswerId: 11, explanation: null } }),
        question(2, 2, { feedback: { correct: false, correctAnswerId: 21, explanation: null } }),
      ],
      result: { correctCount: 0, unansweredCount: 2, totalQuestions: 2, score: 0, submittedAt: '2026-10-01T03:10:00Z' },
    })
    mockApi({ 'GET /api/v1/attempts/luot-1': submitted })

    renderRoute('/attempts/luot-1')

    expect(await screen.findByRole('heading', { name: 'Câu 1/2' })).toBeInTheDocument()
  })

  it('does not offer to review mistakes when every answer is correct', async () => {
    const perfect = attempt({
      ...EXAM,
      status: 'SUBMITTED',
      remainingSeconds: null,
      questions: [
        question(1, 1, { selectedAnswerId: 11, feedback: { correct: true, correctAnswerId: 11, explanation: null } }),
        question(2, 2, { selectedAnswerId: 21, feedback: { correct: true, correctAnswerId: 21, explanation: null } }),
      ],
      result: { correctCount: 2, unansweredCount: 0, totalQuestions: 2, score: 10, submittedAt: '2026-10-01T03:10:00Z' },
    })
    mockApi({ 'GET /api/v1/attempts/luot-1': perfect })

    renderRoute('/attempts/luot-1')

    expect(await screen.findByRole('region', { name: 'Kết quả' })).toHaveTextContent('10,00 / 10 điểm')
    expect(screen.queryByRole('button', { name: 'Xem câu sai tiếp theo' })).not.toBeInTheDocument()
  })

  it('submits by itself when the countdown reaches zero', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const expired = attempt({
      ...EXAM,
      status: 'EXPIRED',
      remainingSeconds: null,
      result: { correctCount: 0, unansweredCount: 2, totalQuestions: 2, score: 0, submittedAt: '2026-10-01T03:45:00Z' },
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

  it('sends only one submit when the countdown ends while the user is already submitting', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const submitted = attempt({
      ...EXAM,
      status: 'SUBMITTED',
      remainingSeconds: null,
      result: { correctCount: 0, unansweredCount: 2, totalQuestions: 2, score: 0, submittedAt: '2026-10-01T03:45:00Z' },
    })
    let finishSubmit: (value: Attempt) => void = () => undefined
    const fetchMock = mockApi({
      'GET /api/v1/attempts/luot-1': { ...EXAM, remainingSeconds: 2 },
      // Giữ yêu cầu nộp bài ở trạng thái chờ cho tới khi đồng hồ về 0.
      'POST /api/v1/attempts/luot-1/submit': () => new Promise<Attempt>((resolve) => (finishSubmit = resolve)),
    })
    renderRoute('/attempts/luot-1')

    fireEvent.click(await screen.findByRole('button', { name: 'Nộp bài' }))
    fireEvent.click(within(screen.getByRole('region', { name: 'Nộp bài?' })).getByRole('button', { name: 'Nộp bài' }))
    await act(() => vi.advanceTimersByTimeAsync(3000))
    await act(async () => finishSubmit(submitted))

    expect(await screen.findByRole('region', { name: 'Kết quả' })).toBeInTheDocument()
    const submitCalls = fetchMock.mock.calls.filter(([url]) => String(url) === '/api/v1/attempts/luot-1/submit')
    expect(submitCalls).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('explains the problem and shows the real state when the time ran out while saving', async () => {
    const expired = attempt({
      ...EXAM,
      status: 'EXPIRED',
      remainingSeconds: null,
      result: { correctCount: 0, unansweredCount: 2, totalQuestions: 2, score: 0, submittedAt: '2026-10-01T03:45:10Z' },
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

describe('AttemptPage – phím tắt', () => {
  const checked = {
    questionId: 1,
    selectedAnswerId: 11,
    feedback: { correct: true, correctAnswerId: 11, explanation: null },
  }

  function putCalls(fetchMock: ReturnType<typeof mockApi>) {
    return fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')
  }

  it('checks the picked answer with Enter, like clicking "Kiểm tra"', async () => {
    const fetchMock = mockApi({ 'GET /api/v1/attempts/luot-1': attempt({}), 'PUT /api/v1/attempts/luot-1/answers/1': checked })
    renderRoute('/attempts/luot-1')

    const radio = await screen.findByRole('radio', { name: /Phương án 1 của câu 1/ })
    fireEvent.click(radio)
    fireEvent.keyDown(radio, { key: 'Enter' })

    expect(await screen.findByRole('status')).toHaveTextContent('✓ Chính xác!')
    expect(putCalls(fetchMock)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Câu sau →' })).toHaveAttribute('aria-keyshortcuts', 'ArrowRight')
  })

  it('does nothing on Enter before an answer is picked, or when a button has the focus', async () => {
    const fetchMock = mockApi({ 'GET /api/v1/attempts/luot-1': attempt({}), 'PUT /api/v1/attempts/luot-1/answers/1': checked })
    renderRoute('/attempts/luot-1')
    const radio = await screen.findByRole('radio', { name: /Phương án 1 của câu 1/ })

    fireEvent.keyDown(document.body, { key: 'Enter' })
    fireEvent.click(radio)
    // Enter trên nút: trình duyệt tự bấm nút đó, phím tắt không được chạy thêm.
    fireEvent.keyDown(screen.getByRole('button', { name: 'Câu sau →' }), { key: 'Enter' })

    expect(putCalls(fetchMock)).toHaveLength(0)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('moves between questions with the left and right arrows', async () => {
    mockApi({ 'GET /api/v1/attempts/luot-1': EXAM })
    renderRoute('/attempts/luot-1')
    await screen.findByRole('heading', { name: 'Câu 1/2' })

    fireEvent.keyDown(document.body, { key: 'ArrowRight' })
    expect(screen.getByRole('heading', { name: 'Câu 2/2' })).toHaveFocus()

    fireEvent.keyDown(document.body, { key: 'ArrowLeft' })
    expect(screen.getByRole('heading', { name: 'Câu 1/2' })).toBeInTheDocument()
  })

  it('leaves the arrows to the browser with a modifier key or inside the code', async () => {
    mockApi({ 'GET /api/v1/attempts/luot-1': attempt({}) })
    renderRoute('/attempts/luot-1')
    await screen.findByRole('heading', { name: 'Câu 1/2' })

    fireEvent.keyDown(document.body, { key: 'ArrowRight', altKey: true })
    fireEvent.keyDown(screen.getByRole('region', { name: 'Đoạn code' }), { key: 'ArrowRight' })

    expect(screen.getByRole('heading', { name: 'Câu 1/2' })).toBeInTheDocument()
  })

  it('moves to the next question instead of changing the saved answer when an option has the focus', async () => {
    const fetchMock = mockApi({ 'GET /api/v1/attempts/luot-1': EXAM })
    renderRoute('/attempts/luot-1')
    const radio = await screen.findByRole('radio', { name: /Phương án 1 của câu 1/ })

    const event = fireEvent.keyDown(radio, { key: 'ArrowRight' })

    expect(event).toBe(false) // phím đã bị chặn: trình duyệt không đổi lựa chọn
    expect(screen.getByRole('heading', { name: 'Câu 2/2' })).toBeInTheDocument()
    expect(putCalls(fetchMock)).toHaveLength(0)
  })
})

describe('AttemptPage – không tìm thấy', () => {
  it('shows a not-found page for an unknown attempt and drops it from the recent list', async () => {
    rememberAttempt(attempt({ id: 'khong-co' }))
    mockApi({ 'GET /api/v1/attempts/khong-co': problem(404, 'Không tìm thấy lượt làm bài này.') })

    renderRoute('/attempts/khong-co')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy lượt làm bài' })).toBeInTheDocument()
    expect(screen.getByText('Không tìm thấy lượt làm bài này.')).toBeInTheDocument()
    await waitFor(() => expect(getRecentAttempts()).toEqual([]))
  })
})
