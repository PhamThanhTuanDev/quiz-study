import type { InvalidField, ProblemDetail } from '../types/api'

const API_BASE_URL = '/api/v1'

export const NETWORK_ERROR_MESSAGE = 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.'
export const SERVER_ERROR_MESSAGE = 'Máy chủ đang gặp sự cố. Hãy thử lại sau.'

/**
 * Lỗi khi gọi backend. `message` hiển thị được cho người dùng (tiếng Việt).
 * `status` = 0 nghĩa là không kết nối được máy chủ.
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: InvalidField[]

  constructor(status: number, message: string, errors: InvalidField[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>('GET', path, undefined, signal)
}

/** Gửi POST; `body` (nếu có) được chuyển thành JSON. */
export function apiPost<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('POST', path, body, signal)
}

/** Gửi PUT; `body` được chuyển thành JSON. */
export function apiPut<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>('PUT', path, body, signal)
}

async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const hasBody = body !== undefined
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: hasBody ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    // Nơi gọi tự huỷ request (ví dụ rời trang): giữ nguyên lỗi để nơi gọi nhận ra và bỏ qua.
    if (signal?.aborted) throw error
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }
  if (!response.ok) {
    throw await toApiError(response)
  }
  try {
    return (await response.json()) as T
  } catch (error) {
    if (signal?.aborted) throw error
    // Body không phải JSON (ví dụ proxy trả trang HTML): không để lỗi phân tích JSON bằng tiếng Anh tới người dùng.
    throw new ApiError(response.status, SERVER_ERROR_MESSAGE)
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const problem = await readProblemDetail(response)
  const message = problem?.detail ?? fallbackMessage(response.status)
  return new ApiError(response.status, message, problem?.errors ?? [])
}

/** Đọc body lỗi; trả null nếu không phải Problem Details (ví dụ proxy trả HTML hoặc body rỗng). */
async function readProblemDetail(response: Response): Promise<ProblemDetail | null> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return null
  }
  if (typeof body !== 'object' || body === null) return null

  const { detail, errors } = body as Record<string, unknown>
  return {
    detail: typeof detail === 'string' ? detail : undefined,
    errors: Array.isArray(errors) ? errors.filter(isInvalidField) : undefined,
  }
}

function isInvalidField(value: unknown): value is InvalidField {
  if (typeof value !== 'object' || value === null) return false
  const { field, message } = value as Record<string, unknown>
  return typeof message === 'string' && (typeof field === 'string' || field === null)
}

function fallbackMessage(status: number): string {
  return status >= 500 ? SERVER_ERROR_MESSAGE : `Yêu cầu không thành công (mã ${status}).`
}
