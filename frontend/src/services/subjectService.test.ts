import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSubject, getSubjects } from './subjectService'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('subjectService', () => {
  it('loads the subject list from /api/v1/subjects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json([]))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getSubjects()).resolves.toEqual([])
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/subjects', expect.anything())
  })

  it('encodes the slug so an odd address cannot change the API path', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({}))
    vi.stubGlobal('fetch', fetchMock)

    await getSubject('a/b?c')

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/subjects/a%2Fb%3Fc', expect.anything())
  })
})
