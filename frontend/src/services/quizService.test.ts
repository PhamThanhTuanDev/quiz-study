import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAttempt, getQuizzes, saveAnswer, startAttempt, submitAttempt } from './quizService'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch() {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({})))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('quizService', () => {
  it('loads the quizzes of a subject, encoding the slug', async () => {
    const fetchMock = stubFetch()

    await getQuizzes('a/b')

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/subjects/a%2Fb/quizzes', expect.objectContaining({ method: 'GET' }))
  })

  it('starts an attempt with a POST to the quiz', async () => {
    const fetchMock = stubFetch()

    await startAttempt(12)

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/quizzes/12/attempts', expect.objectContaining({ method: 'POST' }))
  })

  it('reads, answers and submits an attempt by its id', async () => {
    const fetchMock = stubFetch()

    await getAttempt('a b')
    await saveAnswer('id-1', 7, 30)
    await submitAttempt('id-1')

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/attempts/a%20b', expect.objectContaining({ method: 'GET' }))
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/attempts/id-1/answers/7',
      expect.objectContaining({ method: 'PUT', body: '{"answerId":30}' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/attempts/id-1/submit', expect.objectContaining({ method: 'POST' }))
  })
})
