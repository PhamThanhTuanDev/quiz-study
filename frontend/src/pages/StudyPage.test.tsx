import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
        { id: 1, content: '1 2 3', correct: false },
        { id: 2, content: '0 1 2', correct: false },
        { id: 3, content: '0 1 2 3', correct: false },
        { id: 4, content: '0\n1\n2', correct: true },
      ],
      explanation: null,
    },
    {
      questionId: 12,
      order: 2,
      content: 'Lệnh nào thoát khỏi vòng lặp?',
      codeSnippet: null,
      answers: [
        { id: 5, content: 'break', correct: true },
        { id: 6, content: 'continue', correct: false },
      ],
      explanation: 'Đã sửa so với tài liệu: thêm phương án sai thứ hai.',
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
    expect(options[3]).toHaveTextContent('✓ Đáp án đúng')
    expect(options[3]).toHaveClass('border-success')
    expect(options[0]).not.toHaveTextContent('Đáp án đúng')
    expect(options[0]).not.toHaveClass('border-success')
  })

  it('shows the explanation, e.g. what was fixed compared with the source document', async () => {
    mockApi({ [STUDY_API]: LOOPS })

    renderRoute('/subjects/python/chapters/4/study')

    const second = await screen.findByRole('article', { name: 'Câu 2/2' })
    expect(second).toHaveTextContent('Đã sửa so với tài liệu: thêm phương án sai thứ hai.')
    expect(screen.getByRole('link', { name: '← Nhập môn lập trình Python' })).toHaveAttribute('href', '/subjects/python')
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
