const API_BASE_URL = '/api/v1'

/** Lỗi trả về từ backend, kèm mã HTTP và thông điệp lấy từ Problem Details (RFC 9457). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface ProblemDetail {
  title?: string
  detail?: string
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new ApiError(response.status, await readErrorMessage(response))
  }
  return (await response.json()) as T
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status}`
  try {
    const problem = (await response.json()) as ProblemDetail
    return problem.detail ?? problem.title ?? fallback
  } catch {
    // Body rỗng hoặc không phải JSON (ví dụ proxy trả lỗi khi backend chưa chạy).
    return fallback
  }
}
