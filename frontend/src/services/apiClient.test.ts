import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, NETWORK_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from './apiClient'

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
    const problem = { title: 'Not Found', status: 404, detail: "Không tìm thấy môn học 'java'" }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(problem, { status: 404 })))

    const error = await apiGet('/subjects/java').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 404, message: "Không tìm thấy môn học 'java'", errors: [] })
  })

  it('keeps the list of invalid fields from a 400 response', async () => {
    const problem = {
      status: 400,
      detail: 'Dữ liệu gửi lên không hợp lệ.',
      errors: [{ field: 'page', message: 'Trang phải từ 1 trở lên' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(problem, { status: 400 })))

    await expect(apiGet('/subjects?page=0')).rejects.toMatchObject({
      status: 400,
      errors: [{ field: 'page', message: 'Trang phải từ 1 trở lên' }],
    })
  })

  it('ignores malformed items in the list of invalid fields', async () => {
    const problem = {
      status: 400,
      detail: 'Dữ liệu gửi lên không hợp lệ.',
      errors: [{ field: 'name', message: 'Tên không được để trống' }, { field: 1 }, 'lỗi', { field: null, message: 'Lỗi chung' }],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(problem, { status: 400 })))

    await expect(apiGet('/items')).rejects.toMatchObject({
      errors: [
        { field: 'name', message: 'Tên không được để trống' },
        { field: null, message: 'Lỗi chung' },
      ],
    })
  })

  it('reports a server problem when a successful response is not JSON', async () => {
    const html = new Response('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(html))

    const error = await apiGet('/health').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 200, message: SERVER_ERROR_MESSAGE })
  })

  it('uses a server error message when a 5xx body is not Problem Details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))

    await expect(apiGet('/health')).rejects.toMatchObject({ status: 502, message: SERVER_ERROR_MESSAGE })
  })

  it('mentions the status code for other errors without Problem Details', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', { status: 403 })))

    await expect(apiGet('/health')).rejects.toMatchObject({
      status: 403,
      message: 'Yêu cầu không thành công (mã 403).',
    })
  })

  it('turns a network failure into ApiError with status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const error = await apiGet('/health').catch((e: unknown) => e)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, message: NETWORK_ERROR_MESSAGE })
  })

  it('rethrows the original error when the caller aborted the request', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortError = new DOMException('The operation was aborted.', 'AbortError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError))

    await expect(apiGet('/health', controller.signal)).rejects.toBe(abortError)
  })
})
