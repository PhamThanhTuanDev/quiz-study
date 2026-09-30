import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet } from './apiClient'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiGet', () => {
  it('prefixes the path with /api/v1 and returns the parsed JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ value: 42 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await apiGet<{ value: number }>('/answer')

    expect(result).toEqual({ value: 42 })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/answer', expect.anything())
  })

  it('throws ApiError with the Problem Details message when the response is not ok', async () => {
    const problem = { title: 'Not Found', status: 404, detail: "Subject 'java' not found" }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(problem, { status: 404 })))

    const error = await apiGet('/subjects/java').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: "Subject 'java' not found" })
  })

  it('falls back to the HTTP status when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))

    await expect(apiGet('/health')).rejects.toMatchObject({ status: 502, message: 'HTTP 502' })
  })
})
