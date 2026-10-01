import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Attempt } from '../types/quiz'
import { clearRecentAttempts, forgetAttempt, getRecentAttempts, MAX_RECENT_ATTEMPTS, rememberAttempt } from './recentAttempts'

function attempt(id: string, startedAt: string, extra: Partial<Attempt> = {}): Attempt {
  return {
    id,
    quizId: 1,
    quizTitle: `Đề ${id}`,
    mode: 'EXAM',
    subjectSlug: 'python',
    subjectName: 'Nhập môn lập trình Python',
    status: 'IN_PROGRESS',
    startedAt,
    expiresAt: null,
    remainingSeconds: null,
    questions: [],
    result: null,
    ...extra,
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('recentAttempts', () => {
  it('keeps the newest attempts first, with only what is needed to show them', () => {
    rememberAttempt(attempt('a', '2026-10-01T01:00:00Z'))
    rememberAttempt(attempt('b', '2026-10-01T02:00:00Z'))

    expect(getRecentAttempts()).toEqual([
      { id: 'b', quizTitle: 'Đề b', subjectName: 'Nhập môn lập trình Python', mode: 'EXAM', status: 'IN_PROGRESS', startedAt: '2026-10-01T02:00:00Z', score: null },
      { id: 'a', quizTitle: 'Đề a', subjectName: 'Nhập môn lập trình Python', mode: 'EXAM', status: 'IN_PROGRESS', startedAt: '2026-10-01T01:00:00Z', score: null },
    ])
  })

  it('updates an attempt in place, for example when it gets a score', () => {
    rememberAttempt(attempt('a', '2026-10-01T01:00:00Z'))
    rememberAttempt(
      attempt('a', '2026-10-01T01:00:00Z', {
        status: 'SUBMITTED',
        result: { correctCount: 3, unansweredCount: 0, totalQuestions: 4, score: 7.5, submittedAt: '2026-10-01T01:30:00Z' },
      }),
    )

    expect(getRecentAttempts()).toHaveLength(1)
    expect(getRecentAttempts()[0]).toMatchObject({ status: 'SUBMITTED', score: 7.5 })
  })

  it(`keeps at most ${MAX_RECENT_ATTEMPTS} attempts, dropping the oldest`, () => {
    for (let hour = 0; hour < MAX_RECENT_ATTEMPTS + 2; hour++) {
      rememberAttempt(attempt(`a${hour}`, `2026-10-01T${String(hour).padStart(2, '0')}:00:00Z`))
    }

    const ids = getRecentAttempts().map((recent) => recent.id)
    expect(ids).toHaveLength(MAX_RECENT_ATTEMPTS)
    expect(ids[0]).toBe('a11')
    expect(ids).not.toContain('a0')
  })

  it('clears the list', () => {
    rememberAttempt(attempt('a', '2026-10-01T01:00:00Z'))

    clearRecentAttempts()

    expect(getRecentAttempts()).toEqual([])
  })

  it('ignores broken or edited data instead of crashing', () => {
    window.localStorage.setItem('quiz-study.recent-attempts', '{không phải JSON')
    expect(getRecentAttempts()).toEqual([])

    window.localStorage.setItem('quiz-study.recent-attempts', JSON.stringify([{ id: 'x', mode: 'KHAC' }, 42]))
    expect(getRecentAttempts()).toEqual([])

    // Ngày hỏng làm lỗi khi hiển thị, nên mục đó bị bỏ.
    const badDate = { id: 'y', quizTitle: 'Đề', subjectName: 'Môn', mode: 'EXAM', status: 'IN_PROGRESS', startedAt: 'abc', score: null }
    window.localStorage.setItem('quiz-study.recent-attempts', JSON.stringify([badDate]))
    expect(getRecentAttempts()).toEqual([])
  })

  it('forgets a single attempt', () => {
    rememberAttempt(attempt('a', '2026-10-01T01:00:00Z'))
    rememberAttempt(attempt('b', '2026-10-01T02:00:00Z'))

    forgetAttempt('a')

    expect(getRecentAttempts().map((recent) => recent.id)).toEqual(['b'])
  })

  it('works without storage when the browser blocks it', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Bị chặn', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Bị chặn', 'SecurityError')
    })

    expect(() => rememberAttempt(attempt('a', '2026-10-01T01:00:00Z'))).not.toThrow()
    expect(getRecentAttempts()).toEqual([])
  })
})
