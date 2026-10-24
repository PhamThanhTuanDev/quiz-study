import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mockApi, problem } from '../test/mockApi'
import { renderRoute } from '../test/renderRoute'
import type { StudyChapter } from '../types/study'

const LOOPS: StudyChapter = {
  subjectSlug: 'python',
  subjectName: 'Nhập môn lập trình Python',
  chapterId: 4,
  chapterCode: 'Bài 4',
  chapterTitle: 'Cấu trúc lặp',
  questions: [
    {
      questionId: 11,
      order: 1,
      content: 'Đoạn code sau in ra gì?',
      codeSnippet: 'for i in range(3):\n    print(i)',
      answers: [
        { id: 1, content: '1 2 3', correct: false, blanks: null },
        { id: 2, content: '0 1 2', correct: false, blanks: null },
        { id: 3, content: '0 1 2 3', correct: false, blanks: null },
        { id: 4, content: '0\n1\n2', correct: true, blanks: null },
      ],
      explanation: null,
      authored: false,
    },
    {
      questionId: 12,
      order: 2,
      content: 'Lệnh nào thoát khỏi vòng lặp?',
      codeSnippet: null,
      answers: [
        { id: 5, content: 'break', correct: true, blanks: null },
        { id: 6, content: 'continue', correct: false, blanks: null },
      ],
      explanation: 'Đã sửa so với tài liệu: thêm phương án sai thứ hai.',
      authored: true,
    },
  ],
}

const STUDY_API = 'GET /api/v1/subjects/python/chapters/4/study'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StudyPage', () => {
  it('shows every question of the chapter with the correct answer marked, and nothing to choose', async () => {
    mockApi({ [STUDY_API]: LOOPS })

    renderRoute('/subjects/python/chapters/4/study')

    expect(await screen.findByRole('heading', { level: 1, name: 'Cấu trúc lặp' })).toBeInTheDocument()
    expect(screen.getByText('2 câu · đáp án đúng được tô xanh')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Kiểm tra' })).not.toBeInTheDocument()

    const first = screen.getByRole('article', { name: 'Câu 1/2' })
    expect(within(first).getByRole('region', { name: 'Đoạn code' })).toHaveTextContent('for i in range(3):')
    const options = within(first).getAllByRole('listitem')
    expect(options).toHaveLength(4)
    expect(options[3]).toHaveTextContent('D.')
    // Đáp án đúng chỉ tô xanh trên màn hình; chữ ẩn cho trình đọc màn hình.
    expect(options[3]).toHaveClass('border-success')
    expect(within(options[3]).getByText('(đáp án đúng)')).toHaveClass('sr-only')
    expect(options[0]).not.toHaveClass('border-success')
    expect(options[0]).not.toHaveTextContent('đáp án đúng')
    expect(screen.queryByText('✓ Đáp án đúng')).not.toBeInTheDocument()
  })

  it('shows the explanation, e.g. what was fixed compared with the source document', async () => {
    mockApi({ [STUDY_API]: LOOPS })

    renderRoute('/subjects/python/chapters/4/study')

    const second = await screen.findByRole('article', { name: 'Câu 2/2' })
    expect(second).toHaveTextContent('Đã sửa so với tài liệu: thêm phương án sai thứ hai.')
    expect(screen.getByRole('link', { name: '← Nhập môn lập trình Python' })).toHaveAttribute('href', '/subjects/python')
  })

  it('labels the questions written in addition to the source documents, and explains the label (D-053)', async () => {
    mockApi({ [STUDY_API]: LOOPS })

    renderRoute('/subjects/python/chapters/4/study')

    const second = await screen.findByRole('article', { name: 'Câu 2/2' })
    expect(within(second).getByText('Câu tự soạn')).toBeInTheDocument()
    expect(within(screen.getByRole('article', { name: 'Câu 1/2' })).queryByText('Câu tự soạn')).not.toBeInTheDocument()
    expect(screen.getByText('1 câu soạn thêm để ôn tập, không có trong tài liệu gốc.')).toBeInTheDocument()
  })

  it('does not explain the label when no question of the chapter is authored', async () => {
    const fromDocuments = { ...LOOPS, questions: LOOPS.questions.map((question) => ({ ...question, authored: false })) }
    mockApi({ [STUDY_API]: fromDocuments })

    renderRoute('/subjects/python/chapters/4/study')

    expect(await screen.findByRole('heading', { level: 1, name: 'Cấu trúc lặp' })).toBeInTheDocument()
    expect(screen.queryByText('Câu tự soạn')).not.toBeInTheDocument()
    expect(screen.queryByText(/không có trong tài liệu gốc/)).not.toBeInTheDocument()
  })

  it('lists the question numbers and jumps to the chosen question (D-051)', async () => {
    mockApi({ [STUDY_API]: LOOPS })
    // jsdom không có scrollIntoView: gắn tạm bản giả, gỡ ra khi xong test.
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true })
    onTestFinished(() => {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    })

    renderRoute('/subjects/python/chapters/4/study')

    const nav = await screen.findByRole('navigation', { name: 'Danh sách câu hỏi' })
    const first = within(nav).getByRole('button', { name: 'Câu 1' })
    const second = within(nav).getByRole('button', { name: 'Câu 2' })
    expect(first).toHaveAttribute('aria-current', 'step')

    fireEvent.click(second)

    const target = screen.getByRole('article', { name: 'Câu 2/2' })
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(target)
    expect(target).toHaveFocus()
    expect(second).toHaveAttribute('aria-current', 'step')
    expect(first).not.toHaveAttribute('aria-current')
  })

  it('on phones, opens the question list from a floating button and closes it after jumping (D-052)', async () => {
    mockApi({ [STUDY_API]: LOOPS })
    const scrollIntoView = vi.fn()
    Object.defineProperty(Element.prototype, 'scrollIntoView', { value: scrollIntoView, configurable: true })
    onTestFinished(() => {
      Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    })

    renderRoute('/subjects/python/chapters/4/study')

    const toggle = await screen.findByRole('button', { name: 'Danh sách câu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Đóng: khung danh sách `inert` (không bấm được, trình đọc màn hình bỏ qua); jsdom chưa tự ẩn theo inert.
    const panel = document.getElementById(toggle.getAttribute('aria-controls') ?? '')
    expect(panel).toHaveAttribute('inert')

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(panel).not.toHaveAttribute('inert')
    const list = screen.getByRole('navigation', { name: 'Chọn câu hỏi' })
    const first = within(list).getByRole('button', { name: 'Câu 1' })
    expect(first).toHaveAttribute('aria-current', 'step')
    expect(first).toHaveFocus()

    fireEvent.click(within(list).getByRole('button', { name: 'Câu 2' }))

    const target = screen.getByRole('article', { name: 'Câu 2/2' })
    expect(scrollIntoView.mock.contexts[0]).toBe(target)
    expect(target).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Danh sách câu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes the question list with Escape and gives focus back to the button', async () => {
    mockApi({ [STUDY_API]: LOOPS })

    renderRoute('/subjects/python/chapters/4/study')

    const toggle = await screen.findByRole('button', { name: 'Danh sách câu' })
    fireEvent.click(toggle)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Đóng danh sách câu' }), { key: 'Escape' })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveFocus()
  })

  it('shows "not found" without a retry button for an unknown chapter', async () => {
    mockApi({ 'GET /api/v1/subjects/python/chapters/99/study': problem(404, 'Không tìm thấy bài học này.') })

    renderRoute('/subjects/python/chapters/99/study')

    expect(await screen.findByRole('heading', { name: 'Không tìm thấy bài học' })).toBeInTheDocument()
    expect(screen.getByText('Không tìm thấy bài học này.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thử lại' })).not.toBeInTheDocument()
  })

  it('offers a retry when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    renderRoute('/subjects/python/chapters/4/study')

    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được bài học')
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
  })
})
